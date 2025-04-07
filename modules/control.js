
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
    /*
    0: Bank Select (MSB)
    1: Modulation Wheel
    2: Breath Controller
    3: Undefined
    4: Foot Controller
    5: Portamento Time
    6: Data Entry (MSB)
    7: Channel Volume
    8: Balance
    9: Undefined
    10: Pan
    11: Expression Controller
    12: Effect Control 1
    13: Effect Control 2
    14-15: Undefined
    16-19: General Purpose Controllers 1-4
    20-31: Undefined
    32: Bank Select (LSB)
    33-63: LSBs for CCs 1-31
    64: Sustain Pedal (Damper)
    65: Portamento On/Off
    66: Sostenuto
    67: Soft Pedal
    68: Legato Footswitch
    69: Hold 2
    70: Sound Controller 1 (Sound Variation)
    71: Sound Controller 2 (Timbre/Harmonic Content)
    72: Sound Controller 3 (Release Time)
    73: Sound Controller 4 (Attack Time)
    74: Sound Controller 5 (Brightness)
    75-79: Sound Controllers 6-10
    80-83: General Purpose Controllers 5-8
    84-90: Undefined
    91: Effects 1 Depth (Reverb)
    92: Effects 2 Depth (Tremolo)
    93: Effects 3 Depth (Chorus)
    94: Effects 4 Depth (Detune)
    95: Effects 5 Depth (Phaser)
    96: Data Increment
    97: Data Decrement
    98: Non-Registered Parameter Number (LSB)
    99: Non-Registered Parameter Number (MSB)
    100: Registered Parameter Number (LSB)
    101: Registered Parameter Number (MSB)
    102-119: Undefined
    120: All Sound Off
    121: Reset All Controllers
    122: Local Control On/Off
    123: All Notes Off
    124: Omni Mode Off
    125: Omni Mode On
    126: Mono Mode On (Poly Off)
    127: Poly Mode On (Mono Off)
    */
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
    71:  'harmonics',
    72:  'release',
    73:  'attack',
    74:  'brightness',
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
