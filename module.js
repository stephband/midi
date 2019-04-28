
import { print } from './modules/print.js';
print('       - http://github.com/stephband/midi');

export {
    bytesToInt14,
    bytesToFloat,
    bytesToSignedFloat,
    bytesToWeightedFloat,
    floatToInt7,
    floatToInt14,
    int7ToFloat,
    int7ToWeightedFloat,
    int7ToSignedFloat,
    int14ToFloat,
    int14ToWeightedFloat,
    int14ToSignedFloat,
    int14ToLSB,
    int14ToMSB,
    signedFloatToInt7,
    signedFloatToInt14,
    weightedFloatToInt7,
    weightedFloatToInt14
} from './modules/maths.js';

export {
    toControlNumber,
    frequencyToFloat,
    normaliseNoteName,
    toNoteNumber,
    toControlName,
    floatToFrequency,
    toNoteName,
    toNoteOctave,
    toStatus,
    toChannel,
    toType
} from './modules/data.js';

export {
    createMessage,
    isControl,
    isNote,
    isPitch,
    normalise
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
