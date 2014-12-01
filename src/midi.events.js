(function(MIDI) {
	"use strict";

	var debug = true;

	var slice = Function.prototype.call.bind(Array.prototype.slice);

	var rtype = /^\[object\s([A-Za-z]+)/;

	var empty = [];

	var map = {
	    	all: []
	    };

	function typeOf(object) {
		var type = typeof object;
	
		return type === 'object' ?
			rtype.exec(Object.prototype.toString.apply(object))[1].toLowerCase() :
			type ;
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

	function trigger(list, message) {
		var l = list.length;
		var n = -1;
		var fn, args;

		// Lets not worry about list mutating while we trigger.
		// list = slice(list);

		while (++n < l) {
			fn = list[n][0];
			args = list[n][1];
			args[0] = message;
			fn.apply(MIDI, args);
		}
	}

	function listen(input) {
		input.addEventListener('midimessage', function(e) {
			var message = e.data;
			var obj = map;

			// All messages
			if (obj.all) {
				trigger(obj.all, e);
			}

			// data[0]
			obj = obj[message[0]];

			if (!obj) { return; }

			if (obj.all) {
				trigger(obj.all, e);
			}

			// data[1]
			obj = obj[message[1]];

			if (!obj) { return; }

			if (obj) {
				trigger(obj, e);
			}
		});
	}

	function updateInputs(midi) {
		// It's suggested here that we need to keep a reference to midi inputs
		// hanging around to avoid garbage collection:
		// https://code.google.com/p/chromium/issues/detail?id=163795#c123
		MIDI.inputs = slice(midi.inputs());
		MIDI.inputs.forEach(listen);
		if (debug) { console.log('MIDI: updated MIDI inputs', MIDI.inputs); }
	}

	function setupInputs(midi) {
		midi.addEventListener('connect', function() {
			updateInputs(midi);
		});

		midi.addEventListener('disconnect', function() {
			updateInputs(midi);
		});

		updateInputs(midi);
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

	function on(map, query, fn) {
		var list = query.length === 0 ?
				get(map, 'all') || set(map, 'all', []) :
			query.length === 1 ?
				get(map, query[0], 'all') || set(map, query[0], 'all', []) :
				get(map, query[0], query[1]) || set(map, query[0], query[1], []) ;

		list.push([fn, slice(arguments, 2)]);
	}

	MIDI.on = function(query, fn) {
		var type = typeOf(query);
		var queries;

		if (type === 'object') {
			queries = createQueries(query);

			while (query = queries.pop()) {
				on(map, query, fn);
			}

			return this;
		}

		if (type === 'function') {
			fn = query;
			query = empty;
		}

		on(map, query, fn);
		return this;
	};

	MIDI.off = function(message, fn) {
		if (typeOf(message) === 'function' || message.length === 0) {
			remove(map.all, message);
			// TODO: Remove function from all event lists
		}

		var list = message.length === 1 ?
			get(map, message[0], 'all') :
			get(map, message[0], message[1]) ;

		if (list) {
			if (fn) {
				remove(list, fn);
			}
			else {
				list.length = 0;
			}
		}
		
		return this;
	};

	Object.defineProperty(MIDI, 'events', { value: map });

	MIDI.inputs = [];
	MIDI.request.then(function(midi) {
		setupInputs(midi);
	})
	.catch(function(error) {
		console.log(error);
		throw error;
	});
})(window.MIDI);
