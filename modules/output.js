
import noop            from 'fn/noop.js';
import overload        from 'fn/overload.js';
//import { MIDIOutputs } from './ports.js';
import { createMessage } from './message.js';

const assign = Object.assign;

function MIDIOutput(port, channel = 1, fn = noop) {
    this.port    = port;
    this.channel = channel;
    this.fn      = fn;
}

assign(MIDIOutput.prototype, {
    push: function(event) {
        if (!this.port) return;

        const time = event[0] || performance.now();
        const type = event[1];

        if (type === 'start') {
            const message = createMessage(this.channel, 'noteon',  event[2], event[3]);
            this.port.send(message, time);
            this.fn(message);
            return;
        }

        if (type === 'stop') {
            const message = createMessage(this.channel, 'noteoff',  event[2], event[3]);
            this.port.send(message, time);
            this.fn(message);
            return;
        }

        if (type === 'note') {
            const message1 = createMessage(this.channel, 'noteon',  event[2], event[3]);
            const message2 = createMessage(this.channel, 'noteoff', event[2], event[3]);
            this.port.send(message1, time);
            this.port.send(message2, time + 1000 * event[4]);
            this.fn(message1);
            this.fn(message2);
            return;
        }

        if (type === 'param') {
            const name = event[2];
            if (name === 'pitch') {
                const message = createMessage(this.channel, 'pitch', event[3]);
                this.port.send(message, time);
                this.fn(message);
                return;
            }

            if (name === 'force') {
                const message = createMessage(this.channel, 'channeltouch', event[3]);
                this.port.send(message, time);
                this.fn(message);
                return;
            }

            const message = createMessage(this.channel, 'control', event[2], event[3]);
            this.port.send(message, time);
            this.fn(message);
            return;
        }

        console.warn('Attempt to send "' + type + '" event to MIDIOut – event type not translateable to MIDI');
    },

    stop: function() {
        this.midi && this.midi.removeEventListener('statechange', this);
        return stop(this);
    }
});

export default function MIDIOut(selector, debugFn) {
    return new MIDIOutput(selector.port, selector.channel, debugFn);
}
