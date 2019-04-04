'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const noop = function() {};

const print = window.console ?
    console.log.bind(console, '%cMIDI %c%s', 'color: #d8a012; font-weight: 600;', 'color: #c1a252; font-weight: 300;') :
    noop ;

const printGroup = window.console ?
    console.groupCollapsed.bind(console, '%cMIDI %c%s', 'color: #d8a012; font-weight: 600;', 'color: #c1a252; font-weight: 300;') :
    noop ;

const printGroupEnd = window.console ?
    console.groupEnd.bind(console) :
    noop ;

function limit(min, max, n) {
    return n > max ? max : n < min ? min : n ;
}

/*
bytesToInt14(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a 14-bit integer in the range `0`-`16383`.

    bytesToInt14(0, 64);   // 8192
*/

function bytesToInt14(lsb, msb) {
	// Pitch bend messages order data as [STATUS, LSB, MSB]
	return msb << 7 | lsb;
}

/*
bytesToSignedFloat(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a float in the range `-1`-`1`.

    bytesToSignedFloat(0, 64);   // 0
*/

function bytesToSignedFloat(lsb, msb) {
	return int14ToSignedFloat(bytesToInt14(lsb, msb));
}

/*
floatToInt7(n)

Returns an integer in the 7-bit range `0`-`127` for values of `n` between `0`-`1`.
Values lower than `0` return `0`, while values greater than `1` return `127`.

    floatToInt7(0.5);      // 64
*/

function floatToInt7(n) {
	return Math.round(limit(0, 1, n) * 127);
}

/*
floatToInt14(n)

Returns an integer in the 14-bit range `0`-`16383` for values of `n` between `0`-`1`.
Values lower than `0` return `0`, while values greater than `1` return `16383`.

    floatToInt14(0.5);      // 8192
*/

function floatToInt14(n) {
	return Math.round(limit(0, 1, n) * 16383);
}

/*
int7ToFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`16383`.

    int7ToFloat(64);      // 0.503937
*/

function int7ToFloat(n) {
	return n / 127;
}

/*
int7ToSignedFloat(n)

Returns a float in the range `-1`-`1` for values of `n` in the range `0`-`127`.
The input integer is mapped so that the value `64` returns `0`, the centre of
the range, as per the MIDI spec for modulation controller values and their ilk.

    int7ToSignedFloat(0);    // -1
    int7ToSignedFloat(64);   // 0
    int7ToSignedFloat(127);  // 1
*/

function int7ToSignedFloat(n) {
	return n < 64 ? n / 64 - 1 : (n - 64) / 63 ;
}

/*
int14ToFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`16383`.

    int14ToFloat(8192);   // 0.500031
*/

function int14ToFloat(n) {
	return n / 16383;
}

/*
int14ToSignedFloat(n)

Returns a float in the range `-1`-`1` for values of `n` in the range `0`-`16383`.
The input integer is mapped so that the value `8192` returns `0`, the centre of
the range, as per the MIDI spec for pitch bend values and their ilk.

    int14ToSignedFloat(0);      // -1
    int14ToSignedFloat(8192);   // 0
    int14ToSignedFloat(16383);  // 1
*/

function int14ToSignedFloat(n) {
	return n < 8192 ? n / 8192 - 1 : (n - 8192) / 8191 ;
}

/*
int14ToLSB(n)

Returns the least significant 7-bit data byte of an unsigned 14-bit integer.

    int14ToLSB(8192);      // 0

Out-of-range input values will return spurious results.
*/

function int14ToLSB(n) {
	return n & 127;
}

/*
int14ToMSB(n)

Returns the most significant 7-bit data byte of an unsigned 14-bit integer in
the range `0`-`16383`

    int14ToMSB(8192);      // 64

Out-of-range input values will return spurious results.
*/

function int14ToMSB(n) {
	return n >> 7;
}

/*
signedFloatToInt7(n)

Returns an integer in the 7-bit range `0`-`127` for values of `n` between
`-1`-`1`. The input value `0` maps exactly to the value `64`, as per
the MIDI spec for modulation control values and their ilk.

    signedFloatToInt7(-1); // 0
    signedFloatToInt7(0);  // 64
    signedFloatToInt7(1);  // 127

Values lower than `-1` return `0`, while values greater than `1` return `127`.
*/

function signedFloatToInt7(n) {
	return n < 0 ?
        n < -1 ? 0 : Math.round((1 + n) * 64) :
        n > 1 ? 127 : 64 + Math.round(n * 63) ;
}

