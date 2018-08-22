
// MIDI utilities
//
// Declares utility functions and constants on the MIDI object.

import { curry, deprecate, noop } from '../../fn/fn.js';

var A4        = 69;
var rnotename = /^([A-G][♭♯]?)(-?\d)$/;
var rshorthand = /[b#]/g;

export const noteNumbers = {
	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	'A♯': 10, 'B♭': 10, 'B': 11
};

export const noteNames = [
	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'
];

// MIDI message status bytes
//
// noteoff         128 - 143
// noteon          144 - 159
// polytouch       160 - 175
// control         176 - 191
// pc              192 - 207
// channeltouch    208 - 223
// pitch           224 - 240

const status = {
	noteoff:      128,
	noteon:       144,
	polytouch:    160,
	control:      176,
	pc:           192,
	channeltouch: 208,
	pitch:        224,
};

const types = Object.keys(status);

/* toType(message)

Returns message type as one of the strings `'noteoff'`, `'noteon'`, `'polytouch'`,
`'control'`, `'program'`, `'channeltouch'` or `'pitch'`.

    toType([145,80,20]);          // 'noteon'.
*/

export function toType(message) {
	var name = types[Math.floor(message[0] / 16) - 8];

	// Catch type noteon with zero velocity and rename it as noteoff
	return name === types[1] && message[2] === 0 ?
		types[0] :
		name ;
}

/*
toStatus(channel, type)

Given a channel and type, returns the MIDI message number.

    toStatus(1, 'noteon');      // 144
*/

export function toStatus(channel, type) {
	return channel > 0
		&& channel < 17
		&& status[type] + channel - 1 ;
}

/*
toChannel(message)

Returns the MIDI channel as a number.

    toChannel([145,80,20]);       // 2
*/

export function toChannel(message) {
	return message[0] % 16 + 1;
}

export const normalise = (function(converters) {
	return function normalise(e) {
		var message = e.data;
		var time    = e.timeStamp;
		var type    = toType(message);
		return (converters[type] || converters['default'])(data, time, type) ;
	};
})({
	pitch: function(message, time) {
		return [time, 'pitch', pitchToFloat(2, message)];
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

/*
isNote(message)

Returns `true` where message is a note, otherwise `false`.

    isNote([145,80,20]);           // true
*/

export function isNote(message) {
	return message[0] > 127 && message[0] < 160 ;
}

/*
isControl(message)

Returns `true` if message is a control change, otherwise `false`.

    isControl([145,80,20]);       // false
*/

export function isControl(message) {
	return message[0] > 175 && message[0] < 192 ;
}

/*
isPitch(message)

Returns `true` message is a pitch bend, otherwise `false`.

    isPitch([145,80,20]);          // false
*/

export function isPitch(message) {
	return message[0] > 223 && message[0] < 240 ;
}

/*
normaliseNote(message)

Many keyboards transmit `'noteon'` with
velocity `0` rather than `'noteoff'` messages.
`normaliseNote` <em>mutates</em> these messages to
`'noteoff'` messages.

    normaliseNote([145,80,0]);    // [129,80,0]
*/

export function normaliseNote(message) {
	// If it's a noteon with 0 velocity, normalise it to a noteoff
	if (message[2] === 0 && message[0] > 143 && message[0] < 160) {
		message[0] -= 16;
	}

	return message;
}

/*
pitchToInt(message)

Returns pitch bend data values as a 14-bit integer.

    pitchToInt([xxx,xx,xxx]);      // -8125
*/

export function pitchToInt(message) {
	return (message[2] << 7 | message[1]) - 8192 ;
}

/*
pitchToFloat(range, message)

Returns the pitch bend data as a float in semitones, where
`range` is the bend range up or down in
semitones.

    pitchToFloat(2, [xxx,xx,xxx]); // -1.625
*/

export function pitchToFloat(range, message) {
	return (range === undefined ? 2 : range) * pitchToInt(message) / 8191 ;
}

/*
normaliseName(name)

Normalises the string name to an identifier for a note.

    normaliseNoteName(name);      //
*/

function replaceSymbol($0, $1) {
	return $1 === '#' ? '♯' :
		$1 === 'b' ? '♭' :
		'' ;
}

export function normaliseName(name) {
	return name.replace(rshorthand, replaceSymbol);
}

/*
nameToNumber(name)

Given a note name, returns a value in the range 0-127.

    nameToNumber(name);          //
*/

export function nameToNumber(str) {
	var r = rnotename.exec(normaliseNoteName(str));
	return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
}

/*
numberToName(n)

Returns note name from a value in the range 0-127.

    numberToName(49);           // 'A4'
*/

export function numberToName(n) {
	return noteNames[n % 12] + numberToOctave(n);
}

/*
numberToOctave(n)

Where `n` is a note number, returns the numerical octave of that note.

    numberToOctave(49);         // 4
*/

export function numberToOctave(n) {
	return Math.floor(n / 12) - 1;
}

/*
numberToFrequency(freqA, n)

Given a note number `n`, returns the frequency
of the fundamental tone of that note relative to the reference frequency
for middle A3 `freqA`.

    numberToFrequency(440, 69);  // 440
    numberToFrequency(440, 60);  // 261.625565
    numberToFrequency(442, 69);  // 442
    numberToFrequency(442, 60);  // 262.814772
*/

export function numberToFrequency(tuning, n) {
	return tuning * Math.pow(2, (n - A4) / 12);
}

/*
frequencyToNumber(freqA, freq)

Returns freq as a float on the note number scale, where
`freqA` is a reference frequency for middle
A3.

    frequencyToNumber(hz, freq);      //
*/

export function frequencyToNumber(tuning, frequency) {
	var number = A4 + 12 * Math.log(frequency / tuning) / Math.log(2);

	// Rounded it to nearest 1,000,000th to avoid floating point errors and
	// return whole semitone numbers where possible. Surely no-one needs
	// more accuracy than a millionth of a semitone?
	return Math.round(1000000 * number) / 1000000;
}
