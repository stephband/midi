
import { toStatus, controlToNumber, noteToNumber } from './data.js';
import { toType } from './messages.js';
import { request } from './midi.js';

const assign      = Object.assign;
const performance = window.performance;


// Utilities

function overload(fn, map) {
    return function overload() {
        const key     = fn.apply(null, arguments);
        const handler = (map[key] || map.default);
        if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
        return handler.apply(this, arguments);
    };
}

function remove(array, value) {
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
}


// Routing

const root  = {};

export function fire(e) {
	fireRoute(0, root, e);
}

function fireRoute(i, tree, e) {
	var name   = e.data[i++];
	var branch = tree[name];

	if (name === undefined) {
		branch && branch.forEach(fn => fn(e.receivedTime, e.target, e.data));
	}
	else {
		branch && fireRoute(i, branch, e);
		tree.undefined && tree.undefined.forEach(fn => fn(e.receivedTime, e.target, e.data));
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

function get1(object) { return object[1]; };
function type1(object) { return typeof object[1]; };
function typeArg2() { return typeof arguments[2]; };

const events = [];
const eventInvalidationTime = 500;
let now;

function isPastEvent(e) {
	return e.receivedTime < now;
}

function createEvent(time, port, message) {
	// Allow a margin of error for event invalidation
	now = performance.now() + eventInvalidationTime;
	let e = events.find(isPastEvent);

	if (!e) {
		e = {};
		events.push(e);
	}

	e.receivedTime = time;
	e.target       = port;
	e.data         = message;

	return e;
}

/*
on(selector, fn)

Registers a handler `fn` for incoming MIDI messages that match object `selector`.

    on(['note'], function(time, port, message) {
	    // Do something with noteon and noteoff event objects
    });

A selector is either an array in the form of a MIDI message
`[status, data1, data2]`:

	on([144], fn)              // CH1, NOTEON, all numbers
	on([144, 60], fn)          // CH1, NOTEON, C3
	on([176, 7, 0], fn)        // CH1, CC7, value 0

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
trigger(time, port, message)

Mainly useful for debugging, `trigger()` simulates an incoming MIDI message,
firing listeners with matching selectors.

    trigger(0, null, [128, 69, 88]);

Trigger also accepts a longer parameter list of the form
`trigger(time, port, chan, type, param, value)`, where the last four parameters
are passed to `createMessage()` in order to create the message.

    trigger(0, null, 1, 'noteon', 'A4', 0.75);
*/

export const trigger = overload(typeArg2, {
	'number': function(time, port, chan, type, param, value) {
		const message = createMessage(chan, type, param, value);
		const now     = performance.now();
		const e       = createEvent(time > now ? time : now, undefined, message);
		fire(e);
	},

	'default': function(time, port, message) {
		const e = createEvent(performance.now(), undefined, message);
		fire(e);
	}
});