/*
signedFloatToInt14(n)

Returns an integer in the 14-bit range `0`-`16383` for values of `n` between
`-1`-`1`. The input value `0` maps exactly to the value `8192`, as per
the MIDI spec for pitch bend values and their ilk.

    signedFloatToInt14(-1); // 0
    signedFloatToInt14(0);  // 8192
    signedFloatToInt14(1);  // 16383

Values lower than `-1` return `0`, while values greater than `1` return `16383`.

*/

function signedFloatToInt14(n) {
	return n < 0 ?
        n < -1 ? 0 : Math.round((1 + n) * 8192) :
        n > 1 ? 16383 : 8192 + Math.round(n * 8191) ;
}

const entries = Object.entries;
const A4      = 69;

/*
controlToNumber(name)

Returns a value in the range `0`-`127` from a shorthand controller `name`.

    controlToNumber('volume')   // 7
	controlToNumber('sustain')  // 64
	controlToNumber('98')       // 98
*/

function controlToNumber(name) {
	const entry = entries(controlNames).find(function(entry) {
		return entry[1] === name;
	});

	return entry ? parseInt(entry[0], 10) : parseInt(name, 10);
}

/*
frequencyToNumber(refFreq, freq)

Returns `freq` as a float on the note number scale. `refFreq` is a reference
frequency for middle A4/69 (usually `440`).

    frequencyToNumber(440, 220);  // 57 (A3)
	frequencyToNumber(440, 110);  // 45 (A2)

Accuracy is limited to a 0.000001 semitones to prevent floating point
rounding errors screwing up round-trip calculations.
*/

