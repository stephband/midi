
import noop   from 'fn/noop.js';
import Stream from 'fn/stream/stream.js';

const assign = Object.assign;

let promise;

function request(options) {
    if (promise) return promise;

    // Cache the request so there's only ever one
    return promise || (promise = navigator.requestMIDIAccess ?
        navigator
        .requestMIDIAccess(options)
        .then((midi) => {
            if (midi.onstatechange) {
                // Check we are not overriding onstatechange. We have to do this
                // because Chrome does not send anything to midi.addEventListener(),
                // so we can't use that to attach multiple listeners
                throw new Error('midi.onstatechange may only be assigned once (Chrome bug)')
            }

            midi.onstatechange = statechange;
            return midi;
        }) :
        Promise.reject("Browser does not support the WebMIDI API.")
    );
}

function statechange(e) {
    const port = e.port;
    if (port.type === 'input')  return Stream.push(MIDIInputs, port);
    if (port.type === 'output') return Stream.push(MIDIOutputs, port);
}


/**
MIDIInputs
A stream of MIDI input ports. A port is pushed into the stream whenever its
connection state changes.
**/

/**
MIDIOutputs
A stream of MIDI output ports. A port is pushed into the stream whenever its
connection state changes.
**/

class MIDIPorts extends Stream {
    constructor(type) {
        super();
        this.type = type;
    }

    start() {
        request().then((midi) => {
            let entry;
            for (entry of midi[this.type + 's']) {
                //console.log(entry[0], entry[1].name);
                Stream.push(this, entry[1]);
            }
        });
    }

    stop() {}
}

export const MIDIInputs  = new MIDIPorts('input');
export const MIDIOutputs = new MIDIPorts('output');
