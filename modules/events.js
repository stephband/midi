
import { overload, remove, toArgsLength } from './utils.js';
import { toStatus, toControlNumber, toNoteNumber } from './data.js';
import { createMessage, normalise } from './messages.js';

const performance = window.performance;


// Incoming message routing

const ports = {};

export function fire(e) {
    // Normalise noteon 0 to noteoff
    normalise(e.data);

    // Fire port-specific listeners, if port is defined and there are any
    if (e.target && e.target.id) {
        const portRoot = ports[e.target.id];
        if (portRoot) { fireRoute(0, portRoot, e); }
    }

    // Fire port-generic listeners, if there are any
    const allRoot = ports['undefined'];
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


// Queries

const query = {};

function toNoteQuery(selector) {
	query[0] = toStatus(selector.channel, selector.type);
	query[1] = typeof selector.name === 'string' ?
        toNoteNumber(selector.name) :
		selector.name ;
	query[2] = selector.value;
	return query;
}

function toControlQuery(selector) {
	query[0] = toStatus(selector.channel, selector.type);
	query[1] = typeof selector.name === 'string' ?
		toControlNumber(selector.name) :
		selector.name ;
	query[2] = selector.value;
	return query;
}

function toQuery(selector) {
	query[0] = toStatus(selector.channel, selector.type);
	query[1] = selector.name;
	query[2] = selector.value;
	return query;
}

function toSelectorType(object) {
    // Loose duck type checking for index 0, so that we may accept
    // objects as array selectors
    return typeof object[0] === 'number' ? 'array' :
        object.channel ? object.type :
        'array' ;
}


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

/**
on(selector, fn)

Registers a handler `fn` for incoming MIDI events that match object `selector`.
A selector is either an array (or array-like) in the form of a MIDI message
`[status, data1, data2]`:

    // Call fn on CH1 NOTEON events
	on([144], fn);

    // Call fn on CH1 NOTEON C4 events
	on([144, 60], fn);

    // Call fn on CH1 NOTEON C4 127 events
	on([144, 60, 127], fn);

or a bit more conveniently an object of interpretive data of the form
`{channel, type, name, value}`:

    // Call fn on CH2 NOTEON events
	on({ channel: 2, type: 'noteon' }, fn);

    // Call fn on CH2 NOTEOFF C4 events
	on({ channel: 2, type: 'noteoff', name: 'C4' }, fn)

    // Call fn on CH2 NOTEON and NOTEOFF C4 events
	on({ channel: 2, type: 'note', name: 'C4' }, fn)

    // Call fn on CH4 CONTROL 1 0 events
	on({ channel: 4, type: 'control', name: 'modulation', value: 0 }, fn)

Note that these selector properties are progressive. A selector may not have
a `type` if it has no `channel`, it may not have a `name` without a `type`,
and may not have a `value` without a `name` property. Selectors pre-create
paths in a distribution tree that is optimised for incoming events to flow
through.

Finally, a selector may optionally have a property `port`, the id of an
input port.

    // Call fn on CH4 CC 64 events from port '0123'
	on({ port: '0123', 0: 179, 1: 64 }}, fn);

    // Call fn on CH4 CC 64 events from port '0123'
	on({ port: '0123', channel: 4, type: 'control', name: 64 }}, fn);

*/

const setSelectorRoute = overload(toSelectorType, {
    'array': function(selector, root, fn) {
        // Use selector as query
        setRoute(0, selector, root, fn);
    },

    'note': function(selector, root, fn) {
        var query = toNoteQuery(selector);

        query[0] = toStatus(selector.channel, 'noteon');
        setRoute(0, query, root, fn);

        query[0] = toStatus(selector.channel, 'noteoff');
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

    'undefined': function(selector, root, fn) {
        // Listen to everything on the given channel

        selector.type = 'note';
        setSelectorRoute(selector, root, fn);

        selector.type = 'control';
        setSelectorRoute(selector, root, fn);

        selector.type = 'pitch';
        setSelectorRoute(selector, root, fn);

        selector.type = 'polytouch';
        setSelectorRoute(selector, root, fn);

        selector.type = 'channeltouch';
        setSelectorRoute(selector, root, fn);

        selector.type = 'program';
        setSelectorRoute(selector, root, fn);
    },

    default: function(selector, root, fn) {
        var query = toQuery(selector);
        setRoute(0, query, root, fn);
    }
});

export function on(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = ports[id] || (ports[id] = {});
    setSelectorRoute(selector, root, fn);
}

/**
off(selector, fn)

Removes an event listener 'fn' from MIDI events matching object 'selector'. Where
'fn' is not given, removes all handlers from events matching the selector.

    off({ channel: 1, type: 'note' }, fn);
*/

const removeSelectorRoute = overload(toSelectorType, {
    'array': function(selector, root, fn) {
        removeRoute(selector, root, fn);
    },

    'note': function(selector, root, fn) {
        var query = toNoteQuery(selector);

        query[0] = toStatus(selector.channel, 'noteon');
        removeRoute(query, root, fn);

        query[0] = toStatus(selector.channel, 'noteoff');
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
        removeRoute(query, root, fn);
    },

    'control': function(selector, root, fn) {
        var query = toControlQuery(selector);
        removeRoute(query, root, fn);
    },

    'undefined': function(selector, root, fn) {
        // Otherwise, there being no message type, remove fn from
        // all types for this channel
        selector.type = 'note';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'control';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'pitch';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'polytouch';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'channeltouch';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'program';
        removeSelectorRoute(selector, root, fn);
    },

    default: function(selector, root, fn) {
        var query = toQuery(selector);
        removeRoute(query, root, fn);
    }
});

export function off(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = ports[id] || (ports[id] = {});
    removeSelectorRoute(selector, root, fn);
}

/**
trigger(port, message)

Simulates an incoming MIDI event and fires listeners with matching selectors.
Useful for debugging.

    trigger(null, [128, 69, 88]);
*/

/**
trigger(port, chan, type, name, value)

As `trigger(port, message)`, where the last 4 parameters are passed to
`createMessage()` to create the MIDI message before triggering.

    trigger(null, 1, 'noteon', 'A4', 0.75);
*/

const internalPort = {
    id: 'internal'
};

export const trigger = overload(toArgsLength, {
    1: fire,

	2: function(port, message) {
		const e = createEvent(performance.now(), port ? port : internalPort, message);
		fire(e);
	},

    default: function(port, chan, type, name, value) {
		const message = createMessage(chan, type, name, value);
		const e       = createEvent(performance.now(), port ? port : internalPort, message);
		fire(e);
	}
});
