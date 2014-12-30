// MIDI module.

(function (window) {
	'use strict';

	var MIDI = {};

	MIDI.request = navigator.requestMIDIAccess ?
		navigator.requestMIDIAccess() :
		new Promise(function(accept, reject){
			reject('Your browser does not support MIDI via the navigator.requestMIDIAccess() API.');
		}) ;

	window.MIDI = MIDI;
})(window);

(function(MIDI) {
	"use strict";

	var debug = true;

	var slice = Function.prototype.call.bind(Array.prototype.slice);

	var rtype = /^\[object\s([A-Za-z]+)/;

	var empty = [];

	var map = {
	    	all: []
	    };

	var store = [];

	var outputs = [];

	function noop() {}

	function typeOf(object) {
		var type = typeof object;
	
		return type === 'object' ?
			rtype.exec(Object.prototype.toString.apply(object))[1].toLowerCase() :
			type ;
	}

	function extend(obj) {
		var i = 0,
		    length = arguments.length,
		    obj2, key;
	
		while (++i < length) {
			obj2 = arguments[i];
	
			for (key in obj2) {
				if (obj2.hasOwnProperty(key)) {
					obj[key] = obj2[key];
				}
			}
		}
	
		return obj;
	}

	function clear(obj) {
		var key;
		for (key in obj) { delete obj[key]; }
	}

	function getListeners(object) {
		if (!object.listeners) {
			Object.defineProperty(object, 'listeners', {
				value: {}
			});
		}

		return object.listeners;
	}

	// Deep get and set for getting and setting nested objects

	function get(object, property) {
		if (arguments.length < 3) {
			return object[property];
		}

		if (!object[property]) {
			return;
		}

		var args = slice(arguments, 1);

		args[0] = object[property] ;
		return get.apply(this, args);
	}

	function set(object, property, value) {
		if (arguments.length < 4) {
			object[property] = value;
			return value;
		}

		var args = slice(arguments, 1);

		args[0] = object[property] === undefined ? (object[property] = {}) : object[property] ;
		return set.apply(this, args);
	}

	function remove(list, fn) {
		var n = list.length;
		
		while (n--) {
			if (list[n][0] === fn) {
				list.splice(n, 1);
			}
		}
	}

	function triggerList(list, e) {
		var l = list.length;
		var n = -1;
		var fn, args;

		// Lets not worry about list mutating while we trigger. We want speed.
		// list = slice(list);

		while (++n < l) {
			fn = list[n][0];
			args = list[n][1];
			args[0] = e.data;
			args[1] = e.receivedTime;
			args[2] = e.target;
			fn.apply(MIDI, args);
		}
	}

	function triggerTree(object, array, n, e) {
		var prop = array[n];
		var obj = object[prop];

		if (obj) {
			++n;

			if (n < array.length) {
				triggerTree(obj, array, n, e);
			}
			else if (obj.length) {
				triggerList(obj, e);
			}
		}

		if (object.all) {
			triggerList(object.all, e);
		}
	}

	function trigger(object, e) {
		triggerTree(getListeners(object), e.data, 0, e);
	}

	function createData(channel, message, data1, data2) {
		var number = MIDI.messageToNumber(channel, message);
		var data = typeof data1 === 'string' ?
		    	MIDI.noteToNumber(data1) :
		    	data1 ;

		return data1 ? data2 ? [number, data, data2] : [number, data] : [number] ;
	}

	function createDatas(channel, message, data1, data2) {
		var datas = [];

		if (!message) {
			for (message in MIDI.messages) {
				datas.push.apply(this, createDatas(channel, message, data1, data2));
			}
			return datas;
		}

		if (channel && channel !== 'all') {
			datas.push(createData(channel, message, data1, data2));
			return datas;
		}

		var ch = 16;
		var array = createData(1, message, data1, data2);
		var data;

		while (ch--) {
			data = array.slice();
			data[0] += ch;
			datas.push(data);
		}

		return datas;
	}

	function createQueries(query) {
		var queries;

		if (query.message === 'note') {
			var noteons  = createDatas(query.channel, 'noteon', query.data1, query.data2);
			var noteoffs = createDatas(query.channel, 'noteoff', query.data1, query.data2);

			queries = noteons.concat(noteoffs);
		}
		else {
			queries = createDatas(query.channel, query.message, query.data1, query.data2);
		}

		return queries;
	}

	function on(map, query, fn, args) {
		var list = query.length === 0 ?
		    	get(map, 'all') || set(map, 'all', []) :
		    query.length === 1 ?
		    	get(map, query[0], 'all') || set(map, query[0], 'all', []) :
		    query.length === 2 ?
		    	get(map, query[0], query[1], 'all') || set(map, query[0], query[1], 'all', []) :
		    	get(map, query[0], query[1], query[2]) || set(map, query[0], query[1], query[2], []) ;

		list.push([fn, args]);
	}

	function off(map, query, fn) {
		var args = [map];

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

		// Remove the matching function from each array in object
		for (key in object) {
			remove(object[key], fn);
		}
	}

	function send(port, data) {
		if (port) {
			port.send(data, 0);
		}
	}

	var mixins = MIDI.mixins || (MIDI.mixins = {});

	mixins.events = {
		in: function(data) {
			var e = {
			    	data: data,
			    	receivedTime: +new Date()
			    };

			trigger(this, e);
		},

		on: function(query, fn) {
			var type = typeOf(query);
			var map = getListeners(this);
			var args = [];
			var queries;

			if (type === 'object') {
				queries = createQueries(query);
				args.length = 1;
				args.push.apply(args, arguments);

				while (query = queries.pop()) {
					on(map, query, fn, args);
				}

				return this;
			}

			if (type === 'function') {
				fn = query;
				query = empty;
				args.length = 2;
			}
			else {
				args.length = 1;
			}

			args.push.apply(args, arguments);

			on(map, query, fn, args);
			return this;
		},

		off: function(query, fn) {
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
		},

		// These methods are overidden when output ports become available.
		send: noop,
		output: noop
	};


	// Set up MIDI to listen to browser MIDI inputs

	function listen(input) {
		// It's suggested here that we need to keep a reference to midi inputs
		// hanging around to avoid garbage collection:
		// https://code.google.com/p/chromium/issues/detail?id=163795#c123
		store.push(input);

		input.addEventListener('midimessage', function(e) {
			trigger(MIDI, e);
		});
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
			console.log('MIDI: Output detected:', output.name, output.id);
			// Store outputs
			MIDI.outputs.push(output);
		}

		MIDI.output = createPortFn(midi.outputs);
		MIDI.send = createSendFn(midi.outputs, outputs);
	}

	function setupPorts(midi) {
		function connect() {
			updateInputs(midi);
			updateOutputs(midi);
		}

		midi.onconnect = connect;
		midi.ondisconnect = connect;
		connect();
	}

	extend(MIDI, mixins.events);

	MIDI.request
	.then(function(midi) {
		
		setupPorts(midi);
	})
	.catch(function(error) {
		console.log(error);
		throw error;
	});
})(window.MIDI);

