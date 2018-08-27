
const entries = Object.entries;
const A4      = 69;

/*
controlToNumber(name)

Returns a value in the range `0`-`127` from a shorthand controller `name`.

    controlToNumber('volume')   // 7
	controlToNumber('sustain')  // 64
	controlToNumber('98')       // 98
*/

export function controlToNumber(name) {
	const entry = entries(controlNames).find(function(entry) {
		return entry[1] === name;
	});

	return entry ? parseInt(entry[0], 10) : parseInt(name, 10);
}

/*
frequencyToNumber(refFreq, freq)

Returns freq as a float on the note number scale, where `refFreq` is a reference
frequency for middle A (A4), usually `440`.

    frequencyToNumber(440, 220);  // 57 (A3)
	frequencyToNumber(440, 110);  // 45 (A2)
*/

export function frequencyToNumber(ref, freq) {
	var number = A4 + 12 * Math.log(freq / ref) / Math.log(2);

	// Rounded it to nearest 1,000,000th to avoid floating point errors and
	// return whole semitone numbers where possible. Surely no-one needs
	// more accuracy than a millionth of a semitone?
	return Math.round(1000000 * number) / 1000000;
}

/*
normaliseNote(name)

Replaces the characters `'b'` and `'#'` with the unicode musical characters `'♭'`
and `'♯'` respectively.

    normaliseNote('Eb6');      // 'E♭6'
*/

const rTextSymbol = /b|#/g;

const unicodeSymbols = {
	'b': '♭',
	'#': '♯'
};

function replaceSymbol($0) {
	return unicodeSymbols[$0];
}

export function normaliseNote(name) {
	return name.replace(rTextSymbol, replaceSymbol);
}

/*
noteToNumber(name)

Given a note name, returns a value in the range 0-127.

    noteToNumber('D6');     // 86
*/

const noteNumbers = {
	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	'A♯': 10, 'B♭': 10, 'B': 11
};

const rnotename   = /^([A-G][♭♯]?)(-?\d)$/;

export function noteToNumber(str) {
	var r = rnotename.exec(normaliseNote(str));
	return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
}

/*
numberToControl(n)

Returns a shorthand controller name from a value in the range `0`-`127`. Not all
contollers have a standardised name, and this library implements only the
more common ones. Where a name is not found, returns the controller number as a
string.

    numberToControl(7);       // 'volume'
	numberToControl(64);      // 'sustain'
	numberToControl(98);      // '98'

Standardised controller names are defined at
[midi.org/specifications-old/](https://www.midi.org/specifications-old/item/table-3-control-change-messages-data-bytes-2).
*/

const controlNames = {
	0:   'bank',
	1:   'modulation',
	2:   'breath',
	4:   'foot',
	5:   'portamento time',
	7:   'volume',
	8:   'balance',
	10:  'pan',
	11:  'expression',
	64:  'sustain',
	65:  'portamento',
	66:  'sostenuto',
	67:  'soft',
	68:  'legato',
	69:  'hold',
	84:  'portamento amount',
	91:  'reverb',
	92:  'tremolo',
	93:  'chorus',
	94:  'detune',
	95:  'phaser',
	120: 'sound-off',
	121: 'reset',
	122: 'local',
	123: 'notes-off',
	124: 'omni-off',
	125: 'omni-on',
	126: 'monophonic',
	127: 'polyphonic'
};

export function numberToControl(n) {
	return controlNames[n] || ('' + n);
}

/*
numberToFrequency(refFreq, n)

Given a note number `n`, returns the frequency of the fundamental tone of that
note relative to the reference frequency for middle A (A4) `refFreq` (usually `440`).

    numberToFrequency(440, 69);  // 440
    numberToFrequency(440, 60);  // 261.625565
    numberToFrequency(442, 69);  // 442
    numberToFrequency(442, 60);  // 262.814772
*/

export function numberToFrequency(ref, n) {
	return ref * Math.pow(2, (n - A4) / 12);
}

/*
numberToNote(n)

Returns note name from a value in the range 0-127.

    numberToNote(69);       // 'A4'
*/

const noteNames = [
	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'
];

export function numberToNote(n) {
	return noteNames[n % 12] + numberToOctave(n);
}

/*
numberToOctave(n)

Where `n` is a note number, returns the numerical octave.

    numberToOctave(69);     // 4
*/

export function numberToOctave(n) {
	return Math.floor(n / 12) - 1;
}


/*
toStatus(channel, type)

Given a `channel` in the range `1`-`16` and type, returns the MIDI message
status byte.

    toStatus(1, 'noteon');      // 144
	toStatus(7, 'control');     // 183
*/

// MIDI message status bytes
//
// noteoff         128 - 143
// noteon          144 - 159
// polytouch       160 - 175
// control         176 - 191
// pc              192 - 207
// channeltouch    208 - 223
// pitch           224 - 240

export const statusNumbers = {
	noteoff:      128,
	noteon:       144,
	polytouch:    160,
	control:      176,
	program:      192,
	channeltouch: 208,
	pitch:        224,
};

export function toStatus(channel, type) {
	return channel > 0
		&& channel < 17
		&& statusNumbers[type] + channel - 1 ;
}
