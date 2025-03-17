
import Stream          from 'fn/stream/stream.js';
import { MIDIInputs }  from './ports.js';
import { overload, remove, toArgsLength } from './utils.js';
import { toStatus, toControlNumber, toNoteNumber } from './data.js';
import { createMessage, normalise }         from './message.js';
import { print, printGroup, printGroupEnd } from './print.js';


const A           = Array.prototype;
const assign      = Object.assign;
const create      = Object.create;
const performance = window.performance;


function listen(port) {
    // It's suggested here that we need to keep a reference to midi inputs
    // hanging around to avoid garbage collection:
    // https://code.google.com/p/chromium/issues/detail?id=163795#c123
    //store.push(port);
    port.onmidimessage = fire;
}

function unlisten(port) {
    // Free port up for garbage collection.
    //const i = store.indexOf(port);
    //if (i > -1) { store.splice(i, 1); }

    port.onmidimessage = null;
}

function listenToPorts(port) {
    if (DEBUG) print(port.type + ' ' + port.state, port.name);
    if (port.state === 'connected') listen(port)
    else unlisten(port);
}




// Incoming message routing

const ports = {};

function fire(e) {
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

function push(e, stream) {
    Stream.push(stream, e);
    return e;
}

function fireRoute(i, tree, e) {
	var name   = e.data[i++];
	var branch = tree[name];

	if (name === undefined) {
		branch && branch.reduce(push, e);
	}
	else {
		branch && fireRoute(i, branch, e);
		tree.undefined && tree.undefined.reduce(push, e);
	}
}

function getRoute(i, query, object) {
	var name   = query[i++];
	var branch = object[name];

	return name === undefined ?
		branch :
		branch && getRoute(i, query, branch) ;
}

function setRoute(i, query, object, stream) {
	var name   = query[i++];
	var branch = object[name];

	return name === undefined ?
		branch ? branch.push(stream) : (object[name] = [stream]) :
		setRoute(i, query, branch || (object[name] = {}), stream) ;
}

function removeRoute(query, root, stream) {
	var streams = getRoute(0, query, root);
	if (!streams) { return; }
	remove(streams, stream);
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

const setSelectorRoute = overload(toSelectorType, {
    'array': function(selector, root, stream) {
        // Use selector as query
        setRoute(0, selector, root, stream);
    },

    'note': function(selector, root, stream) {
        var query = toNoteQuery(selector);

        query[0] = toStatus(selector.channel, 'noteon');
        setRoute(0, query, root, stream);

        query[0] = toStatus(selector.channel, 'noteoff');
        setRoute(0, query, root, stream);
    },

    'noteon': function(selector, root, stream) {
        var query = toNoteQuery(selector);
        setRoute(0, query, root, stream);
    },

    'noteoff': function(selector, root, stream) {
        var query = toNoteQuery(selector);
        setRoute(0, query, root, stream);
    },

    'polytouch': function(selector, root, stream) {
        var query = toNoteQuery(selector);
        setRoute(0, query, root, stream);
    },

    'control': function(selector, root, stream) {
        const query = toControlQuery(selector);
        setRoute(0, query, root, stream);
    },

    'undefined': function(selector, root, stream) {
        // Listen to everything on the given channel

        selector.type = 'note';
        setSelectorRoute(selector, root, stream);

        selector.type = 'control';
        setSelectorRoute(selector, root, stream);

        selector.type = 'pitch';
        setSelectorRoute(selector, root, stream);

        selector.type = 'polytouch';
        setSelectorRoute(selector, root, stream);

        selector.type = 'channeltouch';
        setSelectorRoute(selector, root, stream);

        selector.type = 'program';
        setSelectorRoute(selector, root, stream);
    },

    default: function(selector, root, stream) {
        var query = toQuery(selector);
        setRoute(0, query, root, stream);
    }
});

const removeSelectorRoute = overload(toSelectorType, {
    'array': function(selector, root, stream) {
        removeRoute(selector, root, stream);
    },

    'note': function(selector, root, stream) {
        var query = toNoteQuery(selector);

        query[0] = toStatus(selector.channel, 'noteon');
        removeRoute(query, root, stream);

        query[0] = toStatus(selector.channel, 'noteoff');
        removeRoute(query, root, stream);
    },

    'noteon': function(selector, root, stream) {
        var query = toNoteQuery(selector);
        removeRoute(query, root, stream);
    },

    'noteoff': function(selector, root, stream) {
        var query = toNoteQuery(selector);
        removeRoute(query, root, stream);
    },

    'polytouch': function(selector, root, stream) {
        var query = toNoteQuery(selector);
        removeRoute(query, root, stream);
    },

    'control': function(selector, root, stream) {
        var query = toControlQuery(selector);
        removeRoute(query, root, stream);
    },

    'undefined': function(selector, root, stream) {
        // Otherwise, there being no message type, remove stream from
        // all types for this channel
        selector.type = 'note';
        removeSelectorRoute(selector, root, stream);

        selector.type = 'control';
        removeSelectorRoute(selector, root, stream);

        selector.type = 'pitch';
        removeSelectorRoute(selector, root, stream);

        selector.type = 'polytouch';
        removeSelectorRoute(selector, root, stream);

        selector.type = 'channeltouch';
        removeSelectorRoute(selector, root, stream);

        selector.type = 'program';
        removeSelectorRoute(selector, root, stream);
    },

    default: function(selector, root, stream) {
        var query = toQuery(selector);
        removeRoute(query, root, stream);
    }
});


/**
MIDIEvents(selector)

Registers a handler `stream` for incoming MIDI events that match object
`selector`. A selector is either an array (or array-like) in the form of a MIDI
message `[status, data1, data2]`:

```js
// Create stream of CH1 NOTEON events
events([144]);

// Create stream of CH1 NOTEON C4 events
events([144, 60], stream);

// Create stream of CH1 NOTEON C4 127 events
events([144, 60, 127], stream);
```

or a bit more conveniently an object of interpretive data of the form
`{channel, type, name, value}`:

```js
// Create stream of CH2 NOTEON events
events({ channel: 2, type: 'noteon' }, stream);

// Create stream of CH2 NOTEOFF C4 events
events({ channel: 2, type: 'noteoff', name: 'C4' }, stream)

// Create stream of CH2 NOTEON and NOTEOFF C4 events
events({ channel: 2, type: 'note', name: 'C4' }, stream)

// Create stream of CH4 CONTROL 1 0 events
events({ channel: 4, type: 'control', name: 'modulation', value: 0 }, stream)
```

Note that these selector properties are progressive. A selector may not have
a `type` if it has no `channel`, it may not have a `name` without a `type`,
and may not have a `value` without a `name` property. Selectors pre-create
paths in a distribution tree that is optimised for incoming events to flow
through.

Finally, a selector may optionally have a property `port`, the id of an
input port.

```js
// Create stream of CH4 CC 64 events from port '0123'
events({ port: '0123', 0: 179, 1: 64 }}, stream);

// Create stream of CH4 CC 64 events from port '0123'
events({ port: '0123', channel: 4, type: 'control', name: 64 }}, stream);
```
**/

let init = 0;

function MIDIEvents(selector = {}) {
    this.selector = selector;
}

MIDIEvents.prototype = assign(create(Stream.prototype), {
    start: function() {
        const selector = this.selector;
        const id   = selector.port || 'undefined';
        const root = ports[id] || (ports[id] = {});

        // Connect stream to output
        setSelectorRoute(this.selector, root, this);
        if (!init++) MIDIInputs.each(listenToPorts);
        return this;
    },

    stop: function() {
        const selector = this.selector;
        const id   = selector.port || 'undefined';
        const root = ports[id] || (ports[id] = {});

        removeSelectorRoute(this.selector, root, this);
        return Stream.stop(this);
    }
});

export default function MIDI(selector) {
    return new MIDIEvents(selector);
}
