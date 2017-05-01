# MIDI

MIDI is a library for receiving, sending and manipulating browser MIDI messages.


## MIDI()

Creates a stream of MIDI event objects:

    var midi = MIDI();

The first parameter to the constructor can be a query that filters the events
entering the stream. A query is either an array in the form of a MIDI message,
(`[status, data1, data2]`), or an array where the first two members describe
the status (`[channel, type, data1, data2]`). A shorter query of the same form
provides a broader filter. Here are some examples.

    MIDI([176, 7, 0])          // CH1, CC7, value 0
    MIDI([1, 'control', 7, 0]) // CH1, CC7, value 0

    MIDI([144, 60])            // CH1, NOTEON, C3
    MIDI([1, 'noteon', 60])    // CH1, NOTEON, C3
    MIDI([1, 'noteon', 'C3'])  // CH1, NOTEON, C3

    MIDI([144])                // CH1, NOTEON, all notes
    MIDI([1, 'noteon'])        // CH1, NOTEON, all notes

A MIDI stream can capture both 'noteon' and 'noteoff' messages with the
shorthand type `'note'`:

    MIDI([1, 'note'])          // Channel 1, NOTEON and NOTEOFF, all notes

A MIDI stream inherits map, filter and consumption methods from
<a href="//github.com/stephband/Fn">`Stream`</a>.

    MIDI([1, 'noteon']).map(mapFn).each(outFn);

A stream can be stopped with the `stop()` method.

	var midi = MIDI([1, 'noteon']).map(mapFn).each(outFn);

	// Sometime later...
	midi.stop();


## MIDI functions

### .on(query, fn)

Registers a handler `fn` for incoming MIDI events that match `query`. See the
`MIDI()` constructor above for a description of queries.

### .off(query, fn)

Removes an event handler `fn` from MIDI events matching the query. Where
`fn` is not given, removes all handlers from events matching the query.

//### .normalise(message, time)
//
//Takes a MIDI message array and returns a
//<a href="https://github.com/sound-io/music-json-spec">Music JSON</a> event
//array. Music JSON events have the form:
//
//    [timestamp, type, data ... ]
//
//Note velocity, controller data and aftertouch data are normalised as floats in
//the range 0-1, while pitch bend data is normalised to floats representing
//semitones. For example:
//
//    MIDI.normalise([145,80,20], 1);    // [1, 'noteon', 80, 0.15748032]
//    MIDI.normalise([180,1,127], 2);    // [2, 'control', 1, 1]
//    MIDI.normalise([231,62,119], 3);   // [3, "pitch", 1.73409840]
//    MIDI.normalise([168,62,119], 4);   // [4, "aftertouch", 62, 0.93700787]

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
