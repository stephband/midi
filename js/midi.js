(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('MIDI        - http://github.com/soundio/midi');
})(this);

(function(window) {
	"use strict";

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
	var nothing   = Fn.nothing;
	var now       = Fn.now;
	var overload  = Fn.overload;
	var pipe      = Fn.pipe;
	var remove    = Fn.remove;
	var rest      = Fn.rest;
	var set       = Fn.set;
	var toClass   = Fn.toClass;

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


	// Routing

	function ap(data, fns) {
		var n = -1;
		var fn;
		while (fn = fns[++n]) {
			fn(data);
		}
	}

	function remove(fns, fn) {
		var i = fns.indexOf(fn);
		if (i === -1) { return; }
		fns.splice(i, 1);
	}

	function fireRoute(i, query, object, message) {
		var name   = query[i++];
		var branch = object[name];

		if (name === undefined) {
			branch && ap(data, branch);
		}
		else {
			branch && fireRoute(i, query, branch, message);
			object.undefined && ap(message, object.undefined);
		}
	}

	function getRoute(i, query, object) {
		var name   = query[i++];
		var branch = object[name];

		return name === undefined ?
			branch :
			branch && getRoute(i, query, branch) ;
	}

	function setRoute(i, query, object, fn) {
		var name   = query[i++];
		var branch = object[name];

		return name === undefined ?
			branch ? branch.push(fn) : (object[name] = [fn]) :
			setRoute(i, query, branch || (object[name] = {}), fn) ;
	}

	function removeRoute(query, object, fn) {
		// Handle queries of type [channel, type, name || byte1, byte2]
		// or type [byte0, byte1, byte2]
		var fns = typeof query[1] === 'string' ?
			getRoute(0, toQuery(query), root) :
			getRoute(0, query, root) ;

		if (!fns) { return; }
		remove(fns, fn);
	}


	// Transforms

	var get1  = get('1');
	var type1 = function(object) { return typeof object[1]; };
	var query = {};

	function toNoteQuery(data) {
		query[0] = toStatus(data[0], data[1]);
		query[1] = typeof data[2] === 'string' ?
			nameToNumber(data[2]) :
			data[2] ;
		query[2] = data[3];
		return query;
	}

	function toQuery(data) {
		query[0] = toStatus(data[0], data[1]);
		query[1] = data[2];
		query[2] = data[3];
		return query;
	}

	function toEvent(message) {
		return {
			timeStamp: time || now(),
			data:      message
		};
	}

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


	// MIDI

	var root  = {};

	// Important? Dunno.
	//
	//function send(port, data) {
	//	if (port) {
	//		port.send(data, 0);
	//	}
	//}

	function push(e) {
		fireRoute(0, e.data, root, e);
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

			MIDI.on(query, push);

			return {
				shift: function midi() {
					return buffer.shift();
				},

				stop: function() {
					MIDI.off(query, push);
					stop(buffer.length);
				}
			};
		});
	}

	MIDI.prototype = Object.create(Stream.prototype);

	assign(MIDI, {
		on: overload(type1, {
			'string': overload(get1, {
				'note': function(data, fn) {
					var query = toNoteQuery(data);
		
					query[0] = toStatus(query[0], 'noteon');
					setRoute(0, query, root, fn);
			
					query[0] = toStatus(query[0], 'noteoff');
					setRoute(0, query, root, fn);
				},
		
				'noteon': function(data, fn) {
					var query = toNoteQuery(data);
					setRoute(0, query, root, fn);
				},
		
				'noteoff': function(data, fn) {
					var query = toNoteQuery(data);
					setRoute(0, query, root, fn);
				},
		
				default: function(data, fn) {
					var query = toQuery(data);
					setRoute(0, query, root, fn);
				}
			}),
		
			default: function(query, fn) {
				setRoute(0, query, root, fn)
			}
		}),

		off: overload(type1, {
			'string': overload(get1, {
				'note': function(data, fn) {
					var query = toNoteQuery(data);
		
					query[0] = toStatus(query[0], 'noteon');
					removeRoute(query, root, fn);
		
					query[0] = toStatus(query[0], 'noteoff');
					removeRoute(query, root, fn);
				},
		
				'noteon': function(data, fn) {
					var query = toNoteQuery(data);
					removeRoute(query, root, fn);
				},
		
				'noteoff': function(data, fn) {
					var query = toNoteQuery(data);
					removeRoute(query, root, fn);
				},
		
				default: function(query, fn) {
					var query = toQuery(data);
					removeRoute(query, root, fn);
				}
			}),
		
			default: function(query, fn) {
				removeRoute(query, root, fn);
			}
		}),
		
		trigger: overload(type1, {
			'string': overload(get1, {
				noteon:  pipe(toNoteQuery, toEvent, push),
				noteoff: pipe(toNoteQuery, toEvent, push),
				default: pipe(toQuery, toEvent, push)
			}),
		
			default: pipe(toEvent, push)
		}),

		push:      push,
		output:    noop,
		send:      noop,
		toChannel: toChannel,
		toType:    toType,
		toStatus:  curry(toStatus),
		types:     types
	});


	// Deprecate

	MIDI.toMessage    = deprecate(toType, 'MIDI: deprecation warning - MIDI.toMessage() has been renamed to MIDI.toType()');
	MIDI.typeToNumber = deprecate(toStatus, 'MIDI: typeToNumber(ch, type) is now toStatus(ch, type)');


	// Export

	window.MIDI = MIDI;

})(window);
