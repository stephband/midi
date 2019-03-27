import { signedFloatToInt14, limit  } from './maths.js';
import { toStatus, noteToNumber, controlToNumber, statuses } from './data.js';

/*
createMessage(chan, type, param, value)

Creates a MIDI message – a Uint8Array of three values – where channel `chan` is an
integer in the range `1`-`16` and `type` is a string that determines the meaning
of `param` and `value`...

#### Create type `'noteon'` or `'noteoff'`:

- `param`: an integer in the range `0`-`127`, or a note name string eg. `'Eb4'`.
- `value`: a float in the range `0`-`1` representing velocity.

```
createMessage(1, 'noteon', 'C3', 0.75);
```

#### Create type `'control'`:

- `param`: an integer in the range `0`-`127`, or a control name string eg. `'modulation'`.
- `value`: a float in the range `0`-`1` representing control value.

```
createMessage(1, 'control', 'modulation', 1);
```

#### Create type `'pitch'`:

- `param`: a bend range in semitones.
- `value`: a positive or negative float within that range representing a pitch
  bend in semitones.

```
createMessage(1, 'pitch', 2, 0.25);
```

#### Create type `'polytouch'`:

- `param`: an integer in the range `0`-`127`, or a note name string eg. `'Eb4'`.
- `value`: a float in the range `0`-`1` representing force.

```
createMessage(1, 'polytouch', 'C3', 0.25);
```

#### Create type `'channeltouch'`:

- `param`: an integer in the range `0`-`1`.
- `value`: unused.

```
createMessage(1, 'channeltouch', 0.5);
```

#### Create type `'program'`:

- `param`: an integer in the range `0`-`127`.
- `value`: unused.

```
createMessage(1, 'program', 24);
```

*/

function createNote(param, value, message) {
    message[1] = typeof param === 'string' ? noteToNumber(param) : param ;
    message[2] = limit(0, 127, value * 127);
}

const creators = {
    'noteon': createNote,
    'noteoff': createNote,
    'polytouch': createNote,

    'channeltouch': function(param, value, message) {
        message[1] = limit(0, 127, value * 127);
        message[2] = 0;
    },

    'control': function(param, value, message) {
        message[1] = typeof param === 'string' ? controlToNumber(param) : param ;
        message[2] = limit(0, 127, value * 127);
    },

    'pitch': function(param, value, message) {
        const int14 = signedFloatToInt14(value/param);
		message[1] = int14 & 127; // LSB
		message[2] = int14 >> 7;  // MSB
    },

    'program': function(param, value, message) {
        message[1] = param;
        message[2] = 0;
    }
};

export function createMessage(channel, type, param, value) {
	var message = new Uint8Array(3);
	message[0] = toStatus(channel, type);
    creators[type](param, value, message);
    return message;
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
isNote(message)

Returns `true` where message is a noteon or noteoff, otherwise `false`.

    isNote([145,80,20]);           // true
*/

export function isNote(message) {
	return message[0] > 127 && message[0] < 160 ;
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
normalise(message)

Many keyboards transmit `'noteon'` with velocity `0` rather than `'noteoff'`
messages. This is because MIDI allows messages with the same type to be sent
together, omitting the status byte and saving bandwidth. The MIDI spec requires
that both forms are treated identically. `normalise()` <em>mutates</em>
`'noteon'` messages with velocity `0` to `'noteoff'` messages.

    normalise([145,80,0]);  // [129,80,0]

Note that the MIDI library automatically normalises incoming messages.
*/

export function normalise(message) {
	// If it's a noteon with 0 velocity, normalise it to a noteoff
	if (message[2] === 0 && message[0] > 143 && message[0] < 160) {
		message[0] -= 16;
	}

	return message;
}

/*
toChannel(message)

Returns the MIDI channel as a number between `1` and `16`.

    toChannel([145,80,20]);       // 2
*/

export function toChannel(message) {
	return message[0] % 16 + 1;
}

/* toType(message)

Returns message type as one of the strings `'noteoff'`, `'noteon'`, `'polytouch'`,
`'control'`, `'program'`, `'channeltouch'` or `'pitch'`.

    toType([145,80,20]);          // 'noteon'.
*/

const types = Object.keys(statuses);

export function toType(message) {
	var name = types[Math.floor(message[0] / 16) - 8];

	// Catch type noteon with zero velocity and rename it as noteoff
	return name;
    //name === types[1] && message[2] === 0 ?
	//	types[0] :
	//	name ;
}
