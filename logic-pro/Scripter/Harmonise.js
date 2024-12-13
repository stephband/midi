
/* PluginParameters MUST be declared as a var. */

var PluginParameters = [];


/* Helpers */

function noop() {}
function normalise(min, max, value) { return (value - min) / (max - min); }
function denormalise(min, max, value) { return value * (max - min) + min; }

function postpad(chars, n, value) {
    var string = value + '';

    while (string.length < n) {
        string = string + chars;
    }

    return string.slice(0, n);
}

/* MIDI */

function isNote(e)     { return e instanceof Note; }
function isNoteOn(e)   { return e instanceof NoteOn; }
function isNoteOff(e)  { return e instanceof NoteOff; }
function isPitch(e)    { return e instanceof PitchBend; }
function isControl(e)  { return e instanceof ControlChange; }
function isPressure(e) { return e instanceof PolyPressure; }

function createNoteOn(pitch, velocity) {
    var event = new NoteOn();
    event.pitch    = pitch;
    event.velocity = Math.round(velocity * 127);
    return event;
}

function createNoteOff(pitch) {
    var event = new NoteOff();
    event.pitch = pitch;
    return event;
}

function createPitchBend(value) {
    var event = new PitchBend();
    event.value = Math.round(value > 0 ?
        value * 8191 :
        value * 8192
    );
    return event;
}

function createControlChange(number, value = 0) {
    var event = new ControlChange();
    event.number = number;
    event.value  = value;
    return event;
}

function createTargetEvent(name, value) {
    var event = new TargetEvent();
    event.target = name;
    event.value  = value;
    return event;
}


/* UI */

