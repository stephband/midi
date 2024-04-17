
/**
normaliseNoteName(name)

Replaces the characters `'b'` and `'#'` with the unicode musical characters `'♭'`
and `'♯'` respectively.

    normaliseNoteName('Eb6');      // 'E♭6'
*/

const rTextSymbol    = /b|#/g;
const unicodeSymbols = { 'b': '♭', '#': '♯' };

function replaceSymbol($0) {
    return unicodeSymbols[$0];
}

export function normaliseNoteName(name) {
    return name.replace(rTextSymbol, replaceSymbol);
}


/**
toNoteNumber(name)

Given a note name, returns a value in the range 0-127.

    toNoteNumber('D6');     // 86
*/

const noteNumbers = {
    'C':  0, 'C♯': 1, 'C#': 1, 'D♭': 1, 'Db': 1, 'D': 2, 'D♯': 3, 'D#': 3, 'E♭': 3, 'Eb': 3, 'E': 4,
    'F':  5, 'F♯': 6, 'F#': 6, 'G♭': 6, 'Gb': 6, 'G': 7, 'G♯': 8, 'G#': 8, 'A♭': 8, 'Ab': 8, 'A': 9,
    'A♯': 10, 'A#': 10, 'B♭': 10, 'Bb': 10, 'B': 11
};

const rnotename   = /^([A-G][♭♯#b]?)(-?\d)$/;

export function toNoteNumber(name) {
    if (typeof name === 'number') {
        return name;
    }

    var r = rnotename.exec(name);
    return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
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
toNoteOctave(n)
Where `n` is a note number, returns the numerical octave.
    toNoteOctave(69);     // 4
*/

export function toNoteOctave(n) {
    return Math.floor(n / 12) - 1;
}
