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

	function triggerList(list, message) {
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

	function trigger(object, e) {
		var message = e.data;
		var obj = getListeners(object);

		// All messages
		if (obj.all) {
			triggerList(obj.all, e);
		}

		// data[0]
		obj = obj[message[0]];

		if (!obj) { return; }

		if (obj.all) {
			triggerList(obj.all, e);
		}

		// data[1]
		obj = obj[message[1]];

		if (!obj) { return; }

		if (obj) {
			triggerList(obj, e);
		}
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

	function inFn(map) {
		if (this.fn) {
			this.fn(e);
		}
		else {
			trigger(list, message);
		}
	}

	function on(map, query, fn) {
		var list = query.length === 0 ?
				get(map, 'all') || set(map, 'all', []) :
			query.length === 1 ?
				get(map, query[0], 'all') || set(map, query[0], 'all', []) :
				get(map, query[0], query[1]) || set(map, query[0], query[1], []) ;

		list.push([fn, slice(arguments, 2)]);
	}

	function off(map, query, fn) {
		var object = query.length === 0 ?
				map :
			query.length === 1 ?
				get(map, query[0]) :
				get(map, query[0], query[1]) ;

		if (!object) { return; }

		var keys = Object.keys(object);
		var n = keys.length;
		var list;

		if (fn) {
			while (n--) {
				list = object[keys[n]];
				remove(list, fn);
			}
		}
		else {
			while (n--) {
				list = object[keys[n]];
				list.length = 0;
			}
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
		}
	};


	// Set up MIDI to listen to browser MIDI inputs

	function listen(input) {
		input.addEventListener('midimessage', function(e) {
			trigger(MIDI, e);
		});
	}

	function updateInputs(midi) {
		// It's suggested here that we need to keep a reference to midi inputs
		// hanging around to avoid garbage collection:
		// https://code.google.com/p/chromium/issues/detail?id=163795#c123

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

	function setupInputs(midi) {
		midi.onconnect = function connect() {
			updateInputs(midi);
		};

		midi.ondisconnect = function disconnect() {
			updateInputs(midi);
		};

		updateInputs(midi);
	}

	extend(MIDI, mixins.events);

	MIDI.request
	.then(function(midi) {
		setupInputs(midi);
	})
	.catch(function(error) {
		console.log(error);
		throw error;
	});
})(window.MIDI);
