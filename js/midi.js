(function(window) {
	"use strict";

	var prototype = {};

	function send(e) {
		this._send(e);
	}

	function createMethod(Node) {
		return function(options) {
			var node = new Node(options);

			// Set in() to the in() of the first node.
			if (node.in && this.in === send) {
				this.in = node.in.bind(node);
			}

			// Connect the out of the previous node to the in of this node.
			if (node.in) {
				this.out(node.in);
			}

			// Redefine out() to alias this node.
			if (node.out) {
				this.out = function(fn) {
					node.out(fn);
					return this;
				};
			}

			return this;
		}
	}

	function registerNode(name, Node) {
		prototype[name] = createMethod(Node);
	}

	function MIDI() {
		var route = Object.create(prototype);

		MIDI.Source.apply(route);
		route.in = send;

		return route;
	}

	MIDI.register = registerNode;

	window.MIDI = MIDI;
})(window);


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

	function returnMessage(data) {
		return MIDI.messages[Math.floor(data[0] / 16) - 8];
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

	function log(error) {
		console.log(error);
	}

	function request(fn) {
		if (!navigator.requestMIDIAccess) {
			console.log('Navigator does not support MIDI.');
			return;
		}

		navigator
		.requestMIDIAccess()
		.then(fn, log);
	}

	MIDI.request = request;
})(MIDI);