# MIDI

MIDI is library of functions for routing and transforming MIDI data, and an
interface for the browser's native navigator.requestMIDIAccess().


## Warning

Currently only Chrome Canary has native MIDI support. MIDI also requires DOM
Promises or a suitable polyfill to be enabled. Also, early days, and this API
will change.


## Easily set up a MIDI route

Listen to incoming volume change messages on Port 1. Flatten their values, log
them to the console and send them to IAC 1.

    var route = MIDI();
    
    route
    .input('Port 1')
    .filter({ channel: 1, message: 'cc', data1: 7 })
    .modify({ data2: 80 })
    .out(function(e) { console.log(e); })
    .output('IAC 1');


## MIDI nodes

### MIDI.Input

A constructor that creates an input node.

    var input = MIDI.Input('Port 1');


### MIDI.Output

A constructor that creates an output node.

    var input = MIDI.Output('Port 1');


## MIDI helper functions


### .channel(data)

Returns the MIDI channel of the data as a number 1-16.

    MIDI.channel([145,80,20]);            // 2


### .message(data)

Returns message name of the data.

    MIDI.message([145,80,20])             // 'noteon'


### .normaliseNote(data)

Many keyboards transmit <code>noteon</code> with velocity 0 rather than
<code>noteoff</code>s. <code>normaliseNote</code> converts <code>noteon</code>
messages with velocity 0 to <code>noteoff</code> messages. A new array is
not created – the existing array is modified and returned.

    MIDI.normaliseNote([145,80,0]);       // [129,80,0]


### .pitchToFloat(data, range)

Returns the pitch bend value in semitones. Range is the bend range up or down,
in semitones. Where range is not given it defaults to <code>2</code>.

    MIDI.pitchToFloat([xxx,xx,xxx], 2);  // -1.625


### .numberToNote(n)

Given a note number between 0 and 127, returns a note name as a string.

    MIDI.numberToNote(66);                // 'F♯'


### .numberToOctave(n)

Given a note number between 0 and 127, returns the octave the note is in as a number. 

    MIDI.numberToNote(66);                // 3


### .numberToFrequency(n)

Given a note number between 0 and 127, returns the frequency of the fundamental tone.

    MIDI.numberToFrequency(66);           // 

