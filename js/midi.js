var MIDI = (function(undefined) {
	var eventNames = [
	    	'noteoff',
	    	'noteon',
	    	'polytouch',
	    	'cc',
	    	'pc',
	    	'channeltouch',
	    	'pitch'
	    ],

	    observers = [];


	function findType(n, v) {
		var name = eventNames[Math.floor(n / 16) - 8]
	
		// Catch noteons with zero velocity and rename them as noteoffs
		return name === eventNames[1] && v === 0 ?
			eventNames[0] :
			name ;
	}

	function findChannel(n) {
		return n % 16 + 1;
	}

	function logMessage(e) {
		console.log(e.data, e);
	}

	function routeMessage(e) {
		//console.log(e);

		var type = findType(e.data[0], e.data[2]);
		var ch = findChannel(e.data[0]);
		var time = e.receivedTime;

		trigger(type, ch, e.data[1], e.data[2], time);
	}

	function listen(input) {
		input.onmidimessage = route_message;
	}

	function pass(midi) {
		console.log(midi, midi.inputs());

		var inputs = midi.inputs();

		inputs.forEach(listen);
	}

	function fail(msg) {
		console.log( "Failed to get MIDI access - " + msg );
	}

	function MIDI() {
		navigator.requestMIDIAccess().then(pass, fail);
	}

	function isMatch(val, con) {
		// Test for equality, otherwise if con is not a number or string 
		// assume it's a function and call it.
		return val === con || (!/^num|str/.test(typeof con) && con(val));
	}

	function trigger(type, chan, num, val, time) {
		var args = arguments;

		observers.forEach(function(observer) {
			var l = observer.length - 1,
			    i = -1;

			while (++i < l) {
				if (!isMatch(args[i], observer[i])) {
					return;
				};
			}

			return observer[i](type, chan, num, val, time);
		});
	};

	MIDI.on = function(type, chan, num, val, fn) {
		var args = Array.prototype.slice.apply(arguments);
		observers.push(args);
	};

	MIDI.off = function(type, chan, num, val, fn) {
		var args = arguments;

		observers = observers.filter(function(observer) {
			var l = observer.length,
			    i = -1;

			while (++i < l) {
				if (!isMatch(args[i], observer[i])) {
					return false;
				};
			}
		});
	};

	MIDI.settings = {
		eventNames: eventNames
	};

	return MIDI;
})();


// Extend MIDI with some helper functions for handling notes.

(function(MIDI) {
	var noteNames = [
	    	'C',
	    	'C♯',
	    	'D',
	    	'E♭',
	    	'E',
	    	'F',
	    	'F♯',
	    	'G',
	    	'A♯',
	    	'A',
	    	'B♭',
	    	'B'
	    ],

	    noteTable = {
	    	'C':  0,
	    	'C♯': 1,
	    	'D♭': 1,
	    	'D':  2,
	    	'D♯': 3,
	    	'E♭': 3,
	    	'E':  4,
	    	'F':  5,
	    	'F♯': 6,
	    	'G♭': 6,
	    	'G':  7,
	    	'G♯': 8,
	    	'A♭': 8,
	    	'A':  9,
	    	'A♯': 10,
	    	'B♭': 10,
	    	'B':  11
	    },

	    pitch = 440,
	    middle = 3,

	    rname = /^([A-G][♭♯]?)(\d)$/;

	function round(n, d) {
		var factor = Math.pow(10, d); 
		return Math.round(n * factor) / factor;
	}

	function nameToNote(str) {
		var r = rnote.exec(str);
		return parseInt(r[2]) * 12 + noteTable[r[1]];
	}

	function noteToName(n) {
		return note_names[n % 12];
	}

	function noteToOctave(n) {
		return Math.floor(n / 12) - (5 - middle);
	}

	function noteToFrequency(n) {
		return round(pitch * Math.pow(1.059463094359, (n + 3 - (middle + 2) * 12)));
	}

	MIDI.settings.pitch = 440;
	MIDI.settings.middle = 3;

	//MIDI.noteNames = noteNames;
	//MIDI.noteTable = noteTable;
	MIDI.nameToNote = nameToNote;
	MIDI.noteToName = noteToName;
	MIDI.noteToOctave = noteToOctave;
	MIDI.noteToFrequency = noteToFrequency;
})(MIDI);
