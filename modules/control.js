
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

export const names = {
	0:   'bank',
	1:   'modulation',
	2:   'breath',
	4:   'foot',
	5:   'portamento',
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

export const numbers = Object.entries(names).reduce((numbers, [number, name]) => {
    numbers[name] = parseInt(number, 10);
    return numbers;
}, {});


export function toControlName(n) {
	return names[n] || ('' + n);
}


/**
toControlNumber(name)

Returns a value in the range `0`-`127` from a shorthand controller `name`.

    toControlNumber('volume')   // 7
	toControlNumber('sustain')  // 64
	toControlNumber('98')       // 98
*/

export function toControlNumber(name) {
	return numbers[name] || +name;
}