function frequencyToNumber(ref, freq) {
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

function normaliseNote(name) {
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

function noteToNumber(str) {
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

function numberToControl(n) {
	return controlNames[n] || ('' + n);
}

/*
numberToFrequency(refFreq, n)

Given a note number `n`, returns the frequency of the fundamental tone of that
note. `refFreq` is a reference frequency for middle A4/69 (usually `440`).

    numberToFrequency(440, 69);  // 440
    numberToFrequency(440, 60);  // 261.625565
    numberToFrequency(442, 69);  // 442
    numberToFrequency(442, 60);  // 262.814772
*/

function numberToFrequency(ref, n) {
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

function numberToNote(n) {
	return noteNames[n % 12] + numberToOctave(n);
}

/*
numberToOctave(n)

Where `n` is a note number, returns the numerical octave.

    numberToOctave(69);     // 4
*/

function numberToOctave(n) {
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

const statuses = {
	noteoff:      128,
	noteon:       144,
	polytouch:    160,
	control:      176,
	program:      192,
	channeltouch: 208,
	pitch:        224,
};

function toStatus(channel, type) {
	return channel > 0
		&& channel < 17
		&& statuses[type] + channel - 1 ;
}

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

function createMessage(channel, type, param, value) {
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

function isControl(message) {
	return message[0] > 175 && message[0] < 192 ;
}

/*
isNote(message)

Returns `true` where message is a noteon or noteoff, otherwise `false`.

    isNote([145,80,20]);           // true
*/

function isNote(message) {
	return message[0] > 127 && message[0] < 160 ;
}

/*
isPitch(message)

Returns `true` message is a pitch bend, otherwise `false`.

    isPitch([145,80,20]);          // false
*/

function isPitch(message) {
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

function normalise(message) {
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

function toChannel(message) {
	return message[0] % 16 + 1;
}

/* toType(message)

Returns message type as one of the strings `'noteoff'`, `'noteon'`, `'polytouch'`,
`'control'`, `'program'`, `'channeltouch'` or `'pitch'`.

    toType([145,80,20]);          // 'noteon'.
*/

const types = Object.keys(statuses);

function toType(message) {
	var name = types[Math.floor(message[0] / 16) - 8];

	// Catch type noteon with zero velocity and rename it as noteoff
	return name;
    //name === types[1] && message[2] === 0 ?
	//	types[0] :
	//	name ;
}

// Utilities

function toArgsLength() {
    return arguments.length;
}

function overload(fn, map) {
    return function overload() {
        const key     = fn.apply(null, arguments);
        const handler = (map[key] || map.default);
        //if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
        return handler.apply(this, arguments);
    };
}

function remove(array, value) {
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
}

const performance = window.performance;


// Routing

const roots = {};

function fire(e) {
    normalise(e.data);

    // Fire port-specific listeners, if there are any
    const portRoot = roots[e.target && e.target.id];
	if (portRoot) { fireRoute(0, portRoot, e); }

    // Fire port-generic listeners, if there are any
    const allRoot = roots['undefined'];
    if (allRoot) { fireRoute(0, allRoot, e); }
}

function fireRoute(i, tree, e) {
	var name   = e.data[i++];
	var branch = tree[name];

	if (name === undefined) {
		branch && branch.forEach((fn) => fn(e));
	}
	else {
		branch && fireRoute(i, branch, e);
		tree['undefined'] && tree['undefined'].forEach((fn) => fn(e));
	}
}

function getRoute(i, query, object) {
	var name   = query[i++];
	var branch = object[name];

	return name === undefined ?
		branch :
		branch && getRoute(i, query, branch) ;
}

function setRoute(i, query, object, fn) {
	var name   = query[i++];
	var branch = object[name];

	return name === undefined ?
		branch ? branch.push(fn) : (object[name] = [fn]) :
		setRoute(i, query, branch || (object[name] = {}), fn) ;
}

function removeRoute(query, root, fn) {
	var fns = getRoute(0, query, root);
	if (!fns) { return; }
	remove(fns, fn);
}

const query = {};

function toNoteQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = typeof selector[2] === 'string' ?
		noteToNumber(selector[2]) :
		selector[2] ;
	query[2] = selector[3];
	return query;
}

function toControlQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = typeof selector[2] === 'string' ?
		controlToNumber(selector[2]) :
		selector[2] ;
	query[2] = selector[3];
	return query;
}

function toQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = selector[2];
	query[2] = selector[3];
	return query;
}

// Transforms

function get1(object) { return object[1]; }
function type1(object) { return typeof object[1]; }



//createEvent(time, port, message)
//
//Creates a MIDI event object from `time` (a DOM time), `port` (an MIDI port or
//the id of a MIDI port) and `message` (a MIDI message). While event objects
//are not actual DOM event objects, they deliberately mirror the structure of
//incoming event objects.
//
//    createEvent(2400.56, 'id', [144, 69, 96])
//
//    // {
//    //     timeStamp: 2400.56,
//    //     port: MIDIPort[id],
//    //     data: [144, 69, 96]
//    // }
//
//Event objects are pooled to avoid creating large numbers of objects, and they
//become invalid when DOM time advances beyond their `timeStamp`. If you need
//to store them, they should be cloned.

const eventInvalidationTime = 500;
const events = [];

let now;

function isOutOfDate(e) {
	return e.timeStamp < now;
}

function createEvent(time, port, message) {
	// Allow a margin of error for event invalidation
	now = performance.now() + eventInvalidationTime;

    // Find an unused event object in the pool
	let e = events.find(isOutOfDate);

    // If there is none, create one
	if (!e) {
		e = {};
		events.push(e);
	}

    // Assign it some data
	e.timeStamp = time;
	e.target    = port;
	e.data      = message;

	return e;
}

/*
on(selector, fn)

Registers a handler `fn` for incoming MIDI events that match object `selector`.

    on([1, 'note'], function(e) {
        // Do something with CH1 NOTEON and NOTEOFF event objects
        const time    = e.timeStamp;
        const port    = e.target;
        const message = e.data;
    });

A selector is either an array in the form of a MIDI message
`[status, data1, data2]`:

    // Call fn on CH1 NOTEON events
	on([144], fn);

    // Call fn on CH1 NOTEON C4 events
	on([144, 60], fn);

    // Call fn on CH1 NOTEON C4 127 events
	on([144, 60, 127], fn);

or more conveniently an array of interpretive data of the form
`[chan, type, param, value]`:

    // Call fn on CH2 NOTEON events
	on([2, 'noteon'], fn);

    // Call fn on CH2 NOTEOFF C4 events
	on([2, 'noteoff', 'C4'], fn)

    // Call fn on CH2 NOTEON and NOTEOFF C4 events
	on([2, 'note', 'C4'], fn)

Finally, a selector may have a property `port`, the id of an input port.

    // Call fn on CH4 CC events from port '012345'
	on({ port: '012345', 0: 4, 1: 'control' }}, fn);

    // Call fn on CH4 CC 64 events from port '012345'
	on({ port: '012345', 0: 4, 1: 'control', 2: 64 }}, fn);

Selectors pre-create paths in a filter tree through which incoming events flow,
for performance.
*/

const setSelectorRoute = overload(type1, {
	'string': overload(get1, {
		'note': function(selector, root, fn) {
			var query = toNoteQuery(selector);

			query[0] = toStatus(selector[0], 'noteon');
			setRoute(0, query, root, fn);

			query[0] = toStatus(selector[0], 'noteoff');
			setRoute(0, query, root, fn);
		},

		'noteon': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			setRoute(0, query, root, fn);
		},

		'noteoff': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			setRoute(0, query, root, fn);
		},

        'polytouch': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			setRoute(0, query, root, fn);
		},

		'control': function(selector, root, fn) {
			const query = toControlQuery(selector);
			setRoute(0, query, root, fn);
		},

		'default': function(selector, root, fn) {
			var query = toQuery(selector);
			setRoute(0, query, root, fn);
		}
	}),

	'default': function(query, root, fn) {
		setRoute(0, query, root, fn);
	}
});

function on(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = roots[id] || (roots[id] = {});
    setSelectorRoute(selector, root, fn);
}

/*
off(selector, fn)

Removes an event listener 'fn' from MIDI events matching object 'selector'. Where
'fn' is not given, removes all handlers from events matching the selector.

    off(['note'], fn);
*/

const removeSelectorRoute = overload(type1, {
	'string': overload(get1, {
		'note': function(selector, root, fn) {
			var query = toNoteQuery(selector);

			query[0] = toStatus(selector[0], 'noteon');
			removeRoute(query, root, fn);

			query[0] = toStatus(selector[0], 'noteoff');
			removeRoute(query, root, fn);
		},

		'noteon': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			removeRoute(query, root, fn);
		},

		'noteoff': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			removeRoute(query, root, fn);
		},

        'polytouch': function(selector, root, fn) {
			var query = toNoteQuery(selector);
			setRoute(query, root, fn);
		},

		'default': function(selector, root, fn) {
			var query = toQuery(selector);
			removeRoute(query, root, fn);
		}
	}),

	'default': function(query, root, fn) {
		removeRoute(query, root, fn);
	}
});

