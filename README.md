# MIDI

MIDI is library of functions for routing and transforming MIDI events.

Warning! Currently only Chrome has native MIDI support, and then only behind a flag.
If you're in Chrome, switch it on Web MIDI here
<a href="chrome://flags/#enable-web-midi">chrome://flags/#enable-web-midi</a>.

## Quick example

See this example at: <a href="http://stephband.github.com/midi/index.html">stephband.github.com/midi/index.html</a>.

Take midi events from all inputs, filter them to <code>noteon</code>,
<code>noteoff</code> and <code>pitch</code> messages, draw the result on a
canvas and output the midi event and an OSC-like array. Record the arrays in a
<code>tape</code>.

    var tape = [];

    MIDI()
    .input()
    .filter({ message: /^note|^pitch/ })
    .graph({ canvas: document.getElementById('midi-graph') })
    .out(function(e) {
        console.log(e.data);
    })
    .outArray(function(message) {
        tape.push(message);
    });

## Getting started

Take noteons and noteoffs from port 'Bus 1' and send them to port 'IAC 2'.

    MIDI()
    .input({ port: 'Bus 1' })
    .filter({ message: /^note/ })
    .output({ port: 'IAC 2' });

Set up a route that takes control changes and coerces them to channel 1 before
calling a listener.

    var route = MIDI()
        .filter({ message: 'cc' })
        .modify({ channel: 1 })
        .out(function(e) {
            // Do something with midi note event e
            console.log(e);
        });
    
    // Call the route input with a MIDI message 
    route.in(message);

Routes can have multiple outs:

    var route = MIDI()
        .filter({ message: 'cc' })
        .modify({ channel: 1 })
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

## MIDI() route functions

    var route = MIDI();

A MIDI() route is an easy way to plot a MIDI node graph. Each method
on a route adds a processing node to the route, with two exceptions:

- <code>node.in(e)</code> call to pass an event to the route
- <code>node.out(fn)</code> call to bind a handler to the route's output

A MIDI() route is itself a node. Here are the standard route methods:

### .in(e)

Send a midi event into the route.

    var route = MIDI();
    
    route.in({ data: [144,80,80] });

### .out(fn)

Bind a handler to the route's MIDI out.

    var route = MIDI().out(function(e) {
            console.log(e);
        });

Typically, you might want to send one route's out to another route's in:

    var route1 = MIDI()
        .input({ port: 'Bus 1' })
        .filter({ message: isNote });
    
    var route2 = MIDI()
        .modify({ channel: 1 })
        .output({ port: 'IAC 2' });
    
    route1.out(route2.in);

### .input(options)

Add a MIDI input node to the route. Automatically requests MIDI access and
finds the relevant port, if it exists.

    var route = MIDI().input({ port: 'Port 1' });

An input node is a source node. It ignores calls to it's <code>.in()</code>.
I'm not sure why that's important. Maybe we should change that to make it marge.

### .output(options)

Add a MIDI output node to the route. Automatically requests MIDI access and
finds the relevant port, if it exists.

    var route = MIDI().output({ port: 'Port 1' });

### .filter(options)

Add a filter node to the route.

    var route = MIDI().filter(options);

Options

    {
        port:    number | string | target
        channel: number (1-16) | fn
        message: string | regexp | fn
        data1:   number (0-127) | fn
        data2:   number (0-127) | fn
    }

If <code>port</code> is a number, the message is filtered by <code>e.target.id</code>.
If <code>port</code> is a string, the message is filtered by <code>e.target.name</code>.
If <code>port</code> is an object, the message is filtered by <code>e.target</code>.
If <code>message</code> is a string it should be one of:

    'noteoff'
    'noteon'
    'polytouch'
    'cc'
    'pc'
    'channeltouch'
    'pitch'

Functions should return <code>true</code> to allow the event to pass.

### .modify(options)

Adds a modify node to the route.

    var route = MIDI().modify(options);

Options

A modifier understands the options:

    {
        port:    number | string | target
        channel: number (1-16) | fn
        message: string
        data1:   number (0-127) | fn
        data2:   number (0-127) | fn
    }

The string <code>message</code> should be one of:

    'noteoff'
    'noteon'
    'polytouch'
    'cc'
    'pc'
    'channeltouch'
    'pitch'

Functions should return a number.

### .graph(options)

Adds a canvas graph node to the route.

    MIDI().graph({
        canvas: document.getElementById('midi-graph')
    });

Options

    {
        canvas:       DOM node, required - a <canvas> element, or an id of a <canvas> element 
        paddingLeft:  number, 0-1 - ratio of the canvas width to start drawing at
        paddingRight: number, 0-1 - ratio of the canvas width to stop drawing at
        paddingTop:   number, 0-1 - ratio of the canvas height to start drawing at
        ease:         number, 0-1 
        fadeDuration: number, in ms
        fadeLimit:    number, 0-1
        gridColor1:   string, 'hsla(0, 0%, 60%, 0.24)'
        gridColor2:   string, 'hsla(0, 0%, 40%, 0.12)'
        colors: [     Sixteen colors, one for each channel, in hsla arrays
            [220, 56, 68, 1],
            [232, 57, 66, 1],
            [244, 58, 65, 1],
            ...
        ]
    }

### .outArray(fn)

Adds an out node that formats MIDI data in an OSC-like array.

    var route = MIDI().outArray(function(message) {
        console.log(message);
    });

### .outMap(fn)

Adds an out node that calls <code>fn</code> immediately and once only with an
object representing the live state of the MIDI route. Use this as a model for
observing changes on.

    var route = MIDI().outMap(function(model) {
        // Dreamcode, I know
        Object.observe(model[0].notes, doSomething);    
    });

The map is structured by channel then message type:

    [
        {
            notes: [],
            pitch: 0,
            ccs:   []
        },
        ...
    ]

where <code>map[0]</code> is MIDI channel 1. The map is updated live as MIDI
events pass through the route.

### .log()

For debugging. Adds a node that logs midi event.data to the console.

    MIDI().log();

### More plugins

- <a href="https://github.com/stephband/midi-monitor">github.com/stephband/midi-monitor</a>

If you make a plugin, send a pull request adding it to this section.

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

    MIDI.numberToOctave(66);                // 3

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
    var node = MIDI.Modifier({ channel: 1 });
    
    // Or create it on a route as
    MIDI().modify(options);

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
