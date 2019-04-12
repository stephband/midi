
import { overload, remove, toArgsLength } from './utils.js';
import { toStatus, controlToNumber, noteToNumber } from './data.js';
import { createMessage, normalise } from './messages.js';

const performance = window.performance;


// Routing

const roots = {};

export function fire(e) {
    // Normalise noteon 0 to noteoff
    normalise(e.data);

    // Fire port-specific listeners, if there are any
    const portRoot = roots[e.target && e.target.id];
	if (portRoot) { fireRoute(0, portRoot, e); }

    // Fire port-generic listeners, if there are any
    const allRoot = roots['undefined'];
    if (allRoot) { fireRoute(0, allRoot, e); }
}

function fireRoute(i, tree, e) {
	var name   = e.data[i++];
	var branch = tree[name];

	if (name === undefined) {
		branch && branch.forEach((fn) => fn(e));
	}
	else {
		branch && fireRoute(i, branch, e);
		tree.undefined && tree.undefined.forEach((fn) => fn(e));
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

function removeRoute(query, root, fn) {
	var fns = getRoute(0, query, root);
	if (!fns) { return; }
	remove(fns, fn);
}

const query = {};

function toNoteQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = typeof selector[2] === 'string' ?
		noteToNumber(selector[2]) :
		selector[2] ;
	query[2] = selector[3];
	return query;
}

function toControlQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = typeof selector[2] === 'string' ?
		controlToNumber(selector[2]) :
		selector[2] ;
	query[2] = selector[3];
	return query;
}

function toQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = selector[2];
	query[2] = selector[3];
	return query;
}

// Transforms

function get1(object) { return object[1]; }
function type1(object) { return typeof object[1]; }



//createEvent(time, port, message)
//
//Creates a MIDI event object from `time` (a DOM time), `port` (an MIDI port or
//the id of a MIDI port) and `message` (a MIDI message). While event objects
//are not actual DOM event objects, they deliberately mirror the structure of
//incoming event objects.
//
//    createEvent(2400.56, 'id', [144, 69, 96])
//
//    // {
//    //     timeStamp: 2400.56,
//    //     port: MIDIPort[id],
//    //     data: [144, 69, 96]
//    // }
//
//Event objects are pooled to avoid creating large numbers of objects, and they
//become invalid when DOM time advances beyond their `timeStamp`. If you need
//to store them, they should be cloned.

const eventInvalidationTime = 500;
const events = [];

let now;

function isOutOfDate(e) {
	return e.timeStamp < now;
}

export function createEvent(time, port, message) {
	// Allow a margin of error for event invalidation
	now = performance.now() + eventInvalidationTime;

    // Find an unused event object in the pool
	let e = events.find(isOutOfDate);

    // If there is none, create one
	if (!e) {
		e = {};
		events.push(e);
	}

    // Assign it some data
	e.timeStamp = time;
	e.target    = port;
	e.data      = message;

	return e;
}

/*
on(selector, fn)

Registers a handler `fn` for incoming MIDI events that match object `selector`.

    on([1, 'note'], function(e) {
        // Do something with CH1 NOTEON and NOTEOFF event objects
        const time    = e.timeStamp;
        const port    = e.target;
        const message = e.data;
    });

A selector is either an array in the form of a MIDI message
`[status, data1, data2]`:

    // Call fn on CH1 NOTEON events
	on([144], fn);

    // Call fn on CH1 NOTEON C4 events
	on([144, 60], fn);

    // Call fn on CH1 NOTEON C4 127 events
	on([144, 60, 127], fn);

or more conveniently an array of interpretive data of the form
`[chan, type, param, value]`:

    // Call fn on CH2 NOTEON events
	on([2, 'noteon'], fn);

    // Call fn on CH2 NOTEOFF C4 events
	on([2, 'noteoff', 'C4'], fn)

    // Call fn on CH2 NOTEON and NOTEOFF C4 events
	on([2, 'note', 'C4'], fn)

Finally, a selector may have a property `port`, the id of an input port.

    // Call fn on CH4 CC events from port '012345'
	on({ port: '012345', 0: 4, 1: 'control' }}, fn);

    // Call fn on CH4 CC 64 events from port '012345'
	on({ port: '012345', 0: 4, 1: 'control', 2: 64 }}, fn);

Selectors pre-create paths in a filter tree through which incoming events flow,
for performance.
*/

