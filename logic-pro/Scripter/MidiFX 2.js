
/* Constants */

const maxDoubleTapDuration = 400;


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

/* UI */

const channels    = ['Off', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', 'All'];
const controllers = Array.from({ length: 128 }, (v, i) => postpad(' ', 4, i) + '(' + MIDI.ccName(i) + ')');


/* Notes and pitch */

const notes   = {};
const pitches = {};

var noteIsOn = 0;
var hold = false;

function createNotePitchHandler() {
    const i = PluginParameters.length;

    PluginParameters.push({
        name: 'Notes / Pitch Bend',
        type: 'menu',
        valueStrings: channels,
        defaultValue: 0
    });

    return (e) => {
        // Return false-y to fall through to next handler
        if (!isNote(e) && !isPitch(e)) return;

        // Ignore notes from other channels
        const ch = GetParameter(i);
        if (ch !== 17 && e.channel !== ch) return true;


        if (isNoteOn(e)) {
            ++noteIsOn;

            if (hold) {
                // Track notes started while hold on but don't play them
                notes[e.pitch] = 2;
                return true;
            }

            // Keep track of notes started while hold off
            notes[e.pitch] = 1;
            e.send();
            return true;
        }

        if (isNoteOff(e)) {
            --noteIsOn;
            // Safety check
            if (noteIsOn < 0) noteIsOn = 0;

            if (hold) {
                // Keep track of notes stopped while hold on
                notes[e.pitch] = 0;
                return true;
            }

            // Delete notes stopped while hold off
            delete notes[e.pitch];
            e.send();
            return true;
        }

        if (hold) {
            pitches.all = e.value > 0 ?
                e.value / 8191 :
                e.value / 8192 ;
            return true;
        }

        // Send pitch
        e.send();
        return true;
    };
}

function createHoldHandler() {
    const i = PluginParameters.length;

    PluginParameters.push({
        name: 'Hold',
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
        // Ignore non-control events, block further handling if holding
        if (!isControl(e)) return hold;

        // Ignore controls from unmatching channels, block further handling if holding
        const ch = GetParameter(i);
        if (ch !== 17 && e.channel !== ch) return hold;

        // Ignore non-matching control numbers, block further handling if holding
        const number = GetParameter(i + 1);
        if (e.number !== number) return hold;

        const invert = GetParameter(i + 2);
        const value = invert ?
            e.value === 0 :
            e.value !== 0 ;

        // Hold off
        if (!value) {
            // Send an ALL NOTES OFF message
            createControlChange(123).send();

            // Start notes that are playing but have not been started
            let n;
            for (n in notes) {
                // Send note on for notes started during hold
                if (notes[n] === 2) {
                    createPitchBend(pitches.all).sendAfterMilliseconds(12);
                    createNoteOn(n, 0.5).sendAfterMilliseconds(12);
                }
            }
        }

        hold = value;
    };
}



/* Controllers */

const behaviours = {
    'Normal': (name, gateMin, gateMax, min, max, current, n) => {
        var value = n < gateMin ?
            gateMin :
            n > gateMax ?
            gateMax :
            n ;

        createTargetEvent(name, denormalise(min, max, value)).send();
        return value;
    },

    'While note is on': (name, gateMin, gateMax, min, max, current, n) => {
        if (!noteIsOn) return current;

        var value = n < gateMin ?
            gateMin :
            n > gateMax ?
            gateMax :
            n ;

        createTargetEvent(name, denormalise(min, max, value)).send();
        return value;
    },

    'Switch': (name, gateMin, gateMax, min, max, current, n) => {
        var value = n < gateMin ? min : max;
        createTargetEvent(name, value).send();
        return value;
    },

    'Toggle': (name, gateMin, gateMax, min, max, current, n) => {
        // Ignore controller value 0
        if (n === min) return;
        var value = current === max ? min : max;
        createTargetEvent(name, value).send();
        return value;
    }
};

function createTargetEvent(name, value) {
    var event = new TargetEvent();
    event.target = name;
    event.value  = value;
    return event;
}

function createTargetParameter(name, min = 0, max = 1, type = 'lin', steps = 512) {
    const i          = PluginParameters.length;
    const keys       = Object.keys(behaviours);
    const targetName = name + ' target';

    let current = 0;

    PluginParameters.push({
        name: name,
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
        name: 'type',
        type: 'menu',
        valueStrings: Object.keys(behaviours),
        defaultValue: 0
    }, {
        name: 'gate min',
        type: type,
        minValue: min,
        maxValue: max,
        numberOfSteps: steps,
        defaultValue: min
    }, {
        name: 'gate max',
        type: type,
        minValue: min,
        maxValue: max,
        numberOfSteps: steps,
        defaultValue: max
    }, {
        name: 'value min',
        type: type,
        minValue: min,
        maxValue: max,
        numberOfSteps: steps,
        defaultValue: min
    }, {
        name: 'value max',
        type: type,
        minValue: min,
        maxValue: max,
        numberOfSteps: steps,
        defaultValue: max
    }, {
        name: targetName,
        type: 'target'
    });

    return (e) => {
        if (!isControl(e)) return;

        // Ignore controls from unmatching channels
        const ch = GetParameter(i + 1);
        if (ch !== 17 && e.channel !== ch) return;

        // Ignore non-matching control numbers
        const number = GetParameter(i + 2);
        if (e.number !== number) return;

        const fn      = behaviours[keys[GetParameter(i + 3)]];
        const gateMin = GetParameter(i + 4);
        const gateMax = GetParameter(i + 5);
        const min     = GetParameter(i + 6);
        const max     = GetParameter(i + 7);

        current = fn(targetName, gateMin, gateMax, min, max, current, normalise(0, 127, e.value));
    };
}

function createStartStopSwitch(name, min = 0, max = 1, type = 'lin', steps = 512) {
    const i = PluginParameters.length;

    // 0 stopped, 1 recording, 2 playing
    var state   = 0;
    var tapTime = 0;

    PluginParameters.push({
        name: name,
        type: "text"
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
    }, {
        name: 'Taps target',
        type: 'target'
    }, {
        name: 'First tap target',
        type: 'target'
    }, {
        name: 'Double tap target',
        type: 'target'
    });

    function tapdown() {
        // Tap down
        const t        = Date.now();
        const tapInterval = t - tapTime;
        tapTime = t;

        // Its a double tap within maxDoubleTapDuration, clear state
        if (tapInterval < maxDoubleTapDuration) {
            createTargetEvent('Double tap target', 1).send();
            state = 0;
            return;
        }

        // All other taps overdub
        createTargetEvent('Taps target', 1).send();

        // First tap on master puts us in record state
        if (state === 0) {
            state = 1;
            createTargetEvent('First tap target', 1).send();
        }
    }

    function tapup() {
        // Not playing or recording, do nothing
        if (state === 0) return;

        // Stop recording
        if (state === 1) {
            state = 2;
            createTargetEvent('First tap target', 0).send();
        }

        // Stop overdub
        createTargetEvent('Taps target', 0).send();
    }

    return function fn(e) {
        if (!isControl(e)) return;

        const ch = GetParameter(i + 1);
        if (ch !== 0 && e.channel !== ch) return;

        const n = GetParameter(i + 2);
        if (n !== e.number) return;

        const inverted = GetParameter(i + 3);
        if (inverted ? !e.value : !!e.value) { tapdown(); }
        else { tapup(); }
    };
}


/*
Define plugin parameters. PluginParameters must be declared as a var.
*/

var PluginParameters = [];

const handlers = [
    createNotePitchHandler(),
    createHoldHandler(),
    //createStartStopSwitch('Record'),
    createTargetParameter('Control 1'),
    createTargetParameter('Control 2'),
    createTargetParameter('Control 3'),
    createTargetParameter('Control 4')
];

// HandleMIDI is called every time the Scripter receives a MIDI event.
function HandleMIDI(e) {
    // Call handlers
    let n = -1;
    while(handlers[++n]) if (handlers[n](e)) break;
};
