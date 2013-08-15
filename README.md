# MIDI

MIDI is a thin wrapper around the browser's native navigator.requestMIDIAccess()
implementation that provides filtering for incoming MIDI messages to make
routing a little easier.


## Warning

MIDI is at version 0.1. Only some of what is described below actually works.
And it may change.


### MIDI()

    MIDI().then(function(midi) {
        var input = midi.input('Port 1');
        var output = midi.output('IAC 1');
    }, errorFn);


### midi.input([string | number])

Returns an object that represents an incoming MIDI port or ports. If no argument
is passed in, the input listens to all available MIDI ports.

    var input = midi.input();

To listen to a single MIDI port, pass in the port's name or index.

    var input = midi.input('Port 1');

    var input = midi.input(0);


### input.on(fn)

Subscibes to incoming MIDI messages, firing a callback function when a message
is received.

    input.on(function(e) {
    	// Do something
    });

### input.on(filterObj, fn)

To filter incoming messages, pass in a filter object as the first argument:

    input.on({ event: 'cc', channel: 1 }, function(e) {
    	// Only receives CONTROL CHANGE messages on CHANNEL 1
    });

The filter object can take functions as properties:

    function isGreater60(n) {
    	return n > 60;
    }
    
    input.on({ event: 'noteon', data1: isGreater60 }, function(e) {
    	// Only receives NOTE ON messages for notes above C3
    });

As a convenience, the filter also understands note names:

    input.on({ event: 'noteon', data1: 'C3' }, function(e) {
    	// Only receives NOTE ON messages for the note C3
    });


### midi.output([string | number])

Returns an object that represents an outgoing MIDI port or ports. If no argument
is passed in, the output sends to all available MIDI ports.

    var output = midi.output();

To send to a single MIDI port, pass in the port's name or index.

    var output = midi.output('IAC 1');

    var output = midi.output(0);


### output.send(e)

Sends a message to the output port.


### midi.route(inputFilter, outputDefinition)

Routes MIDI messages from the filtered input to the defined output. Messages not
matching the input filter are ignored. Parameters not defined in the output
definition are passed through unaltered.

    var inputFilter = {
            port: 'Port 1',
            channel: 1,
            event: 'noteon'
        };
    
    var outputDefinition = {
            port: 'IAC 1',
            channel: 2
        };
    
    // Take notes from Port 1, Channel 1, route them to the IAC 1, Channel 2
    midi.route(inputFilter, outputDefinition);

### midi.route(inputFilter, fn)

Where a callback function is given, the callback's first argument is the
incoming event, and it's return value is sent to the output. Where the
return value is falsy, nothing is sent to the output.

    midi.route(inputFilter, function(e) {
    	// Ignore all notes with less than 20 velocity.
    	if (e.data2 > 20) {
    		// Give notes a constant velocity and send them to IAC 1, Channel 2
    		e.port = 'IAC 1';
    		s.channel = 2;
    		e.data2 = 80;
    		return e;
    	}
    });


### Filter object

The full list of properties a filter object can have is:

    {
        port: number | string (port name)
        channel: number (1-16)
        event: string (event name)
        data1: number | string (note name)
        data2: number
    }


### Event names

    noteoff
    noteon
    polytouch
    cc
    pc
    channeltouch
    pitch