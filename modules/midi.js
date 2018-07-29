
if (window.console || window.console.log) {
	console.log('MIDI        - http://github.com/soundio/midi');
}

import { ap, cache, curry, deprecate, each, get, isDefined, noop, nothing, overload, pipe, remove, rest, set, Stream, toClass } from '../../fn/fn.js';
import { toStatus, toType } from './functions.js';

var performance = window.performance;

var assign      = Object.assign;


// Routing

function fireRoute(i, query, object, message) {
	var name   = query[i++];
	var branch = object[name];

	if (name === undefined) {
		branch && ap(message, branch);
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
		timeStamp: performance.now(),
		data:      message
	};
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

export default function MIDI(query) {
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

				query[0] = toStatus(data[0], 'noteon');
				setRoute(0, query, root, fn);

				query[0] = toStatus(data[0], 'noteoff');
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

				query[0] = toStatus(data[0], 'noteon');
				removeRoute(query, root, fn);

				query[0] = toStatus(data[0], 'noteoff');
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
	send:      noop
});
