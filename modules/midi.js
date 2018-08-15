
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

// Important? Dunno.
//
//function send(port, data) {
//	if (port) {
//		port.send(data, 0);
//	}
//}


// MIDI

const root  = {};

function push(e) {
	fireRoute(0, e.data, root, e);
}

function Source(notify, stop, selector) {
	const buffer = [];

	function push() {
		buffer.push.apply(buffer, arguments);
		notify('push');
	}

	this._buffer   = buffer;
	this._selector = selector;
	this._push     = push;
	this._stop     = stop;

	MIDI.on(selector, push);
}

assign(Source.prototype, {
	shift: function midi() {
		return this._buffer.shift();
	},

	stop: function() {
		MIDI.off(this._selector, this._push);
		this._stop(this._buffer.length);
	}
});

export default function MIDI(selector) {
	/*
	Creates a stream of incoming MIDI event objects.

	    MIDI().each(console.log);

	<p>MIDI may be passed a selector that preselects which events enter the
	stream. A selector is either an array in the form of a MIDI message
	<code>[status, data1, data2]</code>:</p>

	    MIDI([144])                // CH1, NOTEON, all numbers
	    MIDI([144, 60])            // CH1, NOTEON, C3
	    MIDI([176, 7, 0])          // CH1, CC7, value 0

	or more conveniently an array of interpreted data of the form
	<code>[channel, type, data1, data2]</code>:

	    MIDI([1, 'noteon'])        // CH1, NOTEON, all numbers
	    MIDI([1, 'noteoff', 60])   // CH1, NOTEOFF, C3
	    MIDI([2, 'note', 'C3'])    // CH2, NOTEON and NOTEOFF, C3
	    MIDI([1, 'control', 7])    // CH1, CC7

	A MIDI stream is an instance of <a href="//stephen.band/fn/index.html#Stream"><code>Stream</code></a>
	, and can be mapped, filtered, consumed and stopped:

	    const noteStream = MIDI([1, 'note'])
	    .map(get('data'))
	    .each(function(message) {
		    // Do something with MIDI message
	    });

	    // Sometime later...
	    noteStream.stop();

	To discover more stream methods, read the Stream API at <a href="//stephen.band/fn/index.html#Stream">stephen.band/fn/index.html#Stream</a>
	*/

	return new Stream(Source, selector);
}

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

	output:    noop,

	send:      noop
});
