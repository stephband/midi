
import nothing from 'fn/nothing.js';
import noop    from 'fn/noop.js';
import remove  from 'fn/remove.js';
import Stream  from 'fn/stream/stream.js';
import { log, logGroup, logGroupEnd } from './log.js';

const assign = Object.assign;
const inputs = [];
const output = [];

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

    // statechange fires when port.state OR port.connection changes, however
    // port.connection only changes to open when we start reading from a port
    // via onmidimessage. We want to ignore that change here, and only track
    // port.state, so cache last state and check changes against cache.
    if (port.state === port._state) return;
    port._state = port.state;

    if (DEBUG) log('port statechange ' + port.state, port.name);

    if (port.state === 'connected') {
        // Push port to inputs or outputs
        const streams =
            port.type === 'input' ? inputs :
            port.type === 'output' ? outputs :
            nothing ;

        let n = -1;
        while (streams[++n]) Stream.push(streams[n], port);
    }
}


/**
MIDIInputs()
Creates a stream of MIDI input ports. A port is streamed whenever its `.state`
is `'connected'` and its `.connection` is `'open'`.
**/

export class MIDIInputs extends Stream {
    start() {
        request().then((midi) => {
            // In case stream was stopped before promise resolved
            if (this.status === 'done') return;

            // Push connected MIDI ports
            let id, port;
            for ([id, port] of midi.inputs) {
                // Cache state so statechange does not push port to MIDIInputs
                // when port.connection changes
                port._state = port.state;
                if (port.state === 'connected') {
                    Stream.push(this, port);
                }
            }

            inputs.push(this);
        });

        return super.start();
    }

    stop() {
        remove(inputs, this);
        return super.stop();
    }
}

/**
MIDIOutputs()
Creates a stream of MIDI output ports. A port is streamed whenever its `.state`
is `'connected'` and its `.connection` is `'open'`.
**/

export class MIDIOutputs extends Stream {
    start() {
        request().then((midi) => {
            // In case stream was stopped before promise resolved
            if (this.status === 'done') return;

            // Push connected MIDI ports
            let id, port;
            for ([id, port] of midi.outputs) {
                // Cache state so statechange does not push port to MIDIInputs
                // when port.connection changes
                port._state = port.state;
                if (port.state === 'connected') {
                    Stream.push(this, port);
                }
            }

            outputs.push(this);
        });

        return super.start();
    }

    stop() {
        remove(outputs, this);
        return super.stop();
    }
}
