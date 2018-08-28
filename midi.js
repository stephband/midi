
import { print } from './modules/print.js';
print('       - http://github.com/stephband/midi');

export {
    bytesToInt14,
    bytesToSignedFloat,
    floatToInt7,
    floatToInt14,
    int7ToFloat,
    int7ToSignedFloat,
    int14ToFloat,
    int14ToSignedFloat,
    int14ToLSB,
    int14ToMSB,
    signedFloatToInt7,
    signedFloatToInt14
} from './modules/maths.js';

export {
    controlToNumber,
    frequencyToNumber,
    normaliseNote,
    noteToNumber,
    numberToControl,
    numberToFrequency,
    numberToNote,
    numberToOctave,
    toStatus
} from './modules/data.js';

export {
    createMessage,
    isControl,
    isNote,
    isPitch,
    normalise,
    toChannel,
    toType
} from './modules/messages.js';

export {
    on,
    off,
    trigger
} from './modules/events.js';

export * from './modules/midi.js';

import { request } from './modules/midi.js';

// Setup

request();
