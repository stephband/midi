# MIDI

MIDI is a hub for receiving, sending and filtering browser MIDI messages, and a
library of functions for manipulating them.

The MIDI library aims to make it easy to attach physical instruments and
controllers to web apps. As of June 2015 Chrome has native MIDI support. Joy!
No other browser yet do.

## MIDI properties

### .request

A promise. Where MIDI is supported, the library requests access to the browser's
midi API as soon as it loads. <code>MIDI.request</code> is the promise returned
by <code>navigator.requestMIDIAcess()</code>, or where MIDI is not supported,
<code>MIDI.request</code> is a rejected promise.

    MIDI.request
    .then(function(midi) {
        // Do something with midi object
    })
    .catch(function(error) {
        // Alert the user they don't have MIDI
    });

Note that using the MIDI library you don't really need to touch the midi object.
MIDI functions are available before the promise is resolved. For example,
calling <code>MIDI.on(query, fn)</code> before this time will bind to incoming
MIDI events when <code>MIDI.request</code> is resolved.

## MIDI functions
MIDI
### .on(fn)

Registers a handler <code>fn</code> for all incoming MIDI events.

    MIDI.on(function(data, time, port) {
        // Called for all incoming MIDI events.
    });

### .on(query, fn)

Registers a handler <code>fn</code> for incoming MIDI events that match
<code>query</code>. A query can be expressed as a data array:

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
        channel: // number 1–16
        message: // string 'note', 'noteon', 'noteoff', 'control', 'pc', 'pitch', 'polytouch', 'channeltouch'
                 // regexp, eg. /^note|^pitch/
        data1:   // number 0-127
                 // string note name, eg. 'C#3'
        data2:   // number 0-127
    }

Note that in order to optimise the speed of processing incoming MIDI events,
filter queries are pre-sorted at the point of calling <code>.on()</code> and a
listener tree is constructed. Incoming events are simply matched against the
tree with a couple of lookups (very fast). This avoids filtering every incoming
event against all queries (potentially slow) – but it also means that queries
are not dynamic. Changing the values in a query after it has been passed to
<code>.on()</code> will not alter the MIDI events that trigger <code>fn</code>.

### .on(query, fn, args ... )

Function parameters passed into <code>.on()</code> following <code>fn</code> are
passed to the handler as extra arguments. Use this to pass data to handlers:

    function handler(data, time, port, data) {
        var bing = data.bing;    // 'bong'
    }
    
    MIDI.on([180, 1, 0], handler, { bing: 'bong' });

### .once(query, fn)

Calls a handler <code>fn</code> once, on the next incoming MIDI event to match
<code>query</code>. <code>.once()</code> can be used to implement a MIDI learn
function:

    function learnController(fn) {
        // Listen for next incoming MIDI controller message
        MIDI.once({ message: "control" }, function(message, time) {
            var query = message.splice();

            // Call the fn
            fn.apply(this, arguments);

            // Bind the fn to all values for this controller
            query.length = 2;
            MIDI.on(query, fn);
        };
    }

### .off(query, fn)

Removes an event handler from all MIDI events matching the query. If
<code>fn</code> is not given, removes all handlers from events matching the
query. If <code>query</code> is not given, removes the handler from all events.

### .normalise(message, time)

Takes a MIDI message array and returns a
<a href="https://github.com/sound-io/music-json-spec">Music JSON</a> event
array. Music JSON events have the form:

    [timestamp, type, data ... ]

For MIDI events <code>duration</code> is 0. Note velocity, controller data and
aftertouch data are normalised as floats in the range 0-1, while pitch bend data is
normalised to floats representing semitones. For example:

    MIDI.normalise([145,80,20], 1);    // [1, 'noteon', 80, 0.15748032]
    MIDI.normalise([180,1,127], 2);    // [2, 'control', 1, 1]
    MIDI.normalise([231,62,119], 3);   // [3, "pitch", 1.73409840]
    MIDI.normalise([168,62,119], 4);   // [4, "aftertouch", 62, 0.93700787]

### .normaliseEvent(e)

Takes a DOM MIDI event object and returns a
<a href="https://github.com/sound-io/music-json-spec">Music JSON</a> normalised
event array. Equivalent to:

    MIDI.normalise(e.data, e.receivedTime);

### .isNote(message)

    MIDI.isNote([145,80,20]);             // true

### .isPitch(message)

    MIDI.isPitch([145,80,20]);            // false

### .isControl(message)

    MIDI.isControl([145,80,20]);          // false

### .toChannel(message)

Returns the MIDI channel of the message as a number 1-16.

    MIDI.toChannel([145,80,20]);            // 2

### .toType(message)

Returns type of message.

    MIDI.toType([145,80,20])             // 'noteon'

### .normaliseNote(data)

Many keyboards transmit <code>noteon</code> with velocity 0 rather than
<code>noteoff</code>s. <code>normaliseNote</code> converts <code>noteon</code>
messages with velocity 0 to <code>noteoff</code> messages. A new array is
not created – the existing array is modified and returned.

    MIDI.normaliseNote([145,80,0]);       // [129,80,0]

### .pitchToFloat(message, range)

Returns the pitch bend value in semitones. Range is the bend range up or down,
in semitones. Where range is not given it defaults to <code>2</code>.

    MIDI.pitchToFloat([xxx,xx,xxx], 2);  // -1.625

### .numberToNote(n)

Given a note number between 0 and 127, returns a note name as a string.

    MIDI.numberToNote(66);                // 'F♯4'

MIDI uses unicode symbols for accidentals <code>♭</code> and <code>♯</code>.

### .numberToOctave(n)

Given a note number between 0 and 127, returns the octave the note is in as a number. 

    MIDI.numberToOctave(66);              // 4

### .numberToFrequency(n)

Given a note number <code>n</code>, returns the frequency of the fundamental tone of that note.

    MIDI.numberToFrequency(69);           // 440
    MIDI.numberToFrequency(60);           // 261.625565

The reference tuning is A4 = 440Hz by default. Pass in a second parameter
<code>tuning</code> to use a different tuning for A4.

    MIDI.numberToFrequency(69, 442);      // 442
    MIDI.numberToFrequency(60, 442);      // 262.814772

### .frequencyToNumber(f)

Given a frequency <code>f</code>, returns the note number whose fundamental
harmonic corresponds to that frequency.

    MIDI.frequencyToNumber(440);          // 69
    MIDI.frequencyToNumber(200);          // 55.349958

The reference tuning is A4 = 440Hz by default. Pass in a second parameter
<code>tuning</code> to use a different tuning.

    MIDI.frequencyToNumber(440, 442);     // 68.921486

Results of <code>.frequencyToNumber</code> are rounded to six decimal places
to help avoid floating point errors and return whole semitones where intended.

### .typeToNumber(channel, type)

Given a <code>channel</code> and <code>type</code>, returns the MIDI message number.

    MIDI.typeToNumber(1, 'noteon');       // 144


### .noteNames

An array of note names. Must have length <code>12</code> and contain one name
for each degree of the chromatic scale starting with C.

### .tuning

The frequency value of A4 that is used in converting MIDI numbers
to frequency values and vice versa. It is <code>440</code> by default.
