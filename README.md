# MIDI

MIDI is a thin wrapper around the browser's native navigator.requestMIDIAccess()
implementation that provides filtering for incoming MIDI messages, making
listening for particular MIDI messages easy.


## Warning

Currently only Chrome Canary has native MIDI support. MIDI also requires DOM
Promises or a suitable polyfill to be enabled.


### MIDI()

MIDI() returns a DOM Promise that is given the value of <code>midi</code> when
the browser's MIDI bridge becomes available.

    MIDI()
    .then(function(midi) {
        // Do something with midi
    });


### midi.on(fn)<br/>midi.on(filterObj, fn)

Subscibes to all incoming MIDI messages on all ports, firing the callback
handler when a message is received.

    midi.on(function(e) {
    	// Do something
    });

To filter incoming messages, pass in a filter object as the first argument:

    midi.on({ message: 'cc', channel: 1 }, function(e) {
    	// Listen to CONTROL CHANGE messages on CHANNEL 1
    });

    midi.on({ port: 1, message: 'noteon' }, function(e) {
        // Listen to NOTE ON messages coming from PORT 1
    });

The filter object can take functions as properties:

    function isGreater60(n) {
    	return n > 60;
    }
    
    midi.on({ message: 'noteon', data1: isGreater60 }, function(e) {
    	// Only receives NOTE ON messages for notes above C3
    });


The full list of properties a filter object takes is:

    {
        port:    number (port number) | string (port name)
        channel: number (1-16) | fn
        message: string (MIDI message type) | fn
        data1:   number (0-127) | fn
        data2:   number (0-127) | fn
    }


### midi.send(e)

Sends a message.


### midi.input([string | number])

Returns an object that represents an incoming MIDI port. Pass in the port's name
or index.

    var input = midi.input('Port 1');

    var input = midi.input(0);


### midi.output([string | number])

Returns an object that represents an outgoing MIDI port. Pass in the port's name
or index.

    var output = midi.output('IAC 1');

    var output = midi.output(0);


### Event names

    noteoff
    noteon
    polytouch
    cc
    pc
    channeltouch
    pitch