import { signedFloatToInt14, bytesToSignedFloat, bytesToWeightedFloat, limit  } from './maths.js';
import { toStatus as statusToChannel, toType as statusToType, toNoteNumber, toControlNumber } from './data.js';

/**
createMessage(channel, type, name, value)

Creates a MIDI message – a Uint8Array of three values – where `channel` is an
integer in the range `1`-`16` and `type` is a string that determines the meaning
of `name` and `value`...

#### for type `'noteon'` or `'noteoff'`:

- `name`: an integer in the range `0`-`127`, or a note name string eg. `'Eb4'`.
- `value`: a float in the range `0`-`1` representing velocity.

```
createMessage(1, 'noteon', 'C3', 0.75);
```

#### for type `'control'`:

- `name`: an integer in the range `0`-`127`, or a control name string eg. `'modulation'`.
- `value`: a float in the range `0`-`1` representing control value.

```
createMessage(1, 'control', 'modulation', 1);
```

#### for type `'pitch'`:

- `name`: a bend range in semitones.
- `value`: a positive or negative float within that range representing a pitch
  bend in semitones.

```
createMessage(1, 'pitch', 2, 0.25);
```

#### for type `'polytouch'`:

- `name`: an integer in the range `0`-`127`, or a note name string eg. `'Eb4'`.
- `value`: a float in the range `0`-`1` representing force.

```
createMessage(1, 'polytouch', 'C3', 0.25);
```

#### for type `'channeltouch'`:

- `name`: an integer in the range `0`-`1`.
- `value`: unused.

```
createMessage(1, 'channeltouch', 0.5);
```

#### for type `'program'`:

- `name`: an integer in the range `0`-`127`.
- `value`: unused.

```
createMessage(1, 'program', 24);
```

*/

function createNote(name, value, message) {
    message[1] = typeof name === 'string' ? toNoteNumber(name) : name ;
    message[2] = limit(0, 127, value * 127);
}

const createData = {
    'noteon': createNote,
    'noteoff': createNote,
    'polytouch': createNote,

    'channeltouch': function(name, value, message) {
        message[1] = limit(0, 127, value * 127);
        message[2] = 0;
    },

    'control': function(name, value, message) {
        message[1] = typeof name === 'string' ? toControlNumber(name) : name ;
        message[2] = limit(0, 127, value * 127);
    },

    'pitch': function(range, value, message) {
        const int14 = signedFloatToInt14(value/range);
		message[1] = int14 & 127; // LSB
		message[2] = int14 >> 7;  // MSB
    },

    'program': function(name, value, message) {
        message[1] = name;
        message[2] = 0;
    }
};

export function createMessage(channel, type, name, value) {
	var message = new Uint8Array(3);
	message[0] = toStatus(channel, type);
    createData[type](name, value, message);
    return message;
}

/**
isControl(message)
Returns `true` if message is a control change, otherwise `false`.
```js
isControl([145,80,20]);       // false
```
*/

export function isControl(message) {
	return message[0] > 175 && message[0] < 192 ;
}

/**
isNote(message)
Returns `true` where message is a noteon or noteoff, otherwise `false`.
```js
isNote([145,80,20]);           // true
```
**/

export function isNote(message) {
	return message[0] > 127 && message[0] < 160 ;
}

/**
isNoteOn(message)
Returns `true` where message is a noteon with velocity greater than `0`.
```js
isNoteOn([145,80,20]);         // true
```
**/

export function isNoteOn(message) {
    return message[0] > 143 && message[0] < 160 && message[2] > 0;
}

/**
isNoteOff(message)
Returns `true` where message is a noteoff, or a noteon with 0 velocity.
```js
isNoteOff([145,80,20]);        // false
```
**/

export function isNoteOff(message) {
        // Note off
    return (message[0] > 127 && message[0] < 144)
        // Note on with 0 velocity
        || (message[0] > 143 && message[0] < 160 && message[2] === 0) ;
}

/**
isPitch(message)
Returns `true` message is a pitch bend, otherwise `false`.
```js
isPitch([145,80,20]);          // false
```
**/

export function isPitch(message) {
	return message[0] > 223 && message[0] < 240 ;
}

/**
normalise(message)

Many instruments transmit `'noteon'` with velocity `0` rather than `'noteoff'`
messages. This is because MIDI allows messages with the same type to be sent
together, omitting the status byte and saving bandwidth. The MIDI spec requires
that both forms are treated identically. `normalise()` <em>mutates</em>
`'noteon'` messages with velocity `0` to `'noteoff'` messages, and passes all
other messages through unchanged.

```js
normalise([145,80,0]);  // [129,80,0]
```

Note that `MIDI.on(selector, fn)` normalises messages coming from the browser.
**/

export function normalise(message) {
	// If it's a noteon with 0 velocity, normalise it to a noteoff
	if (message[2] === 0 && message[0] > 143 && message[0] < 160) {
		message[0] -= 16;
	}

	return message;
}


/**
toChannel(message)
Returns the MIDI channel as a number between `1` and `16`.
```js
toChannel([145,80,20]);       // 2
```
**/

export function toChannel(message) {
    return statusToChannel(message[0]);
}


/**
toType(message)
Returns message type as one of the strings `'noteoff'`, `'noteon'`, `'polytouch'`,
`'control'`, `'program'`, `'channeltouch'` or `'pitch'`.
```js
toType([145,80,20]);          // 'noteon'
```
**/

export function toType(message) {
    const type = statusToType(message[0]);
    // Check for noteon with velocity 0
    return type === 'noteon' && message[2] === 0 ?
        'noteoff' :
        type ;
}


/**
toSignedFloat(message)
Returns a 14-bit message of the form `[status, msb, lsb]` as a signed float in
the range `-1` to `1`.
**/

export function toSignedFloat(message) {
    return bytesToSignedFloat(message[1], message[2]);
}

/**
toWeightedFloat(message)
Returns a 14-bit message of the form `[status, msb, lsb]` as a weighted float in
the range `0` to `1`.
**/

export function toWeightedFloat(message) {
    return bytesToWeightedFloat(message[1], message[2]);
}
