# MIDI

MIDI is library of functions for routing and transforming MIDI data, and an
interface for the browser's native navigator.requestMIDIAccess().


## Warning

Currently only Chrome Canary has native MIDI support. MIDI also requires DOM
Promises or a suitable polyfill to be enabled. Also, early days, and this API
will change.


## Getting started

Take notes from port 'Bus 1' and send them to port 'IAC 2'.

    function isNote(m) {
        return m === 'noteon' || m === 'noteoff';
    }

    MIDI()
    .input({ port: 'Bus 1' })
    .filter({ message: isNote })
    .output({ port: 'IAC 2' });


Set up a route that takes control changes and coerces them to channel 1 before
calling a listener.

    var route = MIDI()
        .filter({ message: 'cc' })
        .modifer({ channel: 1 })
        .out(function(e) {
            // Do something with midi note event e
            console.log(e);
        });
    
    // Call the route input with a MIDI message 
    route.in(message);


Routes can have multiple outs:

    var route = MIDI()
        .filter({ message: 'cc' })
        .modifer({ channel: 1 })
        .out(function(e) {
            // Do something with midi note event e
        })
        .out(function(e) {
            // Do something else
        });


Because <code>.out()</code> takes a function, routes can be connected together.

    var route1 = MIDI()
        .input({ port: 'Bus 1' })
        .filter({ message: isNote });
    
    var route2 = MIDI()
        .modify({ channel: 1 })
        .output({ port: 'IAC 2' });
    
    route1.out(route2.in);




## MIDI utility functions


### .request(fn)

Request access to the browser's midi API. Where the browser does not support The
WebMIDI API, the first call to <code>MIDI.request(fn)</code> will alert the user.


    MIDI.request(function(midi) {
        // Do something with midi object
    });

<code>.request()</code> returns a promise, so this is equivalent:

    MIDI.request().then(function(midi) {
        // Do something with midi object
    });


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

    MIDI.numberToOctave(66);                // 3


### .numberToFrequency(n)

Given a note number between 0 and 127, returns the frequency of the fundamental tone of that note.

    MIDI.numberToFrequency(66);           // 

The reference tuning is A = 440Hz by default. Change the tuning by assigning MIDI.pitch.

    MIDI.pitch = 442;


### .noop()

A function that does nothing.


## MIDI node constructors

This section is of interest if you want to write your own MIDI processes.

Under the bonnet, a <code>MIDI()</code> router manages a chain of MIDI nodes that
messages are passed through. For example, <code>MIDI().modify(options)</code>
creates a route with an instance of the MIDI.Modifier node in the chain.
Node constructors are exposed on the <code>MIDI</code> object for convenience
(they don't have to be) and registered as a method for the router with:

    MIDI.register(name, Node);


### MIDI.Node(fn)

A constructor that creates a MIDI node.

All other node constructors inherit from <code>MIDI.Node()</code>. MIDI nodes
have three important methods: <code>.in(e)</code>, <code>.out(fn)</code> and
<code>.send(e)</code>.

Call <code>node.in(e)</code> to pass an event to the node.
Call <code>node.out(fn)</code> to bind a handler to the node's output.
Call <code>node.send(e)</code> to send an event to the node's out handlers.

The function <code>fn</code> is a process to perform on an event.
<code>fn</code> is called with a MIDI event object, and will typically call
<code>this.send(e)</code> to pass the event to node.out handlers.

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
handlers they have to serve.


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

    var node = MIDI.Input({ port: 'Port 1' });

Exposed to a route as:

    MIDI().input(options);


### MIDI.Output(options)

A constructor that creates an output node. Automatically requests MIDI access and
finds the relevant port, if it exists.

    var node = MIDI.Output({ port: 'Port 1' });

Exposed to a route as:

    MIDI().output(options);


### MIDI.Filter(options)

A constructor that creates a filter node.

    var node = MIDI.Filter({ channel: 1 });

Exposed to a route as:

    MIDI().filter(options);


### MIDI.Modifier(options)

A constructor that creates an modify node.

    var node = MIDI.Modifier({ channel: 1 });

Exposed to a route as:

    MIDI().modify(options);


### MIDI.OSC(fn)

A constructor that creates an OSC destination node.

    var node = MIDI.OSC(function(messageOSC) {
        // Do something with OSC message bundle
    });

Exposed to a route as:

    MIDI().osc(fn);


### MIDI.Logger()

A constructor that creates a log node.

    var input = MIDI.Logger();

Exposed to a route as:

    MIDI().log();
