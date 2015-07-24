(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('MIDI');
	console.log('http://github.com/soundio/midi');
	console.log('MIDI events hub and helper library');
	console.log('——————————————————————————————————');
})(this);

(function(window) {
	"use strict";

	var debug = true;

	var MIDI = window.MIDI = {};

	var assign = Object.assign;

	var slice  = Function.prototype.call.bind(Array.prototype.slice);

	var rtype = /^\[object\s([A-Za-z]+)/;

	var empty = [];

	var map = { all: [] };

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
		if (arguments.length < 2) {
			return object;
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

	function createDatas(channel, type, data1, data2) {
		var datas = [];
		var regexp;

		if (!type) {
			for (type in MIDI.messages) {
				datas.push.apply(this, createDatas(channel, type, data1, data2));
			}
			return datas;
		}

		if (typeOf(type) === 'regexp') {
			regexp = type;
			for (type in MIDI.messages) {
				if (regexp.test(type)) {
					datas.push.apply(this, createDatas(channel, type, data1, data2));
				}
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

		offTree(object, fn);
	}

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

	MIDI.in = function(data) {
		var e = {
		    	data: data,
		    	receivedTime: +new Date()
		    };

		trigger(this, e);
	};

	MIDI.on = function(query, fn) {
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

	MIDI.learn = function(query, fn) {
		function listen(message, time) {
			var filter = message.slice();
			filter.length = 2;
			this.off(listen);
			this.on(filter, fn);
			fn(message, time);
		}

		this.on(query, listen);
	};

	// These methods are overidden when output ports become available.
	MIDI.send = noop;
	MIDI.output = noop;


	// Set up MIDI to listen to browser MIDI inputs

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

		input.onmidimessage = function(e) {
			trigger(MIDI, e);
		};
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

	MIDI.request
	.then(function(midi) {
		if (debug) { console.groupCollapsed('MIDI'); }
		setupPorts(midi);
		if (debug) { console.groupEnd(); }
	})
	.catch(function(error) {
		console.warn(error.message);
	});
})(window);
