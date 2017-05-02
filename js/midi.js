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
	var cache     = Fn.cache;
	var curry     = Fn.curry;
	var deprecate = Fn.deprecate;
	var each      = Fn.each;
	var get       = Fn.get;
	var isDefined = Fn.isDefined;
	var noop      = Fn.noop;
	var now       = Fn.now;
	var remove    = Fn.remove;
	var rest      = Fn.rest;
	var set       = Fn.set;
	var toClass   = Fn.toClass;

	var call      = curry(function call(value, fn) { fn(value); });
	var slice     = Function.prototype.call.bind(Array.prototype.slice);

	var nothing = Fn.nothing;

	var rtype = /^\[object\s([A-Za-z]+)/;

	var store = [];

	var outputs = [];


	// Library functions

	// MIDI message status bytes
	//
	// noteoff         128 - 143
	// noteon          144 - 159
	// polytouch       160 - 175
	// control         176 - 191
	// pc              192 - 207
	// channeltouch    208 - 223
	// pitch           224 - 240

	var status = {
		noteoff:      128,
		noteon:       144,
		polytouch:    160,
		control:      176,
		pc:           192,
		channeltouch: 208,
		pitch:        224,
	};

	var types = Object.keys(status);

	function toChannel(message) {
		return message[0] % 16 + 1;
	}

	function toType(message) {
		var name = types[Math.floor(message[0] / 16) - 8];

		// Catch type noteon with zero velocity and rename it as noteoff
		return name === types[1] && message[2] === 0 ?
			types[0] :
			name ;
	}

	function toStatus(channel, type) {
		return status[type] + (channel ? channel - 1 : 0 );
	}


	// Routing tree and message filtering

	var tree = { all: [] };

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

	function offTree(tree, query, fn) {
		var list = query.length === 0 ?
			getRoute(tree, 'all') :
		query.length === 1 ?
			getRoute(tree, query[0], 'all') :
		query.length === 2 ?
			getRoute(tree, query[0], query[1], 'all') :
			getRoute(tree, query[0], query[1], query[2]) ;

		if (list) {
			if (fn) { remove(list, fn); }
			else { list.length = 0; }
		}
	}

	function on(query, fn) {
		var data;

		if (!query) {
			onTree(tree, nothing, fn);
		}
		else if (typeof query[1] === 'string') {
			data = rest(2, query);

			// Convert note names to numbers
			if (typeof data[0] === 'string') {
				data[0] = nameToNumber(data[0]);
			}

			if (query[1] === 'note') {
				onTree(tree, [toStatus(query[0], 'noteon')].concat(rest(2, query)), fn);
				onTree(tree, [toStatus(query[0], 'noteoff')].concat(rest(2, query)), fn);
			}
			else {
				onTree(tree, [toStatus(query[0], query[1])].concat(rest(2, query)), fn);
			}
		}
		else {
			onTree(tree, query, fn);
		}
	}

	function off(query, fn) {
		var data;

		if (!query) {
			offTree(tree, nothing, fn);
		}
		else if (typeof query[1] === 'string') {
			data = rest(2, query);

			// Convert note names to numbers
			if (typeof data[0] === 'string') {
				data[0] = nameToNumber(data[0]);
			}

			if (query[1] === 'note') {
				offTree(tree, [toStatus(query[0], 'noteon')].concat(data), fn);
				offTree(tree, [toStatus(query[0], 'noteoff')].concat(data), fn);
			}
			else {
				offTree(tree, [toStatus(query[0], query[1])].concat(data), fn);
			}
		}
		else {
			offTree(tree, query, fn);
		}
	}

	function send(port, data) {
		if (port) {
			port.send(data, 0);
		}
	}


	// MIDI constructor

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

	assign(MIDI, {
		on:  on,
		off: off,

		trigger: function(message, time) {
			triggerTree(tree, {
				data: message,
				receivedTime: time || now()
			}, 0);
		},

		request: cache(function() {
			return navigator.requestMIDIAccess ?
				navigator.requestMIDIAccess() :
				Promise.reject("This browser does not support Web MIDI.") ;
		}),

		output:    noop,
		send:      noop,
		toChannel: toChannel,
		toType:    toType,
		toStatus:  curry(toStatus),
		types:     types
	});


	// Handle connections

	function listen(port) {
		// It's suggested here that we need to keep a reference to midi inputs
		// hanging around to avoid garbage collection:
		// https://code.google.com/p/chromium/issues/detail?id=163795#c123
		store.push(port);
		port.onmidimessage = trigger;
	}

	function unlisten(port) {
		remove(store, port);
		port.onmidimessage = null;
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

	function statechange(e) {
		var port = e.port;
		
		if (port.state === 'connected') {
			listen(port);
		}
		else if (port.state === 'disconnected') {
			unlisten(port);
		}
	}

	function setupPorts(midi) {
		var entry, port;

		for (entry of midi.inputs) {
			port = entry[1];
			console.log('MIDI: Input detected:', port.name, port.id, port.state);
			listen(port);
		}

		for (entry of midi.outputs) {
			port = entry[1];
			console.log('MIDI: Output detected:', port.name, port.id, port.state);
		}

		midi.onstatechange = statechange;
	}


	// Setup

	MIDI
	.request()
	.then(function(midi) {
		if (debug) { console.group('MIDI'); }
		if (debug) { window.midi = midi; }
		setupPorts(midi);
		if (debug) { console.groupEnd(); }
	})
	.catch(function(error) {
		console.warn('MIDI: Not supported in this browser. Error: ' + error.message);
	});


	// Export

	window.MIDI = MIDI;


	// Deprecate

	MIDI.toMessage         = deprecate(toType, 'MIDI: deprecation warning - MIDI.toMessage() has been renamed to MIDI.toType()');
	MIDI.typeToNumber = deprecate(toStatus, 'MIDI: typeToNumber(ch, type) is now toStatus(ch, type)');

})(window);
