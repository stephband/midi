
export function clamp(min, max, n) {
    return n > max ? max : n < min ? min : n ;
}

/**
bytesToInt14(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a 14-bit integer in the range `0`-`16383`.

```js
bytesToInt14(0, 64);   // 8192
```
**/

export function bytesToInt14(lsb, msb) {
	// Pitch bend messages order data as [STATUS, LSB, MSB]
	return msb << 7 | lsb;
}

/**
bytesToFloat(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a float in the range `0`-`1`.

```js
bytesToFloat(0, 0);     // 0
bytesToFloat(0, 64);    // 0.50003051944
bytesToFloat(127, 127); // 1
```
*/

export function bytesToFloat(lsb, msb) {
	return int14ToFloat(bytesToInt14(lsb, msb));
}

/**
bytesToSignedFloat(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a float in the range `-1`-`1`, weighted so that
an input of (`0`, `64`) maps to `0`.

```js
bytesToSignedFloat(0, 0);     // -1
bytesToSignedFloat(0, 64);    // 0
bytesToSignedFloat(127, 127); // 1
```
*/

export function bytesToSignedFloat(lsb, msb) {
	return int14ToSignedFloat(bytesToInt14(lsb, msb));
}

/**
bytesToWeightedFloat(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a float in the range `0`-`1`, weighted so that
an input of (`0`, `64`) maps to `0.5`.

```js
bytesToWeightedFloat(0, 0);     // 0
bytesToWeightedFloat(0, 64);    // 0.5
bytesToWeightedFloat(127, 127); // 1
```
*/

export function bytesToWeightedFloat(lsb, msb) {
	return int14ToWeightedFloat(bytesToInt14(lsb, msb));
}

/**
floatToInt7(n)

Returns an integer in the 7-bit range `0`-`127` for values of `n` between `0`-`1`.
Values lower than `0` return `0`, while values greater than `1` return `127`.

    floatToInt7(0.5);      // 64
*/

export function floatToInt7(n) {
	return Math.round(clamp(0, 1, n) * 127);
}

/**
floatToInt14(n)

Returns an integer in the 14-bit range `0`-`16383` for values of `n` between `0`-`1`.
Values lower than `0` return `0`, while values greater than `1` return `16383`.

    floatToInt14(0.5);      // 8192
*/

export function floatToInt14(n) {
	return Math.round(clamp(0, 1, n) * 16383);
}

/**
int7ToFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`127`.

    int7ToFloat(64);      // 0.503937
*/

export function int7ToFloat(n) {
	return n / 127;
}

/**
int7ToWeightedFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`127`.
The input integer is mapped so that the value `64` returns exactly `0.5`, the
centre of the range, as per the MIDI spec for controller values and their ilk.

```js
int7ToWeightedFloat(0);    // 0
int7ToWeightedFloat(64);   // 0.5
int7ToWeightedFloat(127);  // 1
```
**/

export function int7ToWeightedFloat(n) {
	return n < 64 ? n / 128 : 0.5 + (n - 64) / 126 ;
}

/**
int7ToSignedFloat(n)

Returns a float in the range `-1`-`1` for values of `n` in the range `0`-`127`.
The input integer is mapped so that the value `64` returns `0`, the centre of
the range, as per the MIDI spec for controller values and their ilk.

```
int7ToSignedFloat(0);    // -1
int7ToSignedFloat(64);   // 0
int7ToSignedFloat(127);  // 1
```
**/

export function int7ToSignedFloat(n) {
	return n < 64 ? n / 64 - 1 : (n - 64) / 63 ;
}

/**
int14ToFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`16383`.

    int14ToFloat(8192);   // 0.500031
*/

export function int14ToFloat(n) {
	return n / 16383;
}

/**
int14ToWeightedFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`16383`.
The input integer is mapped so that the value `8192` returns `0.5`, the centre of
the range, as per the MIDI spec for pitch bend values and their ilk.

    int14ToWeightedFloat(0);      // 0
    int14ToWeightedFloat(8192);   // 0.5
    int14ToWeightedFloat(16383);  // 1
*/

