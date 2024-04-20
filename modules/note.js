
import nothing from '../../fn/modules/nothing.js';
import mod     from '../../fn/modules/mod.js';


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
const mod12          = mod(12);

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

/* noteNumbers exported because used by Scribe, TODO maybe we should have a
toRootNumber function that accepts names without octaves. */
export const noteNumbers = {
    'C':  0, 'C♯': 1, 'C#': 1, 'D♭': 1, 'Db': 1, 'D': 2, 'D♯': 3, 'D#': 3, 'E♭': 3, 'Eb': 3, 'E': 4,
    'F':  5, 'F♯': 6, 'F#': 6, 'G♭': 6, 'Gb': 6, 'G': 7, 'G♯': 8, 'G#': 8, 'A♭': 8, 'Ab': 8, 'A': 9,
    'A♯': 10, 'A#': 10, 'B♭': 10, 'Bb': 10, 'B': 11
};

const rnotename   = /^([A-G][♭♯#b]?)(-?\d)$/;
const rnoteroot   = /^[A-G][♭♯#b]?/;
const rnoteoctave = /-?\d$/;

export function toNoteNumber(name) {
    if (typeof name === 'number') {
        return name;
    }

    var r = rnotename.exec(name);
    return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
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
        Number(noteNumbers[(rnoteoctave.exec(name) || nothing)[0]]) ;
}