function off(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = roots[id] || (roots[id] = {});
    removeSelectorRoute(selector, root, fn);
}

/*
trigger(port, message)

Simulates an incoming MIDI message and fires listeners with matching selectors.
Useful for debugging.

    trigger(null, [128, 69, 88]);
*/

/*
trigger(port, chan, type, param, value)

As `trigger(port, message)`, where the last 4 parameters are passed to
`createMessage()` to create the MIDI message before triggering.

    trigger(null, 1, 'noteon', 'A4', 0.75);
*/

const internalPort = {
    id: 'INTERNAL'
};

const trigger = overload(toArgsLength, {
    1: fire,

	2: function(port, message) {
		const e = createEvent(performance.now(), port ? port : internalPort, message);
		fire(e);
	},

    default: function(port, chan, type, param, value) {
		const message = createMessage(chan, type, param, value);
		const e       = createEvent(performance.now(), port ? port : internalPort, message);
		fire(e);
	}
});

const empty = new Map();

let midi = {
    inputs: empty,
    outputs: empty
};

/*
inputs()

Returns the map of MIDI input ports from the underlying MIDIAccess object.
*/

function inputs() {
    return midi.inputs;
}

/*
getInput(id)

Returns an input port by id.
*/

function getInput(id) {
    return midi.inputs.get(id);
}

/*
outputs()

Returns the map of MIDI output ports from the underlying MIDIAccess object.
*/

function outputs() {
    return midi.outputs;
}

/*
getOutput(id)

Returns an output port by id.
*/

function getOutput(id) {
    return midi.outputs.get(id);
}

/*
request()

Returns a promise that resolves to the midiAccess object where it is
available. Where the underlying `navigator.requestMIDIAccess()` method is
undefined, or where MIDI is unavailable for some reason, returns a rejected
promise. Library functions are available to use without requesting the midiAccess
object, but this request is useful for alerting the user.

    request().catch(function(error) {
        // Alert the user they don't have MIDI
    });
*/

function listen(port) {
	// It's suggested here that we need to keep a reference to midi inputs
	// hanging around to avoid garbage collection:
	// https://code.google.com/p/chromium/issues/detail?id=163795#c123
	//store.push(port);

	port.onmidimessage = fire;
}

function unlisten(port) {
    // Free port up for garbage collection.
	//const i = store.indexOf(port);
    //if (i > -1) { store.splice(i, 1); }

	port.onmidimessage = null;
}

function setup(midi) {
	var entry, port;

	for (entry of midi.inputs) {
		port = entry[1];

        { print(port.type + ' ' + port.state, port); }

        if (port.state === 'connected') {
            listen(port);
        }
	}

	for (entry of midi.outputs) {
		port = entry[1];
        { print(port.type + ' ' + port.state, port); }
	}
}