// MIDI utilities
//
// Declares utility functions and constants on the MIDI object.

(function(MIDI) {
	'use strict';

	var noteNames = [
	    	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G♯', 'A', 'B♭', 'B'
	    ];

	var noteTable = {
	    	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	    	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	    	'A♯': 10, 'B♭': 10, 'B': 11
	    };

	var rnotename = /^([A-G][♭♯]?)(\d)$/;
	var rshorthand = /[b#]/g;

	var messages = {
	    	noteoff:      128,
	    	noteon:       144,
	    	polytouch:    160,
	    	control:      176,
	    	pc:           192,
	    	channeltouch: 208,
	    	pitch:        224
	    };

	var normaliseEvent = (function(converters) {
		return function normaliseEvent(e, timeOffset) {
			var message = MIDI.toMessage(e.data);
			var time = e.receivedTime - (timeOffset || 0);

			return converters[message] ?
				converters[message](e) :
				[time, 0, message, e.data[1], e.data[2] / 127] ;
		};
	})({
		pitch: function(e) {
			return [e.receivedTime, 0, 'pitch', pitchToFloat(e.data, 2)];
		},

		pc: function(e) {
			return [e.receivedTime, 0, 'program', e.data[1]];
		},

		channeltouch: function(e) {
			return [e.receivedTime, 0, 'aftertouch', 'all', e.data[1] / 127];
		},

		polytouch: function(e) {
			return [e.receivedTime, 0, 'aftertouch', e.data[1], e.data[2] / 127];
		}
	});

	function round(n, d) {
		var factor = Math.pow(10, d); 
		return Math.round(n * factor) / factor;
	}

	// Library functions

	function isNote(data) {
		return data[0] > 127 && data[0] < 160 ;
	}

	function isControl(data) {
		return data[0] > 175 && data[0] < 192 ;
	}

	function isPitch(data) {
		return data[0] > 223 && data[0] < 240 ;
	}

	function toChannel(data) {
		return data[0] % 16 + 1;
	}

	//function toMessage(data) {
	//	return MIDI.messages[Math.floor(data[0] / 16) - 8];
	//}

	function toMessage(data) {
		var name = MIDI.messages[Math.floor(data[0] / 16) - 8];
	
		// Catch type noteon with zero velocity and rename it as noteoff
		return name === MIDI.messages[1] && data[2] === 0 ?
			MIDI.messages[0] :
			name ;
	}

	function normaliseNoteOff(data) {
		// If it's a noteon with 0 velocity, normalise it to a noteoff
		if (data[2] === 0 && data[0] > 143 && data[0] < 160) {
			data[0] -= 16;
		}

		return data;
	}

	function normaliseNoteOn(data) {
		// If it's a noteoff, make it a noteon with 0 velocity.
		if (data[0] > 127 && data[0] < 144) {
			data[0] += 16;
			data[2] = 0;
		}

		return data;
	}

	function replaceSymbol($0, $1) {
		return $1 === '#' ? '♯' :
			$1 === 'b' ? '♭' :
			'' ;
	}

	function normaliseNoteName(name) {
		return name.replace(rshorthand, replaceSymbol);
	}

	function pitchToInt(data) {
		return (data[2] << 7 | data[1]) - 8192 ;
	}

	function pitchToFloat(data, range) {
		return (range === undefined ? 2 : range) * pitchToInt(data) / 8191 ;
	}

	function noteToNumber(str) {
		var r = rnotename.exec(normaliseNoteName(str));
		return parseInt(r[2]) * 12 + noteTable[r[1]];
	}

	function numberToNote(n) {
		return noteNames[n % 12];
	}

	function numberToOctave(n) {
		return Math.floor(n / 12) - (5 - MIDI.middle);
	}

	function numberToFrequency(n, frequency) {
		return (frequency || 440) * Math.pow(1.059463094359, (n + 3 - (MIDI.middle + 2) * 12));
	}

	function frequencyToNumber(n, frequency) {
		// TODO: Implement
		return;
	}

	function messageToNumber(channel, message) {
		return messages[message] + (channel ? channel - 1 : 0 );
	}

	MIDI.messages = Object.keys(messages);
	MIDI.pitch = 440;
	MIDI.middle = 3;

	//MIDI.noteNames = noteNames;
	//MIDI.noteTable = noteTable;
	MIDI.isNote = isNote;
	MIDI.isPitch = isPitch;
	MIDI.isControl = isControl;
	MIDI.messageToNumber = messageToNumber;
	MIDI.noteToNumber = noteToNumber;
	MIDI.numberToNote = numberToNote;
	MIDI.numberToOctave = numberToOctave;
	MIDI.numberToFrequency = numberToFrequency;
	MIDI.toMessage = toMessage;
	MIDI.toChannel = toChannel;
	MIDI.toType    = toMessage;
	MIDI.normaliseNoteOn = normaliseNoteOn;
	MIDI.normaliseNoteOff = normaliseNoteOff;
	MIDI.pitchToInt = pitchToInt;
	MIDI.pitchToFloat = pitchToFloat;
	MIDI.normaliseEvent = normaliseEvent;
})(MIDI);
