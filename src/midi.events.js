(function(MIDI) {
	"use strict";

	var debug = true;

	var slice = Function.prototype.call.bind(Array.prototype.slice);

	var rtype = /^\[object\s([A-Za-z]+)/;

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
				trigger(obj.all, message);
			}

			// data[0]
			obj = obj[message[0]];

			if (!obj) { return; }

			if (obj.all) {
				trigger(obj.all, message);
			}

			// data[1]
			obj = obj[message[1]];

			if (!obj) { return; }

			if (obj) {
				trigger(obj, message);
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

	MIDI.on = function(message, fn) {
		if (typeOf(message) === 'function' || message.length === 0) {
			fn = message;
			map.all.push([fn, slice(arguments)]);
			return this;
		}

		var list = message.length === 1 ?
			get(map, message[0], 'all') || set(map, message[0], 'all', []) :
			get(map, message[0], message[1]) || set(map, message[0], message[1], []) ;

		list.push([fn, slice(arguments, 1)]);

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
