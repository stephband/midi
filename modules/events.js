
import { ap, cache, curry, deprecate, each, get, isDefined, noop, nothing, overload, pipe, remove, rest, set, Stream, toClass } from '../../fn/fn.js';
import { toStatus, controlToNumber, noteToNumber } from './data.js';
import { toType } from './messages.js';
import { request } from './midi.js';

const assign      = Object.assign;
const performance = window.performance;


// Routing

const root  = {};

export function fire(i, tree, e) {
	var name   = e.data[i++];
	var branch = tree[name];

	if (name === undefined) {
		branch && ap(e, branch);
	}
	else {
		branch && fire(i, branch, e);
		tree.undefined && ap(e, tree.undefined);
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

const query = {};

function toNoteQuery(data) {
	query[0] = toStatus(data[0], data[1]);
	query[1] = typeof data[2] === 'string' ?
		noteToNumber(data[2]) :
		data[2] ;
	query[2] = data[3];
	return query;
}

function toControlQuery(data) {
	query[0] = toStatus(data[0], data[1]);
	query[1] = typeof data[2] === 'string' ?
		controlToNumber(data[2]) :
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

// Transforms

var get1     = function(object) { return object[1]; };
var type1    = function(object) { return typeof object[1]; };
var typeArg1 = function() { return typeof arguments[1]; };



/*
createEvent(time, port, message)

Creates a MIDI event object of the form:

    {
        data: message,
        target: port,
        recievedTime: time
    }

Events are pooled to avoid eating memory and triggering the garbage collector.
An event object becomes invalid after it's `receivedTime` property becomes less
than the current DOM time, `window.performance.now()`. If event objects need to
be stored for some reason they should be cloned first.
*/

const events = [];
const eventInvalidationTime = 500;
let now;

function isPastEvent(e) {
	return e.time < now;
}

export function createEvent(time, port, message) {
	// Allow a margin of error for event invalidation
	now = performance.now() + eventInvalidationTime;
	let e = events.find(isPastEvent);

	if (!e) {
		e = {};
		events.push(e);
	}

	e.time   = time;
	e.target = port;
	e.data   = message;

	return e;
}

/*
on(selector, fn)

Registers a handler `fn` for incoming MIDI events that match object `selector`.

    on(['note'], function(e) {
	    // Do something with noteon and noteoff event objects
    });

A selector is either an array in the form of a MIDI message
`[status, data1, data2]`:

	on([144], fn)              // CH1, NOTEON, all numbers
	on([144, 60])              // CH1, NOTEON, C3
	on([176, 7, 0])            // CH1, CC7, value 0

or more conveniently an array of interpretive data of the form
`[channel, type, data1, data2]`:

	on([1, 'noteon'], fn)      // CH1, NOTEON, all numbers
	on([1, 'noteoff', 60], fn) // CH1, NOTEOFF, C3
	on([2, 'note', 'C3'], fn)  // CH2, NOTEON and NOTEOFF, C3
	on([1, 'control', 7], fn)  // CH1, CC7

For speed, selectors create paths in a filter tree through which incoming
events flow with minimal lookups.
*/

export const on = overload(type1, {
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

		'control': function(data, fn) {
			const query = toControlQuery(data);
			setRoute(0, query, root, fn);
		},

		'default': function(data, fn) {
			var query = toQuery(data);
			setRoute(0, query, root, fn);
		}
	}),

	'default': function(query, fn) {
		setRoute(0, query, root, fn)
	}
});

/*
off(selector, fn)

Removes an event listener 'fn' from MIDI events matching object 'selector'. Where
'fn' is not given, removes all handlers from events matching the selector.

    off(['note'], fn);
*/

export const off = overload(type1, {
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

		'default': function(query, fn) {
			var query = toQuery(data);
			removeRoute(query, root, fn);
		}
	}),

	'default': function(query, fn) {
		removeRoute(query, root, fn);
	}
});

/*
trigger(chan, type, param, value)

Simulates an incoming MIDI message, firing listeners with matching selectors.

    trigger(1, 'noteon', 'C6', 64);
*/

export const trigger = overload(typeArg1, {
	'string': function(chan, type, param, value) {
		const message = createMessage(chan, type, param, value);
		const e       = createEvent(performance.now(), undefined, message);
		fire(0, root, e);
	},

	'default': function(message) {
		const e = createEvent(performance.now(), undefined, message);
		fire(0, root, e);
	}
});