const channels       = ['Off', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', 'All'];
const names          = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const ranges         = Array.from({ length: 13 }, (v, i) => i + '');
const controllers    = Array.from({ length: 128 }, (v, i) => postpad(' ', 4, i) + '(' + MIDI.ccName(i) + ')');
const intervalNames  = ['Tonic', '♭2', '2', '-3', '∆3', '4', '♯4', '5', '♭6', '6', '7', '∆7'];
const transpositions = names.map((name, i) => {
    return name + ' Concert\t' + names[(i + 2) % 12] + ' Tenor\t\t' + names[(i + 9) % 12] + ' Alto';
});

const intervals = Array.from({ length: 49 }, (n, i) => i - 24);
intervals.splice(48, 0, '-');
intervals.splice(37, 0, '-');
intervals.splice(36, 0, '-');
intervals.splice(25, 0, '-');
intervals.splice(24, 0, null);
//intervals.splice(0,  0, null);
intervals.splice(24, 0, '-');
intervals.splice(13, 0, '-');
intervals.splice(12, 0, '-');
intervals.splice(1,  0, '-');
intervals.splice(0,  0, '-');
intervals.reverse();

function createIntervals(t) {
    const intervals = Array.from({ length: 49 }, (n, i) => {
        const name      = intervalNames[(t + i) % 12];
        const number    = i - 24;
        const transpose =
            number === 0   ? 'Unison' :
            number === 12  ? '+8ve' :
            number === -12 ? '-8ve' :
            // +ve number
            number > 0 ? '+' + number :
            // -ve number
            number ;

        return name + (name.length < 4 ? '\t' : '') + '\t\t' + transpose;
    });

    intervals.splice(48, 0, '-');
    intervals.splice(37, 0, '-');
    intervals.splice(36, 0, '-');
    intervals.splice(25, 0, '-');
    intervals.splice(24, 0, '⭥\t\t\tNearest');
    //intervals.splice(24, 0, 'None');
    intervals.splice(24, 0, '-');
    intervals.splice(13, 0, '-');
    intervals.splice(12, 0, '-');
    intervals.splice(1,  0, '-');
    intervals.splice(0,  0, '-');
    intervals.reverse();
    return intervals;
}


/* Notes and pitch */

const notes   = {};
const pitches = {};

// Track current note and pitch
var note   = 0;
var bend   = 0;
var pitch  = 0;

// setTonicMode
// 0 - inactive
// 1 - waiting for pitch
// 2 - pitch played while active
var setTonicMode = 0;

function getSemitones(harmonies, n) {
    var semitones = harmonies[n];
    if (semitones !== null) return semitones;

    var i = 0;
    var m;

    // Pitch is below centre value
    if (pitch - Math.round(pitch) < 0) {
        while (semitones === null && ++i < 7) {
            // Look down first
            m = (n - i) % 12;
            if (harmonies[m] !== null) return harmonies[m] - i;
            m = (n + i) % 12;
            if (harmonies[m] !== null) return harmonies[m] + i;
        }
    }
    // Pitch is above centre value
    else {
        while (semitones === null && ++i < 7) {
            // Look up first
            m = (n + i) % 12;
            if (harmonies[m] !== null) return harmonies[m] + i;
            m = (n - i) % 12;
            if (harmonies[m] !== null) return harmonies[m] - i;
        }
    }
}

function createNotePitchHandler() {
    const i         = PluginParameters.length;
    const harmonies = Array.from({ length: 12 });

    PluginParameters.push({
        // Param 0
        name: 'Note / Pitch channel',
        type: 'menu',
        valueStrings: channels,
        defaultValue: 0,
        disableAutomation: true
    }, {
        name: 'Pitch bend range',
        type: 'menu',
        valueStrings: ranges,
        defaultValue: 2,
        disableAutomation: true
    }, {
        name: 'Tonic pitch',
        type: 'menu',
        valueStrings: transpositions,
        defaultValue: 0,
        disableAutomation: true
    }, {
        name: '∆7',
        type: 'menu',
        valueStrings: createIntervals(11),
        defaultValue: 28
    }, {
        name: '7',
        type: 'menu',
        valueStrings: createIntervals(10),
        defaultValue: 28
    }, {
        name: '6',
        type: 'menu',
        valueStrings: createIntervals(9),
        defaultValue: 28
    }, {
        name: '♭6',
        type: 'menu',
        valueStrings: createIntervals(8),
        defaultValue: 28
    }, {
        name: '5',
        type: 'menu',
        valueStrings: createIntervals(7),
        defaultValue: 28
    }, {
        name: '♯4',
        type: 'menu',
        valueStrings: createIntervals(6),
        defaultValue: 28
    }, {
        name: '4',
        type: 'menu',
        valueStrings: createIntervals(5),
        defaultValue: 28
    }, {
        name: '∆3',
        type: 'menu',
        valueStrings: createIntervals(4),
        defaultValue: 28
    }, {
        name: '-3',
        type: 'menu',
        valueStrings: createIntervals(3),
        defaultValue: 28
    }, {
        name: '2',
        type: 'menu',
        valueStrings: createIntervals(2),
        defaultValue: 28
    }, {
        name: '♭2',
        type: 'menu',
        valueStrings: createIntervals(1),
        defaultValue: 28
    }, {
        name: 'Tonic',
        type: 'menu',
        valueStrings: createIntervals(0),
        defaultValue: 28
    },
    // Param 15
    {
        name: 'Semitones control',
        type: 'target',
        disableAutomation: true
    }, {
        name: 'range',
        type: 'lin',
        minValue: 1,
        maxValue: 48,
        numberOfSteps: 47,
        defaultValue: 12,
        unit: '±',
        disableAutomation: true
    }, {
        name: 'Cents control',
        type: 'target',
        disableAutomation: true
    }, {
        name: 'range',
        type: 'lin',
        minValue: 0,
        maxValue: 100,
        numberOfSteps: 100,
        defaultValue: 50,
        unit: '±',
        disableAutomation: true
    }, {
        name: 'offset',
        type: 'lin',
        minValue: -50,
        maxValue: 50,
        numberOfSteps: 100,
        defaultValue: 0,
        unit: 'cents',
        disableAutomation: true
    }, {
        name: 'correction',
        type: 'lin',
        minValue: 0,
        maxValue: 100,
        numberOfSteps: 100,
        defaultValue: 0,
        unit: '%',
        disableAutomation: true
    });

    function getRoot() {
        return GetParameter(i + 2);
    }

    function updateHarmony(v, i, harmonies) {
        // Read harmony parameters bottom to top with 12 - i
        harmonies[i] = intervals[GetParameter(14 - i)];
    }

    function getHarmonies() {
        harmonies.forEach(updateHarmony);
        return harmonies;
    }

    return (e) => {
        // Ignore messages from non-maching channels
        const ch = GetParameter(i);
        if (ch !== 17 && e.channel !== ch) return true;

        // Track note
        if (isNoteOn(e)) {
            note = e.pitch;
            // If active, mark setTonicMode as 'note received'
            if (setTonicMode === 1) setTonicMode = 2;
        }
        // Track pitch
        else if (isPitch(e)) {
            bend = GetParameter(i + 1) * e.value / 8192;
        }
        // Ignore other events
        else return;

        const p = pitch;
        pitch = note + bend;

        // TODO: Find some way of muting output while setting tonic
        //if (setTonicMode) return true;

        // Has semitones changed? Set semitones
        if (Math.round(pitch) !== Math.round(p)) {
            var harmonies    = getHarmonies();
            var transpose    = getRoot();
            var n            = (Math.round(pitch) - transpose) % 12;
            var semitones    = getSemitones(harmonies, n);
            var controlRange = GetParameter(i + 16) * 2;

            createTargetEvent('Semitones control', 0.5 + (semitones / controlRange)).send();
        }

        // Set cents. centsRange for cents ±50 is 1, for cents ±100 is 2...
        var centsRange      = GetParameter(i + 18) / 50;
        var centsOffset     = GetParameter(i + 19) / 100;
        var centsCorrection = GetParameter(i + 20) / 100;
        var cents = (0.5
            + centsCorrection * (Math.round(pitch) - pitch)
            + centsOffset) / centsRange;

        createTargetEvent('Cents control', cents).send();

        // Mark as handled
        return true;
    };
}

function createSetTonicHandler() {
    const i = PluginParameters.length;

    PluginParameters.push({
        name: 'Set Tonic controller',
        type: 'text'
    }, {
        name: 'channel',
        type: 'menu',
        valueStrings: channels,
        defaultValue: 0
    }, {
        name: 'controller',
        type: 'menu',
        valueStrings: controllers,
        defaultValue: 0
    }, {
        name: 'invert',
        type: 'checkbox',
        defaultValue: 0
    });

    return (e) => {
        // Ignore non-control messages
        if (!isControl(e)) return;

        // Ignore messages from non-maching channels
        const ch = GetParameter(i);
        if (ch !== 17 && e.channel !== ch) return true;

        // Ignore non-matching control numbers
        const number = GetParameter(i + 1);
        if (e.number !== number) return;

        // Controller value
        const inverted = GetParameter(i + 3);
        const value    = inverted ? !e.value : !!e.value;

        // Controller on
        if (value) {
            setTonicMode = 1;
        }
        // Controller off
        else {
            // If note was received set it as tonic
            if (setTonicMode === 2) SetParameter(2, Math.round(pitch) % 12);
            setTonicMode = 0;
        }

        return true;
    }
}


// Define handlers
const handlers = [
    createNotePitchHandler(),
    createSetTonicHandler()
];

// HandleMIDI is called every time the Scripter receives a MIDI event.
function HandleMIDI(e) {
    // Call handlers
    let n = -1;
    while(handlers[++n]) if (handlers[n](e)) break;
};
