(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('MIDI 0.6.2');
	console.log('http://github.com/soundio/midi');
	console.log('MIDI events hub and helper library');
	console.log('——————————————————————————————————');
})(this);

(function(window) {
	"use strict";

	var debug = true;

	var assign = Object.assign;
	var Fn = window.Fn;
	var Stream = Fn.Stream;
	var MIDI = window.MIDI = {};

	var rtype = /^\[object\s([A-Za-z]+)/;

	var empty = [];

	var map = { all: [] };

	var store = [];

	var outputs = [];


	// Utility functions

	var noop  = Fn.noop;
	var slice = Fn.slice;

	function typeOf(object) {
		var type = typeof object;

		return type === 'object' ?
			rtype.exec(Object.prototype.toString.apply(object))[1].toLowerCase() :
			type ;
	}


	// Deep get and set for getting and setting nested objects

	function send(port, data) {
		if (port) {
			port.send(data, 0);
		}
	}

	MIDI.request = navigator.requestMIDIAccess ?
		navigator.requestMIDIAccess() :
		new Promise(function(accept, reject){
			reject({
				message: 'This browser does not support Web MIDI.'
			});
		}) ;

	function MIDIStream() {
		Stream.apply(this, arguments);
	}

	MIDIStream.prototype = assign(Object.create(Stream.prototype), {
		normalise: function() {
			var source = this;
			return new MusicStream(function(push) {
				source.subscribe(function(data, time) {
					push(MIDI.normalise(data, time));
				});
			});
		}
	});

	function MusicStream() {
		Stream.apply(this, arguments);
	}

	MusicStream.prototype = assign(Object.create(Stream.prototype), {
		midi: function() {
			var source = this;
			return new MIDIStream(function(push) {
				source.subscribe(function(event) {
					// Todo: push a MIDI version of this event
					//push();
				});
			});
		}
	});

	MIDI.trigger = noop;

	var inputStream = new Stream(function(push) {
		// Enable triggering of input stream for testing.
		MIDI.trigger = function(data) {
			push(data, +new Date(), undefined);
		};

		// Setup ports to push to input stream.
		MIDI.request
		.then(function(midi) {
			if (debug) { console.log('MIDI: pushing MIDI input to input stream.'); }
			if (debug) { window.midi = midi; }
			setupPorts(midi, function(e) {
				push(e.data, e.receivedTime, e.target);
			});
		});
	});

	var cache = {};

	function testValue(test, value) {
		return test === undefined ? true :
			// test is a regexp
			test.test ? test.test(value) :
			// test is a function
			test.apply ? test(value) :
			// test is a value
			test === value ;
	}

	function byQuery(query) {
		return query[0] === undefined ?
			function byObjectQuery(data) {
				return testValue(query.channel, MIDI.toChannel(data)) &&
					testValue(query.message, MIDI.toType(data)) &&
					testValue(query[1], data[1]) &&
					testValue(query[2], data[2]) ;
			} :
			function byArrayQuery(data) {
				console.log(query, data);
				return data[0] === query[0] ?
					query[1] === undefined ?
						true :
						data[1] === query[1] ?
							query[2] === undefined ?
								true :
								data[2] === query[2] :
							false :
					false ;
			};
	}

	function getCachePath(query) {
		var channel = query[0] === undefined ? query.channel : MIDI.toChannel(query) ;
		var message = query[0] === undefined ? query.message : MIDI.toType(query) ;
		return channel + '.' + message + '.' + query[1] + '.' + query[2] ;
	}

	MIDI.on = function(query, fn) {
		var path, source;

		// If one fn was passed in call fn from input stream.
		if (typeof query === 'function') {
			inputStream.subscribe(query);
			return this;
		}

		// If query was passed in build and cache filtered stream from query.
		if (query) {
			path = getCachePath(query);
			source = Fn.get(path, cache);

			if (!source) {
				source = inputStream.filter(byQuery(query));
				Fn.set(path, source, cache);
			}
		}
		else {
			source = inputStream;
		}

		// If a fn was passed as last param call fn from source stream.
		if (fn) {
			// Call function from source stream
			source.subscribe(fn);
			return this;
		}

		// Create and return a new MIDI stream
		return new MIDIStream(function(push) {
			return source.subscribe(push);
		});
	};

	MIDI.once = function(query, fn) {
		var type = typeOf(query);

		if (type === 'function') {
			fn = query;
			query = empty;
		}

		return this
		.on(query, fn)
		.on(query, function handleOnce() {
			this.off(query, fn);
			this.off(handleOnce);
		});
	};

	MIDI.off = function(query, fn) {
		var type = typeOf(query);
		var map = getListeners(this);
		var queries;

		if (type === 'object') {
			queries = createQueries(query);

			while (query = queries.pop()) {
				off(map, query, fn);
			}

			return this;
		}

		if (!fn && type === 'function') {
			fn = query;
			query = empty;
		}
		else if (!query) {
			query = empty;
		}

		off(map, query, fn);
		return this;
	};

	// These methods are overidden when output ports become available.
	MIDI.send = noop;
	MIDI.output = noop;


	// Set up MIDI to listen to browser MIDI inputs

	function listen(input, push) {
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

		input.onmidimessage = push;
	}

	function updateInputs(midi, push) {
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
			//console.log('MIDI: Input detected:', input.name, input.id);
			listen(input, push);
		}
	}

	function createSendFn(outputs, map) {
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
			//console.log('MIDI: Output detected:', output.name, output.id);
			// Store outputs
			MIDI.outputs.push(output);
		}

		MIDI.output = createPortFn(midi.outputs);
		MIDI.send = createSendFn(midi.outputs, outputs);
	}

	function setupPorts(midi, push) {
		function connect(e) {
			updateInputs(midi, push);
			updateOutputs(midi);
		}

		// Not sure addEventListener works...
		//midi.addEventListener(midi, 'statechange', connect);
		midi.onstatechange = connect;
		connect();
	}
})(window);