const setSelectorRoute = overload(type1, {
	'string': overload(get1, {
		'note': function(selector, root, fn) {
			var query = toNoteQuery(selector);

			query[0] = toStatus(selector[0], 'noteon');
			setRoute(0, query, root, fn);

			query[0] = toStatus(selector[0], 'noteoff');
			setRoute(0, query, root, fn);
		},

		'noteon': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			setRoute(0, query, root, fn);
		},

		'noteoff': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			setRoute(0, query, root, fn);
		},

        'polytouch': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			setRoute(0, query, root, fn);
		},

		'control': function(selector, root, fn) {
			const query = toControlQuery(selector);
			setRoute(0, query, root, fn);
		},

		'default': function(selector, root, fn) {
			var query = toQuery(selector);
			setRoute(0, query, root, fn);
		}
	}),

	'default': function(selector, root, fn) {
        // If the selector refers to a status use selector as query
        if (selector[0] === undefined || selector[0] > 16) {
            setRoute(0, selector, root, fn);
            return;
        }

        // Otherwise, there being no message type, listen to everything
        // on the given channel
        selector[1] = 'note';
        setSelectorRoute(selector, root, fn);

        selector[1] = 'control';
        setSelectorRoute(selector, root, fn);

        selector[1] = 'pitch';
        setSelectorRoute(selector, root, fn);

        selector[1] = 'polytouch';
        setSelectorRoute(selector, root, fn);

        selector[1] = 'channeltouch';
        setSelectorRoute(selector, root, fn);

        selector[1] = 'program';
        setSelectorRoute(selector, root, fn);
	}
});

export function on(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = roots[id] || (roots[id] = {});
    setSelectorRoute(selector, root, fn);
}

/*
off(selector, fn)

Removes an event listener 'fn' from MIDI events matching object 'selector'. Where
'fn' is not given, removes all handlers from events matching the selector.

    off(['note'], fn);
*/

const removeSelectorRoute = overload(type1, {
	'string': overload(get1, {
		'note': function(selector, root, fn) {
			var query = toNoteQuery(selector);

			query[0] = toStatus(selector[0], 'noteon');
			removeRoute(query, root, fn);

			query[0] = toStatus(selector[0], 'noteoff');
			removeRoute(query, root, fn);
		},

		'noteon': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			removeRoute(query, root, fn);
		},

		'noteoff': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			removeRoute(query, root, fn);
		},

        'polytouch': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			setRoute(query, root, fn);
		},

		'default': function(selector, root, fn) {
			var query = toQuery(selector);
			removeRoute(query, root, fn);
		}
	}),

	'default': function(selector, root, fn) {
        // If the selector refers to a status use selector as query
        if (selector[0] === undefined || selector[0] > 16) {
            removeRoute(selector, root, fn);
            return;
        }

        // Otherwise, there being no message type, remove fn from
        // all types for this channel
        selector[1] = 'note';
        removeSelectorRoute(selector, root, fn);

        selector[1] = 'control';
        removeSelectorRoute(selector, root, fn);

        selector[1] = 'pitch';
        removeSelectorRoute(selector, root, fn);

        selector[1] = 'polytouch';
        removeSelectorRoute(selector, root, fn);

        selector[1] = 'channeltouch';
        removeSelectorRoute(selector, root, fn);

        selector[1] = 'program';
        removeSelectorRoute(selector, root, fn);
	}
});

export function off(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = roots[id] || (roots[id] = {});
    removeSelectorRoute(selector, root, fn);
}

/*
trigger(port, message)

Simulates an incoming MIDI message and fires listeners with matching selectors.
Useful for debugging.

    trigger(null, [128, 69, 88]);
*/

/*
trigger(port, chan, type, param, value)

As `trigger(port, message)`, where the last 4 parameters are passed to
`createMessage()` to create the MIDI message before triggering.

    trigger(null, 1, 'noteon', 'A4', 0.75);
*/

const internalPort = {
    id: 'MIDI.trigger()'
};

export const trigger = overload(toArgsLength, {
    1: fire,

	2: function(port, message) {
		const e = createEvent(performance.now(), port ? port : internalPort, message);
		fire(e);
	},

    default: function(port, chan, type, param, value) {
		const message = createMessage(chan, type, param, value);
		const e       = createEvent(performance.now(), port ? port : internalPort, message);
		fire(e);
	}
});
