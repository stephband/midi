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

### .convert(options)

    var route = MIDI().convert(options);

Adds a convert node to the route. Convert changes continuous controller numbers
to range 0 - 127 numbers. It applies the conversion to a filtered subset of
events. Events that are not converted are passed straight through. Convert
options take the same properties as .filter() does (above), plus the
<code>type</code> option for choosing a conversion:

    {
        type:    'continuous' - required - the only type available at the moment
        port:    number | string | target
        channel: number (1-16) | fn
        message: string | regexp | fn
        data1:   number (0-127) | fn
        data2:   number (0-127) | fn
    }

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