export function int14ToWeightedFloat(n) {
	return n < 8192 ? n / 16384 : 0.5 + (n - 8192) / 16382 ;
}


/**
int14ToSignedFloat(n)

Returns a float in the range `-1`-`1` for values of `n` in the range `0`-`16383`.
The input integer is mapped so that the value `8192` returns `0`, the centre of
the range, as per the MIDI spec for pitch bend values and their ilk.

```js
int14ToSignedFloat(0);      // -1
int14ToSignedFloat(8192);   // 0
int14ToSignedFloat(16383);  // 1
```
*/

export function int14ToSignedFloat(n) {
	return n < 8192 ? n / 8192 - 1 : (n - 8192) / 8191 ;
}

/**
int14ToLSB(n)

Returns the least significant 7-bit data byte of an unsigned 14-bit integer (in
the range `0`-`16383`).

```js
int14ToLSB(8192);            // 0
```

Out-of-range input values will return spurious results.
*/

export function int14ToLSB(n) {
	return n & 127;
}

/**
int14ToMSB(n)

Returns the most significant 7-bit data byte of an unsigned 14-bit integer (in
the range `0`-`16383`).

```js
int14ToMSB(8192);      // 64
```

Out-of-range input values will return spurious results.
*/

export function int14ToMSB(n) {
	return n >> 7;
}

/**
signedFloatToInt7(n)

Returns an integer in the 7-bit range `0`-`127` for values of `n` between
`-1`-`1`. The input value `0` maps exactly to the value `64`, as per
the MIDI spec for modulation control values and their ilk.

    signedFloatToInt7(-1); // 0
    signedFloatToInt7(0);  // 64
    signedFloatToInt7(1);  // 127

Values lower than `-1` return `0`, while values greater than `1` return `127`.
*/

export function signedFloatToInt7(n) {
	return n < 0 ?
        n < -1 ? 0 : Math.round((1 + n) * 64) :
        n > 1 ? 127 : 64 + Math.round(n * 63) ;
}

/**
signedFloatToInt14(n)

Returns an integer in the 14-bit range `0`-`16383` for values of `n` between
`-1`-`1`. The input value `0` maps exactly to the value `8192`, as per
the MIDI spec for pitch bend values and their ilk.

    signedFloatToInt14(-1); // 0
    signedFloatToInt14(0);  // 8192
    signedFloatToInt14(1);  // 16383

Values lower than `-1` return `0`, while values greater than `1` return `16383`.

*/

export function signedFloatToInt14(n) {
	return n < 0 ?
        n < -1 ? 0 : Math.round((1 + n) * 8192) :
        n > 1 ? 16383 : 8192 + Math.round(n * 8191) ;
}

/**
weightedFloatToInt7(n)

Returns an integer in the 7-bit range `0`-`127` for values of `n` between
`0`-`1`. The input value `0.5` maps exactly to the value `64`, as per
the MIDI spec for modulation control values and their ilk.

    weightedFloatToInt7(0);   // 0
    weightedFloatToInt7(0.5); // 64
    weightedFloatToInt7(1);   // 127

Values lower than `-1` return `0`, while values greater than `1` return `127`.
*/

export function weightedFloatToInt7(n) {
	return n <= 0.5 ?
        n <= 0 ? 0 : Math.round(n * 128) :
        n >= 1 ? 127 : 64 + Math.round((n - 0.5) * 126) ;
}

/**
weightedFloatToInt14(n)

Returns an integer in the 14-bit range `0`-`16383` for values of `n` between
`-1`-`1`. The input value `0` maps exactly to the value `8192`, as per
the MIDI spec for pitch bend values and their ilk.

    weightedFloatToInt14(0);   // 0
    weightedFloatToInt14(0.5); // 8192
    weightedFloatToInt14(1);   // 16383

Values lower than `-1` return `0`, while values greater than `1` return `16383`.
*/

export function weightedFloatToInt14(n) {
	return n <= 0.5 ?
        n <= 0 ? 0 : Math.round(n * 16384) :
        n >= 1 ? 16383 : 8192 + Math.round((n - 0.5) * 16382) ;
}
