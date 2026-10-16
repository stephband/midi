
import nothing from '../../fn/modules/nothing.js';
import mod     from '../../fn/modules/mod.js';
import slugify from '../../fn/modules/slugify.js';


/**
normaliseNoteName(name)

Replaces the characters `'b'` and `'#'` with the unicode musical characters `'♭'`
and `'♯'` respectively.

```js
normaliseNoteName('Eb6');      // 'E♭6'
```
*/

const rTextSymbol    = /b|#/g;
const unicodeSymbols = { 'b': '♭', '#': '♯' };
const mod12          = (n) => mod(12, n);

function replaceSymbol($0) {
    return unicodeSymbols[$0];
}

export function normaliseNoteName(name) {
    return name.replace(rTextSymbol, replaceSymbol);
}


/**
toNoteNumber(name)

Given a note name, returns a value in the range 0-127.

```js
toNoteNumber('D6');     // 86
```
*/

const rnotename   = /^([A-G][♭♯#b]?)(-?\d)$/;
const rnoteroot   = /^[A-G][♭♯#b]?/;
const rnoteoctave = /-?\d$/;
const rhz         = /[Hh]z$/;

/* noteNumbers exported because used by Scribe */
export const noteNumbers = {
    'C♭':-1, 'Cb':-1, 'C':  0, 'C♯': 1, 'C#': 1, 'D♭': 1, 'Db': 1, 'D':  2, 'D♯': 3, 'D#': 3, 'E♭': 3, 'Eb': 3,
    'E':  4, 'F♭': 4, 'Fb': 4, 'E♯': 5, 'E#': 5, 'F':  5, 'F♯': 6, 'F#': 6, 'G♭': 6, 'Gb': 6, 'G':  7,
    'G♯': 8, 'G#': 8, 'A♭': 8, 'Ab': 8, 'A':  9, 'A♯': 10,'A#': 10,'B♭': 10,'Bb': 10,'B': 11, 'B♯': 12, 'B#': 12
};

const drumNames = {
    // Roland extension to General MIDI
    27: 'High Q',
    28: 'Slap',
    29: 'Scratch push',
    30: 'Scratch pull',
    31: 'Sticks',
    32: 'Square click',
    33: 'Metronome click',
    34: 'Metronome bell',
    // General MIDI
    35: 'Low bass drum',
    36: 'High bass drum',
    37: 'Side stick',
    38: 'Snare drum 1',
    39: 'Hand clap',
    40: 'Snare drum 2',
    41: 'Low floor tom',
    42: 'Closed hi-hat',
    43: 'High floor tom',
    44: 'Pedal hi-hat',
    45: 'Low tom',
    46: 'Open hi-hat',
    47: 'Low mid tom',
    48: 'High mid tom',
    49: 'Crash cymbal 1',
    50: 'High tom',
    51: 'Ride cymbal 1',
    52: 'Chinese cymbal',
    53: 'Ride Bell',
    54: 'Tambourine',
    55: 'Splash cymbal',
    56: 'Cowbell',
    57: 'Crash cymbal 2',
    58: 'Vibra Slap',
    59: 'Ride cymbal 2',
    60: 'High bongo',
    61: 'Low bongo',
    62: 'Mute high conga',
    63: 'Open high conga',
    64: 'Low conga',
    65: 'High timbale',
    66: 'Low timbale',
    67: 'High agogo',
    68: 'Low agogo',
    69: 'Cabasa',
    70: 'Maracas',
    71: 'Short whistle',
    72: 'Long whistle',
    73: 'Short guiro',
    74: 'Long guiro',
    75: 'Claves',
    76: 'High wood block',
    77: 'Low wood block',
    78: 'Mute cuica',
    79: 'Open cuica',
    80: 'Mute triangle',
    81: 'Open triangle',
    // Roland extension to General MIDI
    82: 'Shaker',
    83: 'Jingle bell',
    84: 'Belltree',
    85: 'Castanets',
    86: 'Mute surdo',
    87: 'Open surdo'
};

for (let n in drumNames) {
    noteNumbers[slugify(drumNames[n])] = parseInt(n, 10);
}



/**
frequencyToNote(n, ref = 440)
Returns note number as a 32bit float from frequency float `n`.
**/

const A4 = 69;

export function frequencyToFloat(freq, ref = 440) {
    var number = A4 + 12 * Math.log(freq / ref) / Math.log(2);

    // Rounded it to nearest 32-bit value to avoid floating point errors
    // and return whole semitone numbers where possible.
    return Math.fround(number);
}


/**
floatToFrequency(n, ref = 440)
Returns frequency from note number float `n`.
**/

export function floatToFrequency(n, ref = 440) {
    return ref * Math.pow(2, (n - A4) / 12);
}


/**
toNoteNumber(n)
Returns note number from a frequency string, note name or drum name.

```js
toNoteNumber('A4');       // 69
toNoteNumber('440Hz');    // 69
toNoteNumber('Cabasa');   // 69
```
**/

export function toNoteNumber(name) {
    // Name is a number
    if (typeof name === 'number') return name;

    // Name is a frequency string post-fixed with 'Hz'
    if (rhz.test(name)) return frequencyToFloat(parseFloat(name));

    const r = rnotename.exec(name);

    return r ?
        // Name is a pitch string
        (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]] :
        // Name is a GM drum string
        noteNumbers[slugify(name)] ;
}

export function toRootNumber(name) {
    return typeof name === 'number' ?
        mod12(name) :
        noteNumbers[rnoteroot.exec(name)[0]] ;
}


/* noteNames exported because used by Scribe, but TODO a toNoteName that returns
a name without an octave. */
export const noteNames = [
    'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'
];

/**
toNoteName(n)
Returns note name from a value in the range 0-127.
```js
toNoteName(69);       // 'A4'
```
*/

export function toNoteName(n) {
    return toRootName(n) + toNoteOctave(n);
}


/**
toNoteRootName(n)
Where `n` is a note number, returns the root name, one of 'C', 'C♯', 'D', 'E♭',
'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'.
*/

export function toRootName(n) {
    return noteNames[mod12(n)];
}


/**
toNoteOctave(note)
Given `n` as a note name or number, returns the numerical octave.

```js
toNoteOctave(69);     // 4
```
*/

export function toNoteOctave(n) {
    return typeof n === 'number' ?
        Math.floor(n / 12) - 1 :
        noteNumbers[(rnoteoctave.exec(name) || nothing)[0]] ;
}

/**
toDrumName(n)
Returns a standard General MIDI drum name for note number or note name `n`.
**/

export function toDrumName(n) {
    const number = toNoteNumber(n);
    return drumNames[number] || '';
}
