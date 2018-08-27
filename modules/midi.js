
import { overload, remove, toArgsLength } from './utils.js';
import { print, printGroup, printGroupEnd } from './print.js';
import { fire } from './events.js';

const DEBUG = true;
const empty = new Map();

let midi = {
    inputs: empty,
    outputs: empty
};

/*
inputs()

Returns a map of MIDI input ports from the underlying MIDIAccess object, keyed
by port id.
*/

export function inputs() {
    return midi.inputs;
}

/*
getInput(id)

Returns an input port by id.
*/

export function getInput(id) {
    return midi.inputs.get(id);
}

/*
outputs()

Returns a map of MIDI output ports from the underlying MIDIAccess object, keyed
by port id.
*/

export function outputs() {
    return midi.outputs;
}

/*
getOutput(id)

Returns an output port by id.
*/

export function getOutput(id) {
    return midi.outputs.get(id);
}

/*
request()

A shortcut for `navigator.requestMIDIAcess()`. Where MIDI is supported, requests
access to the browser's midi API, returning a promise, or where MIDI is not
supported, returns a rejected promise.

    request()
    .catch(function(error) {
        // Alert the user they don't have MIDI
    })
    .then(function(midi) {
        // Do something with midi object
    });

Note that using the `MIDI` library you don't really need to touch the browser's
lower-level `midi` object. MIDI functions and methods are available before the
promise is resolved. For example, calling `on(query, fn)` will bind to
incoming MIDI events when `request()` is resolved.
*/

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

function setup(midi) {
	var entry, port;

	for (entry of midi.inputs) {
		port = entry[1];

        if (DEBUG) { print(port.type + ' ' + port.state, port); }

        if (port.state === 'connected') {
            listen(port);
        }
	}

	for (entry of midi.outputs) {
		port = entry[1];
        if (DEBUG) { print(port.type + ' ' + port.state, port); }
	}
}

function statechange(e) {
	var port = e.port;

    if (DEBUG) { print(port.type + ' ' + port.state, port); }

    if (port.type === 'input') {
        if (port.state === 'connected') {
            listen(port);
        }
        else {
            unlisten(port);
        }
    }
}

let promise;

export function request() {
	// Cache the request so there's only ever one
	return promise || (promise = navigator.requestMIDIAccess ?
		navigator
		.requestMIDIAccess()
		.then(function(midiAccess) {
            if (DEBUG) { printGroup('initialise MIDI access'); }

            midi = midiAccess;
            setup(midi);
            midi.onstatechange = statechange;

			if (DEBUG) { printGroupEnd(); }
			return midi;
		}, function(e) {
            print('access denied');
		}) :
		Promise.reject("This browser does not support Web MIDI.")
	);
}

function findOutputPort(string) {
    string = string.toLowercase();

    // At this point, string is not an id of a port nor an actual port.
    // We're going to try and find it by name
    let entry;
    for (entry of midi.outputs) {
        let port = entry[1];
        let name = port.name && port.name.toLowercase();

        if (name.startsWith(string)) {
            return port;
        }
    }

    for (entry of midi.outputs) {
        let port = entry[1];
        let manu = port.manufacturer && port.manufacturer.toLowercase();

        if (manu.startsWith(string)) {
            return port;
        }
    }
}

/*
send(event)

Where `event` is an object with three properties, `target` (a MIDI output port),
`timeStamp` (a DOM time), and `data` (a MIDI message), cues the message
to be sent to the port. If `timeStamp` is in the past the message is sent
immediately.

    send({
        target:    port,
        timeStamp: 2400.56,
        data:      [144, 69, 96]
    });

Event objects can be constructed (from a pool) using `createEvent()`.
*/

export function sendEvent(e) {
    // Spec example:
    // https://webaudio.github.io/web-midi-api/#sending-midi-messages-to-an-output-device
    e.target.send(e.data, e.timeStamp);
}

/*
send(time, port, message)

Cues `message` to be sent to `port` at `time`. Where `time` is in the past
the message is sent immediately. `port` may be a MIDI output port or the
id of a MIDI output port.

    send(0, 'id', [144, 69, 96]);
*/

export function sendMessage(time, port, message) {
    if (typeof port === 'string') {
        port = midi.inputs.get(port) || findOutputPort(port);

        if (!port) {
            print('Output port not found', port);
        }
    }

    port.send(message, time);
}

/*
send(time, port, chan, type, param, value)

As `send(time, port, message)`, but the last 4 parameters are passed to
`createMessage()` to create the MIDI message before sending.

    send(0, 'id', 1, 'noteon', 'A4', 0.75);
*/

function sendParams(time, port, chan, type, param, value) {
    const message = createMessage(chan, type, param, value);
    return sendMessage(time, port, message);
}

export const send = overload(toArgsLength, {
    1: sendEvent,
    3: sendMessage,
    default: sendParams
});
