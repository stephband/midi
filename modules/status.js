
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

const types = Object.keys(statuses);


/**
toStatus(channel, type)

Given a `channel` in the range `1`-`16` and type, returns the MIDI message
status byte.

    toStatus(1, 'noteon');      // 144
    toStatus(7, 'control');     // 183
*/

export function toStatus(channel, type) {
    return channel > 0
        && channel < 17
        && statuses[type] + channel - 1 ;
}


/**
toChannel(status)
Returns the MIDI channel as a number between `1` and `16`.
```js
toChannel(145);       // 2
```
**/

export function toChannel(status) {
    return status % 16 + 1;
}


/**
toType(status)

Returns message type as one of the strings `'noteoff'`, `'noteon'`, `'polytouch'`,
`'control'`, `'program'`, `'channeltouch'` or `'pitch'`.

```js
toType(145);          // 'noteon'.
```
*/

export function toType(status) {
    return types[Math.floor(status / 16) - 8];
}
