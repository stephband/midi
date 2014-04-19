// Core MIDI module.
// 
// Write MIDI routes like so:
// 
// MIDI()
// .input({ name: 'Bus 1' })
// .filter({ message: 'note' })
// .modify({ channel: 2 })
// .out(function(e) {
//     // Do something with event e
// });
// 
// A MIDI() object has a few special methods:
// 
// .in(e)      Can't be changed. Call it with a midi event.
// .out(fn)    Returns this so multiple outs from the same
//             MIDI node can be chained.
// .send(e)    Used internally, but also for debugging. Call
//             .send() to send a message to the out.
// 
// A MIDI(fn) object takes a function. This function is
// attached to the node as it's 'in' method. Typically, an
// 'in' function calls this.send(e) to trigger the node.out.
// 
// var midi = MIDI(function(e) {
//     this.send(e);
// });

(function (window) {
    'use strict';

    var alertFlag = false;

    // Node prototype

    var prototype = {
        out: out1,
        send: send
    };

    function noop() {}

    function out1(fn) {
        // Override send with this listener function. Because we want this
        // thing to be fast in the most common case, where exactly one
        // listener function is specified.
        this.send = fn;
        this.out = out2;
        return this;
    }

    function out2(fn) {
        var listeners = [this.send, fn];

        Object.defineProperty(this, 'listeners', {
            value: listeners
        });

        this.out = out3;

        // Fall back to prototype send
        delete this.send;
        return this;
    }

    function out3(fn) {
        this.listeners.push(fn);
        return this;
    }

    function send(message) {
        if (!this.listeners) { return; }

        var length = this.listeners.length,
            l = -1;

        while (++l < length) {
            this.listeners[l](message);
        }
        
        return this;
    }

    function passThru(e) {
        this.send.apply(this, arguments);
    }

    function Node(fn) {
        return Object.create(prototype, {
            in: {
                value: fn || passThru,
                enumerable: true
            }
        });
    }

    function Source(fn) {
        var node = Node(noop);
        return node;
    }

    function Destination(fn) {
        var node = Node(fn);
        node.send = noop;
        return node;
    }

    function createMethod(Node) {
        return function method(options) {
            var node = Node(options);
            this.out(node.in);
            return node;
        };
    }

    function createMethod(Node) {
        return function method(options) {
            var node = Node(options);
            
            this.out(node.in);
            
            if (node.out !== noop) {
                this.out = function() {
                    node.out.apply(node, arguments);	
                };
            }
            
            return this;
        };
    }

    function register(name, Node) {
        prototype[name] = createMethod(Node);
    }

	function log(error) {
		console.log(error);
	}

	function request(fn) {
		if (!navigator.requestMIDIAccess) {
			if (!alertFlag) {
				alert('Your browser does not support MIDI via the navigator.requestMIDIAccess() API.');
			}
			
			return;
		}

		return navigator.requestMIDIAccess().then(fn, log);
	}

    function MIDI() {
        return MIDI.Node();
    }

    MIDI.noop = noop;
    MIDI.request = request;
    MIDI.register = register;

    MIDI.Node = Node;
    MIDI.Source = Source;
    MIDI.Destination = Destination;

    window.MIDI = MIDI;
})(window);



// Declare constants and utility functions on the MIDI object.

(function(MIDI) {
	var noteNames = [
	    	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G♯', 'A', 'B♭', 'B'
	    ],

	    noteTable = {
	    	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	    	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	    	'A♯': 10, 'B♭': 10, 'B': 11
	    },

	    rname = /^([A-G][♭♯]?)(\d)$/;

	function round(n, d) {
		var factor = Math.pow(10, d); 
		return Math.round(n * factor) / factor;
	}


	// Library functions

	function noteToNumber(str) {
		var r = rnote.exec(str);
		return parseInt(r[2]) * 12 + noteTable[r[1]];
	}

	function numberToNote(n) {
		return noteNames[n % 12];
	}

	function numberToOctave(n) {
		return Math.floor(n / 12) - (5 - MIDI.middle);
	}

	function numberToFrequency(n) {
		return round(MIDI.pitch * Math.pow(1.059463094359, (n + 3 - (MIDI.middle + 2) * 12)));
	}

	function returnChannel(data) {
		return data[0] % 16 + 1;
	}

	//function returnMessage(data) {
	//	return MIDI.messages[Math.floor(data[0] / 16) - 8];
	//}

	function returnMessage(data) {
		var name = types[Math.floor(data[0] / 16) - 8];
	
		// Catch type noteon with zero velocity and rename it as noteoff
		return name === types[1] && data[2] === 0 ?
			types[0] :
			name ;
	}

	function normaliseNoteOff(data) {
		// If it's a noteon with 0 velocity, normalise it to a noteoff
		if (data[2] === 0 && data[0] > 143 && data[0] < 160) {
			data[0] -= 16;
		}

		return data;
	}

	function normaliseNoteOn(data) {
		// If it's a noteoff, make it a noteon with 0 velocity.
		if (data[0] > 127 && data[0] < 144) {
			data[0] += 16;
			data[2] = 0;
		}

		return data;
	}

	function pitchToInt(data) {
		return (data[2] << 7 | data[1]) - 8192 ;
	}

	function pitchToFloat(data, range) {
		return (range === undefined ? 2 : range) * pitchToInt(data) / 8191 ;
	}

	MIDI.messages = [
		'noteoff',
		'noteon',
		'polytouch',
		'cc',
		'pc',
		'channeltouch',
		'pitch'
	];

	MIDI.pitch = 440;
	MIDI.middle = 3;

	//MIDI.noteNames = noteNames;
	//MIDI.noteTable = noteTable;
	MIDI.noteToNumber = noteToNumber;
	MIDI.numberToNote = numberToNote;
	MIDI.numberToOctave = numberToOctave;
	MIDI.numberToFrequency = numberToFrequency;
	MIDI.channel = returnChannel;
	MIDI.message = returnMessage;
	MIDI.normaliseNoteOn = normaliseNoteOn;
	MIDI.normaliseNoteOff = normaliseNoteOff;
	MIDI.pitchToInt = pitchToInt;
	MIDI.pitchToFloat = pitchToFloat;
})(MIDI);