// MIDI utilities
//
// Declares utility functions and constants on the MIDI object.

(function(window) {
	'use strict';

	var MIDI = window.MIDI;

	var noteNames = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];

	var noteNumbers = {
	    	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	    	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	    	'A♯': 10, 'B♭': 10, 'B': 11
	    };

	var A4 = 69;

	var rnotename = /^([A-G][♭♯]?)(-?\d)$/;
	var rshorthand = /[b#]/g;

	var types = {
	    	noteoff:      128,
	    	noteon:       144,
	    	polytouch:    160,
	    	control:      176,
	    	pc:           192,
	    	channeltouch: 208,
	    	pitch:        224
	    };

	var normalise = (function(converters) {
		return function normalise(data, receivedTime, timeOffset) {
			var type = MIDI.toType(data);
			var time = (receivedTime || 0) + (timeOffset || 0);

			return (converters[type] || converters['default'])(data, time, type) ;
		};
	})({
		pitch: function(data, time) {
			return [time, 'pitch', pitchToFloat(data, 2)];
		},

		pc: function(data, time) {
			return [time, 'program', data[1]];
		},

		channeltouch: function(data, time) {
			return [time, 'touch', 'all', data[1] / 127];
		},

		polytouch: function(data, time) {
			return [time, 'touch', data[1], data[2] / 127];
		},

		default: function(data, time, type) {
			return [time, type, data[1], data[2] / 127] ;
		}
	});

	function normaliseEvent(e) {
		return normalise(e.data, e.receivedTime);
	}

	function round(n, d) {
		var factor = Math.pow(10, d);
		return Math.round(n * factor) / factor;
	}

	// Library functions

	function isNote(data) {
		return data[0] > 127 && data[0] < 160 ;
	}

	function isControl(data) {
		return data[0] > 175 && data[0] < 192 ;
	}

	function isPitch(data) {
		return data[0] > 223 && data[0] < 240 ;
	}

	function toChannel(data) {
		return data[0] % 16 + 1;
	}

	function toType(message) {
		var name = MIDI.types[Math.floor(message[0] / 16) - 8];

		// Catch type noteon with zero velocity and rename it as noteoff
		return name === MIDI.types[1] && message[2] === 0 ?
			MIDI.types[0] :
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

	function replaceSymbol($0, $1) {
		return $1 === '#' ? '♯' :
			$1 === 'b' ? '♭' :
			'' ;
	}

	function normaliseNoteName(name) {
		return name.replace(rshorthand, replaceSymbol);
	}

	function pitchToInt(data) {
		return (data[2] << 7 | data[1]) - 8192 ;
	}

	function pitchToFloat(data, range) {
		return (range === undefined ? 2 : range) * pitchToInt(data) / 8191 ;
	}

	function noteToNumber(str) {
		var r = rnotename.exec(normaliseNoteName(str));
		return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
	}

	function numberToNote(n) {
		return noteNames[n % 12] + numberToOctave(n);
	}

	function numberToOctave(n) {
		return Math.floor(n / 12) - 1;
	}

	function numberToFrequency(n, tuning) {
		return (tuning || MIDI.tuning) * Math.pow(2, (n - A4) / 12);
	}

	function frequencyToNumber(frequency, tuning) {
		var number = A4 + 12 * Math.log(frequency / (tuning || MIDI.tuning)) / Math.log(2);

		// Rounded it to nearest 1,000,000th to avoid floating point errors and
		// return whole semitone numbers where possible. Surely no-one needs
		// more accuracy than a millionth of a semitone?
		return Math.round(1000000 * number) / 1000000;
	}

	function typeToNumber(channel, type) {
		return types[type] + (channel ? channel - 1 : 0 );
	}

	MIDI.types = Object.keys(types);
	MIDI.tuning = 440;

	MIDI.noteNames = noteNames;
	//MIDI.noteNumbers = noteNumbers;
	MIDI.isNote = isNote;
	MIDI.isPitch = isPitch;
	MIDI.isControl = isControl;
	MIDI.typeToNumber = typeToNumber;
	MIDI.noteToNumber = noteToNumber;
	MIDI.numberToNote = numberToNote;
	MIDI.numberToOctave = numberToOctave;
	MIDI.numberToFrequency = numberToFrequency;
	MIDI.frequencyToNumber = frequencyToNumber;
	MIDI.toChannel = toChannel;
	MIDI.toType    = toType;
	MIDI.normaliseNoteOn = normaliseNoteOn;
	MIDI.normaliseNoteOff = normaliseNoteOff;
	MIDI.pitchToInt = pitchToInt;
	MIDI.pitchToFloat = pitchToFloat;
	MIDI.normalise = normalise;
	MIDI.normaliseEvent = normaliseEvent;

	// Aliases
	MIDI.toMessage = function() {
		console.warn('MIDI: deprecation warning - MIDI.toMessage() has been renamed to MIDI.toType()');
		return toType.apply(this, arguments);
	};

	MIDI.normaliseData = function() {
		console.warn('MIDI: deprecation warning - MIDI.normaliseData() has been renamed to MIDI.normalise()');
		return normalise.apply(this, arguments);
	};
})(window);
