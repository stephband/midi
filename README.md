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
<code>MIDI.request</code> is a promise in rejected state.

    MIDI.request.then(function(midi) {
        // Do something with midi object
    });

## MIDI functions

### .on(query, fn)

Registers an event handler for MIDI events that match <code>query</code>. A
query can be expressed as an object:

    MIDI.on({ channel: 1, message: 'cc' }, function(e) {
        // Called for all incoming MIDI Control Change
        // messages on channel 1.
    });

    MIDI.on({ message: 'cc', data1: 7 }, function(e) {
        // Called for all incoming MIDI Control Change 7
        // messages on all channels.
    });

A query can alternatively be expressed as a MIDI message data array:

    MIDI.on([145, 80], function(e) {
        // Called for incoming MIDI NoteOn A4 messages on
        // channel 2.
    });

    MIDI.on([180, 1, 0], function(e) {
        // Called for MIDI Channel 5, Control Change 1 messages
        // with value 0.
    });

Where a query is not given, the handler is registered to all MIDI events.

    MIDI.on(function(e) {
        // Called for all incoming MIDI events.
    });

A query object has the optional properties:

    {
        port:    // Not curently implemented
        channel: // number 1–16
        message: // string 'note', 'noteon', 'noteoff', 'cc', 'pc', 'pitch', 'polytouch', 'channeltouch'
        data1:   // number 0-127
                 // string note name, eg. 'C#3'
        data2:   // number 0-127
    }

### .off(query, fn)

Removes an event handler from all MIDI events matching the query. If
<code>fn</code> is not given, removes all handlers from events matching the
query. If <code>query</code> is not given, removes the handler from all events.


### .eventToData(e)

Takes a MIDI event object and returns an array formatted as a
<a href="https://github.com/sound-io/music-json-spec">Music JSON</a> event:

    [timestamp, duration, type, data ... ]

The timestamp is read from <code>e.receivedTime</code>. Duration is 0.
Pitch bend data is normalised to semitones, and note velocities and
aftertouch data is normalised to the range 0-1. Some examples:

    // For event object e -
    // { receivedTime: 1234, data: [145,80,20], ... }
    
    MIDI.eventToData(e);     // [1234, 0, 'noteon', 80, 0.157480315]

    // For event object e -
    // { receivedTime: 1234, data: [180, 1, 127], ... }
    
    MIDI.eventToData(e);     // [1234, 0, 'control', 1, 1]

    // For event object e -
    // { receivedTime: 1234, data: [231, 62, 119], ... }
    
    MIDI.eventToData(e);     // [1234, 0, 'pitch', 1.26458903]

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

### .numberToOctave(n)

Given a note number between 0 and 127, returns the octave the note is in as a number. 

    MIDI.numberToOctave(66);              // 3

### .numberToFrequency(n)

Given a note number between 0 and 127, returns the frequency of the fundamental tone of that note.

    MIDI.numberToFrequency(66);           // 

The reference tuning is A = 440Hz by default. Change the tuning by assigning MIDI.pitch.

    MIDI.pitch = 442;

### .noop()

A function that does nothing.
