(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('MIDI 0.6.2  - http://github.com/soundio/midi');
})(this);

(function(window) {
	"use strict";

	var debug = true;

	var Fn        = window.Fn;
	var Stream    = window.Stream;

	var assign    = Object.assign;
	var curry     = Fn.curry;
	var each      = Fn.each;
	var get       = Fn.get;
	var isDefined = Fn.isDefined;
	var noop      = Fn.noop;
	var remove    = Fn.remove;
	var rest      = Fn.rest;
	var set       = Fn.set;
	var toClass   = Fn.toClass;

	var nothing = Fn.nothing;

	var slice  = Function.prototype.call.bind(Array.prototype.slice);

	var rtype = /^\[object\s([A-Za-z]+)/;

	var store = [];

	var outputs = [];

	var status = {
		noteoff:      128,
		noteon:       144,
		polytouch:    160,
		control:      176,
		pc:           192,
		channeltouch: 208,
		pitch:        224,
	};

	var call = curry(function call(value, fn) { fn(value); });

	function clear(obj) {
		var key;
		for (key in obj) { delete obj[key]; }
	}

	function getRoute(object, property) {
		if (arguments.length < 2) { return object; }
		if (!object[property]) { return; }

		var args = slice(arguments, 1);

		args[0] = object[property] ;
		return getRoute.apply(this, args);
	}

	function setRoute(object, property, value) {
		if (arguments.length < 4) {
			object[property] = value;
			return value;
		}

		var args = slice(arguments, 1);

		args[0] = object[property] === undefined ? (object[property] = {}) : object[property] ;
		return setRoute.apply(this, args);
	}

	function MIDI(query) {
		// Support constructor without `new` keyword
		if (!MIDI.prototype.isPrototypeOf(this)) {
			return new MIDI(query);
		}

		Stream.call(this, function setup(notify, stop) {
			var buffer = [];

			function push() {
				buffer.push.apply(buffer, arguments);
				notify('push');
			}

			on(query, push);

			return {
				push: push,

				shift: function midi() {
					return buffer.shift();
				},

				stop: function() {
					off(query, push);
					stop(buffer.length);
				}
			};
		});
	}

	MIDI.prototype = Object.create(Stream.prototype);



	// Routing tree for routing messages

	var tree = { all: [] };

	function triggerTree(tree, e, i) {
		if (tree.all) {
			each(call(e), tree.all);
		}

		var prop   = e.data[i];
		var object = tree[prop];

		if (!object) { return; }

		// The tree is 3 deep
		return i < 2 ?
			triggerTree(object, e, i + 1) :
			each(call(e), object) ;
	}

	function trigger(e) {
		triggerTree(tree, e, 0);
	}

	function onTree(tree, query, fn) {
		var list = query.length === 0 ?
			getRoute(tree, 'all') || setRoute(tree, 'all', []) :
		query.length === 1 ?
			getRoute(tree, query[0], 'all') || setRoute(tree, query[0], 'all', []) :
		query.length === 2 ?
			getRoute(tree, query[0], query[1], 'all') || setRoute(tree, query[0], query[1], 'all', []) :
			getRoute(tree, query[0], query[1], query[2]) || setRoute(tree, query[0], query[1], query[2], []) ;

		list.push(fn);
	}

	function on(query, fn) {
		if (!query) {
			onTree(tree, nothing, fn);
		}
		else if (typeof query[1] === 'string') {
			if (query[1] === 'note') {
				onTree(tree, [typeToNumber(query[0], 'noteon')].concat(rest(2, query)), fn);
				onTree(tree, [typeToNumber(query[0], 'noteoff')].concat(rest(2, query)), fn);
			}
			else {
				onTree(tree, [typeToNumber(query[0], query[1])].concat(rest(2, query)), fn);
			}
		}
		else {
			onTree(tree, query, fn);
		}
	}

	function offTree(object, fn) {
		var key;

		// Remove the matching function from each array in object
		for (key in object) {
			if (object[key].length) {
				remove(object[key], fn);
			}
			else {
				offTree(object[key], fn);
			}
		}
	}

	function off(query, fn) {
		var args = [tree];

		args.push.apply(args, query);

		if (!fn) {
			// Remove the object by setting it to undefined (undefined is
			// implied here, we're not passing it to set() explicitly as the
			// last value in args).
			set.apply(this, args);
			return;
		}

		var object = get.apply(this, args);
		var key;

		if (!object) { return; }

		offTree(object, fn);
	}

	function send(port, data) {
		if (port) {
			port.send(data, 0);
		}
	}

	assign(MIDI, {
		Input: function(selector) {
			return Stream(function setup(notify, stop) {
				var buffer = [];
			
				function push() {
					buffer.push.apply(buffer, arguments);
					notify('push');
				}
			
				on(selector, push);
			
				return {
					push: push,
			
					shift: function midi() {
						return buffer.shift();
					},
			
					stop: function() {
						off(selector, fn);
						stop(buffer.length);
					}
				};
			});
		},

		trigger: function(message) {
			triggerTree(tree, {
				data: message,
				receivedTime: +new Date()
			}, 0);
		},

		on:  on,
		off: off,

		// Set up MIDI.request as a promise

		request: navigator.requestMIDIAccess ?
			navigator.requestMIDIAccess() :
			Promise.reject("This browser does not support Web MIDI.") ,


		// Set up MIDI to listen to browser MIDI inputs
		// These methods are overidden when output ports become available.

		send: noop,
		output: noop
	});

	function listen(input) {
		// It's suggested here that we need to keep a reference to midi inputs
		// hanging around to avoid garbage collection:
		// https://code.google.com/p/chromium/issues/detail?id=163795#c123
		store.push(input);

		// For some reason .addEventListener does not work with the midimessage
		// event.
		//
		//input.addEventListener('midimessage', function(e) {
		//	trigger(MIDI, e);
		//});

		input.onmidimessage = trigger;
	}

	function updateInputs(midi) {
		// As of ~August 2014, inputs and outputs are iterables.

		// This is supposed to work, but it doesn't
		//midi.inputs.values(function(input) {
		//	console.log('MIDI: Input detected:', input.name, input.id);
		//	listen(input);
		//});

		var arr;

		for (arr of midi.inputs) {
			var id = arr[0];
			var input = arr[1];
			console.log('MIDI: Input detected:', input.name, input.id);
			listen(input);
		}
	}

	function createSendFn(outputs, tree) {
		return function send(portName, data, time) {
			var port = this.output(portName);

			if (port) {
				port.send(data, time || 0);
			}
			else {
				console.warn('MIDI: .send() output port not found:', port);
			}

			return this;
		};
	}

	function createPortFn(ports) {
		return function getPort(id) {
			var port;

			if (typeof id === 'string') {
				for (port of ports) {
					if (port[1].name === id) { return port[1]; }
				}
			}
			else {
				for (port of ports) {
					if (port[0] === id) { return port[1]; }
				}
			}
		};
	}

	function updateOutputs(midi) {
		var arr;

		if (!MIDI.outputs) { MIDI.outputs = []; }

		MIDI.outputs.length = 0;

		for (arr of midi.outputs) {
			var id = arr[0];
			var output = arr[1];
			console.log('MIDI: Output detected:', output.name, output.id);
			// Store outputs
			MIDI.outputs.push(output);
		}

		MIDI.output = createPortFn(midi.outputs);
		MIDI.send = createSendFn(midi.outputs, outputs);
	}

	function setupPorts(midi) {
		function connect(e) {
			updateInputs(midi);
			updateOutputs(midi);
		}

		// Not sure addEventListener works...
		//midi.addEventListener(midi, 'statechange', connect);
		midi.onstatechange = connect;
		connect();
	}



	function typeToNumber(channel, type) {
		return status[type] + (channel ? channel - 1 : 0 );
	}



	MIDI.request
	.then(function(midi) {
		if (debug) { console.groupCollapsed('MIDI'); }
		if (debug) { window.midi = midi; }
		setupPorts(midi);
		if (debug) { console.groupEnd(); }
	})
	.catch(function(error) {
		console.warn('MIDI: Not supported in this browser. Error: ' + error.message);
	});

	window.MIDI = MIDI;
})(window);