function statechange(e) {
	var port = e.port;

    { print(port.type + ' ' + port.state, port); }

    if (port.type === 'input') {
        if (port.state === 'connected') {
            listen(port);
        }
        else {
            unlisten(port);
        }
    }
}

let promise;

function request() {
	// Cache the request so there's only ever one
	return promise || (promise = navigator.requestMIDIAccess ?
		navigator
		.requestMIDIAccess()
		.then(function(midiAccess) {
            { printGroup('initialise MIDI access'); }

            midi = midiAccess;
            setup(midi);
            midi.onstatechange = statechange;

			{ printGroupEnd(); }
			return midi;
		}, function(e) {
            print('access denied');
		}) :
		Promise.reject("This browser does not support Web MIDI.")
	);
}

function findOutputPort(string) {
    string = string.toLowercase();

    // At this point, string is not an id of a port nor an actual port.
    // We're going to try and find it by name
    let entry;

    for (entry of midi.outputs) {
        const port = entry[1];
        const name = port.name && port.name.toLowercase();

        if (name.startsWith(string)) {
            return port;
        }
    }

    for (entry of midi.outputs) {
        const port = entry[1];
        const manu = port.manufacturer && port.manufacturer.toLowercase();

        if (manu.startsWith(string)) {
            return port;
        }
    }
}

/*
send(event)

Cues a message to be sent to an output port. The object `event` must have the
same structure as an incoming MIDI event object:

    send({
        target:    // a MIDI output port
        timeStamp: // a DOM timeStamp
        data:      // a MIDI message
    });

If `timeStamp` is in the past the message is sent immediately.
*/

function sendEvent(e) {
    // Spec example:
    // https://webaudio.github.io/web-midi-api/#sending-midi-messages-to-an-output-device
    e.target.send(e.data, e.timeStamp);
}

/*
send(time, port, message)

Cues a `message` to be sent to an output `port`. Where `time` is in the past
the message is sent immediately. `port` may be a MIDI output port or the
id of a MIDI output port.

    send(0, 'id', [144, 69, 96]);
*/

function sendMessage(time, port, message) {
    if (typeof port === 'string') {
        port = midi.inputs.get(port) || findOutputPort(port);

        if (!port) {
            print('Output port not found', port);
        }
    }

    port.send(message, time);
}

/*
send(time, port, chan, type, param, value)

Like `send(time, port, message)`, but the last 4 parameters are passed to
`createMessage()` to create the MIDI message before sending.

    send(0, 'id', 1, 'noteon', 'A4', 0.75);
*/

function sendParams(time, port, chan, type, param, value) {
    const message = createMessage(chan, type, param, value);
    return sendMessage(time, port, message);
}

const send = overload(toArgsLength, {
    1: sendEvent,
    3: sendMessage,
    default: sendParams
});

print('       - http://github.com/stephband/midi');

// Setup

request();

exports.bytesToInt14 = bytesToInt14;
exports.bytesToSignedFloat = bytesToSignedFloat;
exports.controlToNumber = controlToNumber;
exports.createMessage = createMessage;
exports.floatToInt14 = floatToInt14;
exports.floatToInt7 = floatToInt7;
exports.frequencyToNumber = frequencyToNumber;
exports.getInput = getInput;
exports.getOutput = getOutput;
exports.inputs = inputs;
exports.int14ToFloat = int14ToFloat;
exports.int14ToLSB = int14ToLSB;
exports.int14ToMSB = int14ToMSB;
exports.int14ToSignedFloat = int14ToSignedFloat;
exports.int7ToFloat = int7ToFloat;
exports.int7ToSignedFloat = int7ToSignedFloat;
exports.isControl = isControl;
exports.isNote = isNote;
exports.isPitch = isPitch;
exports.normalise = normalise;
exports.normaliseNote = normaliseNote;
exports.noteToNumber = noteToNumber;
exports.numberToControl = numberToControl;
exports.numberToFrequency = numberToFrequency;
exports.numberToNote = numberToNote;
exports.numberToOctave = numberToOctave;
exports.off = off;
exports.on = on;
exports.outputs = outputs;
exports.request = request;
exports.send = send;
exports.sendEvent = sendEvent;
exports.signedFloatToInt14 = signedFloatToInt14;
exports.signedFloatToInt7 = signedFloatToInt7;
exports.statuses = statuses;
exports.toChannel = toChannel;
exports.toStatus = toStatus;
exports.toType = toType;
exports.trigger = trigger;
