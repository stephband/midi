# MIDI

MIDI is library of functions for routing and transforming browser MIDI events.

Note! Currently only Chrome has native MIDI support, and then only behind a flag.
If you're in Chrome, switch on Web MIDI at
<a href="chrome://flags/#enable-web-midi">chrome://flags/#enable-web-midi</a>.

## MIDI properties

### .request

A promise. Where MIDI is supported, the library requests access to the browser's
midi API as soon as it loads. <code>MIDI.request</code> is the promise returned
by <code>navigator.requestMIDIAcess()</code>. Where MIDI is not supported,
<code>MIDI.request</code> is a promise immediately put into rejected state.

    MIDI.request.then(function(midi) {
        // Do something with midi object
    });

## MIDI functions

### .on(fn)

Registers a handler <code>fn</code> for all incoming browser MIDI events.

    MIDI.on(function(data, time, port) {
        // Called for all incoming MIDI events.
    });

### .on(query, fn)

Registers a handler <code>fn</code> for browser MIDI events. The handler is
called for incoming events that match <code>query</code>. A query can be
expressed as a data array:

    MIDI.on([145, 80], function(data, time, port) {
        // Called for Channel 2, NoteOn A4 messages.
    });

    MIDI.on([180, 1, 0], function(data, time, port) {
        // Called for Channel 5, Control Change 1 messages with value 0.
    });

A query can alternatively be expressed as an object:

    MIDI.on({ channel: 1, message: 'control' }, function(data, time, port) {
        // Called for all incoming MIDI Control Change
        // messages on channel 1.
    });

    MIDI.on({ message: 'control', data1: 7 }, function(data, time, port) {
        // Called for all incoming MIDI Control Change 7
        // messages on all channels.
    });

Query objects can have one or more of the properties:

    {
        port:    // Not curently implemented
        channel: // number 1–16
        message: // string 'note', 'noteon', 'noteoff', 'control', 'pc', 'pitch', 'polytouch', 'channeltouch'
        data1:   // number 0-127
                 // string note name, eg. 'C#3'
        data2:   // number 0-127
    }

### .on(query, fn, args ... )

Function parameters passed into <code>.on()</code> following <code>fn</code> are
passed to the handler as extra arguments. Use this to pass data to handlers:

    function handler(data, time, port, data) {
        var bing = data.bing;    // 'bong'
    }
    
    MIDI.on([180, 1, 0], handler, { bing: 'bong' });

### .off(query, fn)

Removes an event handler from all MIDI events matching the query. If
<code>fn</code> is not given, removes all handlers from events matching the
query. If <code>query</code> is not given, removes the handler from all events.


### .normaliseEvent(e)<br/>.normaliseEvent(e, timeOffset)

Takes a DOM MIDI event object and returns a
<a href="https://github.com/sound-io/music-json-spec">Music JSON</a> formatted
event array. Music JSON events have the form:

    [timestamp, duration, type, data ... ]

The timestamp is <code>e.receivedTime</code>, or where <code>timeOffset</code>
is given, <code>e.receivedTime - timeOffset</code>. Duration is 0. Pitch bend
data is normalised to floats representing semitones, and note velocities and
aftertouch data is normalised to the range 0-1. So for example:

    // If e is { receivedTime: 1234, data: [145,80,20], ... }
    MIDI.normaliseEvent(e);     // [1234, 0, 'noteon', 80, 0.15748032]

    // If e is { receivedTime: 1234, data: [180,1,127], ... }
    MIDI.normaliseEvent(e);     // [1234, 0, 'control', 1, 1]

    // If e is { receivedTime: 1234, data: [231,62,119], ... }
    MIDI.normaliseEvent(e);     // [1234, 0, "pitch", 1.73409840]

    // If e is { receivedTime: 1234, data: [168,62,119], ... }
    MIDI.normaliseEvent(e);     // [1234, 0, "aftertouch", 62, 0.93700787]

### .isNote(data)

    MIDI.isNote([145,80,20]);             // true

### .isPitch(data)

    MIDI.isPitch([145,80,20]);            // false

### .isControl(data)

    MIDI.isControl([145,80,20]);          // false

### .toChannel(data)

Returns the MIDI channel of the data as a number 1-16.

    MIDI.channel([145,80,20]);            // 2

### .toMessage(data)

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

MIDI uses unicode symbols for accidentals <code>♭</code> and <code>♯</code>.

### .numberToOctave(n)

Given a note number between 0 and 127, returns the octave the note is in as a number. 

    MIDI.numberToOctave(66);              // 3

### .numberToFrequency(n)<br/>.numberToFrequency(n, reference)

Given a note number <code>n</code>, returns the frequency of the fundamental tone of that note.

    MIDI.numberToFrequency(57);           // 440

The reference tuning is A = 440Hz by default. Pass in a value <code>reference</code> to use a
different tuning.

    MIDI.numberToFrequency(57, 442);      // 442

### .frequencyToNumber(f)<br/>.frequencyToNumber(f, reference)

NOT IMPLEMENTED

Given a frequency <code>f</code>, returns the note number whose fundamental
harmonic corresponds to that frequency.

    MIDI.frequencyToNumber(440);          // 57

The reference tuning is A = 440Hz by default. Pass in a value <code>reference</code> to use a
different tuning.
