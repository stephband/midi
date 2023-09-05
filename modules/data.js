
const entries = Object.entries;
const A4      = 69;


/**
floatToFrequency(ref, n)

Given a note number `n`, returns the frequency of the fundamental tone of that
note. `ref` is a reference frequency for middle A4/69 (usually `440`).

    floatToFrequency(440, 69);  // 440
    floatToFrequency(440, 60);  // 261.625565
    floatToFrequency(442, 69);  // 442
    floatToFrequency(442, 60);  // 262.814772
**/

export function floatToFrequency(ref, n) {
	return ref * Math.pow(2, (n - A4) / 12);
}


/**
frequencyToFloat(ref, frequency)

Returns `frequency` as a float on the note number scale. `ref` is a reference
frequency for middle A4/69 (usually `440`).

    frequencyToFloat(440, 220);  // 57 (A3)
	frequencyToFloat(440, 110);  // 45 (A2)

Output is rounded to 32 bits to mitigate floating point rounding errors.
*/

export function frequencyToFloat(ref, freq) {
	var number = A4 + 12 * Math.log(freq / ref) / Math.log(2);

	// Rounded it to nearest 32-bit value to avoid floating point errors
	// and return whole semitone numbers where possible.
	return Math.fround(number);
}


/**
normaliseNoteName(name)

Replaces the characters `'b'` and `'#'` with the unicode musical characters `'♭'`
and `'♯'` respectively.

    normaliseNoteName('Eb6');      // 'E♭6'
*/

const rTextSymbol = /b|#/g;

const unicodeSymbols = {
	'b': '♭',
	'#': '♯'
};

function replaceSymbol($0) {
	return unicodeSymbols[$0];
}

export function normaliseNoteName(name) {
	return name.replace(rTextSymbol, replaceSymbol);
}


/**
toControlName(n)

Returns a shorthand controller name from a value in the range `0`-`127`. Not all
contollers have a standardised name, and this library implements only the
more common ones. Where a name is not found, returns the controller number as a
string.

    toControlName(7);       // 'volume'
	toControlName(64);      // 'sustain'
	toControlName(98);      // '98'

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
	84:  'portamento',
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

export function toControlName(n) {
	return controlNames[n] || ('' + n);
}


/**
toControlNumber(name)

Returns a value in the range `0`-`127` from a shorthand controller `name`.

    toControlNumber('volume')   // 7
	toControlNumber('sustain')  // 64
	toControlNumber('98')       // 98
*/

export function toControlNumber(name) {
	const entry = entries(controlNames).find(function(entry) {
		return entry[1] === name;
	});

	return entry ? parseInt(entry[0], 10) : parseInt(name, 10);
}


/**
toNoteName(n)

Returns note name from a value in the range 0-127.

    toNoteName(69);       // 'A4'
*/

const noteNames = [
	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'
];

export function toNoteName(n) {
	return noteNames[n % 12] + toNoteOctave(n);
}


/**
toNoteNumber(name)

Given a note name, returns a value in the range 0-127.

    toNoteNumber('D6');     // 86
*/

const noteNumbers = {
	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	'A♯': 10, 'B♭': 10, 'B': 11
};

const rnotename   = /^([A-G][♭♯]?)(-?\d)$/;

export function toNoteNumber(str) {
	var r = rnotename.exec(normaliseNoteName(str));
	return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
}


/**
toNoteOctave(n)

Where `n` is a note number, returns the numerical octave.

    toNoteOctave(69);     // 4
*/

export function toNoteOctave(n) {
	return Math.floor(n / 12) - 1;
}


/**
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

const statuses = {
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
		&& statuses[type] + channel - 1 ;
}


/**
toChannel(status)

Returns the MIDI channel as a number between `1` and `16`.

    toChannel(145);       // 2
*/

export function toChannel(status) {
	return status % 16 + 1;
}


/**
toType(status)

Returns message type as one of the strings `'noteoff'`, `'noteon'`, `'polytouch'`,
`'control'`, `'program'`, `'channeltouch'` or `'pitch'`.

    toType(145);          // 'noteon'.
*/

const types = Object.keys(statuses);

export function toType(status) {
	return types[Math.floor(status / 16) - 8];
}
