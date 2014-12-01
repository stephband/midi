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

### .isNote(data)

    MIDI.isNote([145,80,20]);             // true

### .isPitch(data)

    MIDI.isPitch([145,80,20]);            // false

### .isControl(data)

    MIDI.isControl([145,80,20]);          // false

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

    MIDI.numberToOctave(66);              // 3

### .numberToFrequency(n)

Given a note number between 0 and 127, returns the frequency of the fundamental tone of that note.

    MIDI.numberToFrequency(66);           // 

The reference tuning is A = 440Hz by default. Change the tuning by assigning MIDI.pitch.

    MIDI.pitch = 442;

### .noop()

A function that does nothing.

## MIDI node constructors

This section is of interest if you want to write your own MIDI process nodes.

Under the bonnet, a <code>MIDI()</code> router manages a chain of MIDI nodes that
messages are passed through. For example, <code>MIDI().modify(options)</code>
creates a route with an instance of the MIDI.Modify node in the chain.
Node constructors are exposed on the <code>MIDI</code> object for convenience
(they don't have to be) and are registered as a method for the router with:

    MIDI.register(methodName, Node);

First up, <code>MIDI.Node(fn)</code>. All other node constructors inherit from
<code>MIDI.Node()</code>.


### MIDI.Node(fn)

A constructor that creates a MIDI node.

    var node = MIDI.Node();

MIDI nodes have three important methods:

    node.in(e)    // pass an event in to the node for processing.
    node.out(fn)  // bind a handler to the node's out.
    node.send(e)  // send an event to the node's out handlers.

The function <code>fn</code> is a process to perform on an event.
<code>fn</code> is called with a MIDI event object, and will typically call
<code>this.send(e)</code> to pass the event to node.out handlers:

    var node = MIDI.Node(function(e) {
        // Do something with e
        console.log(e);
        
        // Pass the event to the out handler(s)
        this.send(e);
    });

Where <code>fn</code> is undefined, events are passed straight from
<code>.in(e)</code> to <code>.send(e)</code>.

MIDI nodes go to some effort to keep processes efficient. Both <code>.out()</code>
and <code>.send()</code> are dynamically reassigned depending on the number of
handlers they have to serve. I mention this only so that you don't go storing your
outs using something like bind <code>node.out.bind(node)</code>, because
<code>node.out</code> will change out from under your feet.

### MIDI.Source()

A constructor that creates an source node. For a source node, <code>.in()</code>
is a noop.

    var node = MIDI.Source();

### MIDI.Destination(fn)

A constructor that creates a destination node. For a destination node,
<code>.out()</code> is a noop.

    var node = MIDI.Destination();

### MIDI.Input(options)

A constructor that creates an input node. Automatically requests MIDI access and
finds the relevant port, if it exists.

    // Create a node
    var node = MIDI.Input({ port: 'Port 1' });
    
    // Or create it on a route as
    MIDI().input({ port: 'Port 1' });

### MIDI.Output(options)

A constructor that creates an output node. Automatically requests MIDI access and
finds the relevant port, if it exists.

    // Create a node
    var node = MIDI.Output({ port: 'Port 1' });
    
    // Or create it on a route as
    MIDI().output({ port: 'Port 1' });

### MIDI.Filter(options)

A constructor that creates a filter node.

    // Create a node
    var node = MIDI.Filter({ channel: 1 });
    
    // Or create it on a route as
    MIDI().filter({ channel: 1 });

### MIDI.Modify(options)

A constructor that creates an modify node.

    // Create a node
    var node = MIDI.Modify({ channel: 1 });
    
    // Or create it on a route as
    MIDI().modify(options);

### MIDI.Convert(options)

A constructor that creates a convert node.

    // Create a node
    var node = MIDI.Convert({
        type: 'continuous',
        message: 'cc'
        data1: 3
    });

    // Or create it on a route as
    MIDI().convert(options);

### MIDI.Graph(options)

A constructor that creates a graph node.

    // Create a node
    var node = MIDI.Graph({ node: 'my-canvas' });
    
    // Or create it on a route as
    MIDI().graph(options);

### MIDI.OutArray(fn)

A constructor that creates an out node that calls <code>fn</code> with an
OSC-like array.

    // Create a node
    var node = MIDI.OutArray(fn);
    
    // Or create it on a route as
    MIDI().outArray(fn);

### MIDI.OutMap(fn)

A constructor that creates an out node that calls <code>fn</code> once with a
live object representing the state of the midi route. Observe this object
for changes!

    // Create a node
    var node = MIDI.OutMap(fn);
    
    // Or create it on a route as
    MIDI().outMap(fn);

### MIDI.Log()

A constructor that creates a node that logs midi event.data to the console.

    // Create a node
    var node = MIDI.OSC(fn);
    
    // Or create it on a route as
    MIDI().outArray(fn);
