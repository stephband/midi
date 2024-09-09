
const A4 = 69;

export function frequencyToFloat(freq, ref = 440) {
    var number = A4 + 12 * Math.log(freq / ref) / Math.log(2);

    // Rounded it to nearest 32-bit value to avoid floating point errors
    // and return whole semitone numbers where possible.
    return Math.fround(number);
}
