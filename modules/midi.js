
import { remove } from '../../fn/fn.js';

const DEBUG = true;
const store = [];

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

let promise;

export function request() {
	// Cache the request so there's only ever one
	return promise || (promise = navigator.requestMIDIAccess ?
		navigator
		.requestMIDIAccess()
		.then(function(midi) {
			if (DEBUG) { console.group('%cMIDI: %cports', 'color: #d8a012; font-weight: bold;', 'color: inherit; font-weight: 300'); }
			if (DEBUG) { window.midi = midi; }
			setupPorts(midi);
			if (DEBUG) { console.groupEnd(); }
			return midi;
		})
		.catch(function(e) {
			console.log('MIDI access denied.', e);
		}) :
		Promise
		.reject("This browser does not support Web MIDI.")
		.catch(function(e) {
			console.log(e);
		})
	);
}

/*
transmit(e)

Send a MIDI event.
*/

export let transmit = function send() {};

function createSendFn(outputs, tree) {
	return function send(portName, data, time) {
		var port = this.output(portName);

		if (port) {
			port.send(data, time || 0);
		}
		else {
			console.warn('MIDI: .send() output port not found:', port);
		}

		return this;
	};
}


// Handle connections

function listen(port) {
	// It's suggested here that we need to keep a reference to midi inputs
	// hanging around to avoid garbage collection:
	// https://code.google.com/p/chromium/issues/detail?id=163795#c123
	store.push(port);
	port.onmidimessage = function(e) {

	};
}

function unlisten(port) {
	remove(store, port);
	port.onmidimessage = null;
}



function createPortFn(ports) {
	return function getPort(id) {
		var port;

		if (typeof id === 'string') {
			for (port of ports) {
				if (port[1].name === id) { return port[1]; }
			}
		}
		else {
			for (port of ports) {
				if (port[0] === id) { return port[1]; }
			}
		}
	};
}

var MIDI = {};

function updateOutputs(midi) {
	var arr;

	if (!MIDI.outputs) { MIDI.outputs = []; }

	MIDI.outputs.length = 0;

	for (arr of midi.outputs) {
		var id = arr[0];
		var output = arr[1];
		console.log('MIDI: Output detected:', output.name, output.id);
		// Store outputs
		MIDI.outputs.push(output);
	}

	MIDI.output = createPortFn(midi.outputs);
	transmit = createSendFn(midi.outputs, outputs);
}

function statechange(e) {
	var port = e.port;

	if (port.state === 'connected') {
		listen(port);
	}
	else if (port.state === 'disconnected') {
		unlisten(port);
	}
}

function setupPorts(midi) {
	var entry, port;

	for (entry of midi.inputs) {
		port = entry[1];
		console.log('MIDI: Input detected:', port.name, port.id, port.state);
		listen(port);
	}

	for (entry of midi.outputs) {
		port = entry[1];
		console.log('MIDI: Output detected:', port.name, port.id, port.state);
	}

	midi.onstatechange = statechange;
}
