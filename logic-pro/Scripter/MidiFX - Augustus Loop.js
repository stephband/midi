/*
Augustus Loop start/stop controller
*/

const maxDoubleTapDuration = 400;


/* Helpers */

function noop() {}

function normalise(min, max, value) {
    return (value - min) / (max - min);
}

function denormalise(min, max, value) {
    return value * (max - min) + min;
}


/* MIDI */

function isNote(e) {
    return e instanceof Note;
}

function isPitch(e) {
    return e instanceof PitchBend;
}

function isControl(e) {
    return e instanceof ControlChange;
}

function isPressure(e) {
    return e instanceof PolyPressure;
}

function createNoteOn(pitch, velocity) {
    var event = new NoteOn();
    event.pitch(pitch);
    event.velocity(velocity * 127);
    return event;
}

function createTargetEvent(name, value) {
    var event = new TargetEvent();
    event.target = name;
    event.value  = value;
    return event;
}


/* Parameters */

function createStartStopSwitch(name, min = 0, max = 1, type = 'lin', steps = 512) {
    const i = PluginParameters.length;

    var tapTime = 0;
    // 0 stopped, 1 recording, 2 playing
    var state   = 0;

    PluginParameters.push({
        name: "Start/stop controller",
        type: "text"
    }, {
        name: 'channel',
        type: 'menu',
        valueStrings: ['All', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
        defaultValue: 0
    }, {
        name: 'controller',
        type: 'lin',
        minValue: 0,
        maxValue: 127,
        numberOfSteps: 127,
        defaultValue: 0
    }, {
        name: 'invert',
        type: 'checkbox',
        defaultValue: 0
    }, {
        name: 'all taps',
        type: 'target'
    }, {
        name: 'first tap',
        type: 'target'
    }, {
        name: 'double tap',
        type: 'target'
    });

    function tapdown() {
        // Tap down
        var t = Date.now();

        // Its a double tap within maxDoubleTapDuration, clear state
        if (t - tapTime < maxDoubleTapDuration) {
            createTargetEvent('double tap', 1).send();
            tapTime = t;
            state = 0;
            return;
        }

        // All other taps overdub
        createTargetEvent('all taps', 1).send();

        // First tap on master puts us in record state
        if (state === 0) {
            state = 1;
            createTargetEvent('first tap', 1).send();
        }
    }

    function tapup() {
        // Not playing or recording, do nothing
        if (state === 0) return;

        // Stop recording
        if (state === 1) {
            state = 2;
            createTargetEvent('first tap', 0).send();
        }

        // Stop overdub
        createTargetEvent('all taps', 0).send();
    }

    return function fn(e) {
        if (!isControl(e)) return;

        const ch = GetParameter(i + 1);
        if (ch !== 0 && e.channel !== ch) return;

        const n = GetParameter(i + 2);
        if (n !== e.number) return;

        const inverted = GetParameter(i + 3);
        if (inverted ? !value : !!value) { tapdown(); }
        else { tapup(); }
    };
}






/*
PluginParameters
Array of UI controls
*/

var PluginParameters = [{
    name: 'Notes',
    type: 'menu',
    valueStrings: ['Off', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', 'All'],
    defaultValue: 0
}, {
    name: 'Pitch Bend',
    type: 'menu',
    valueStrings: ['Off', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', 'All'],
    defaultValue: 0
}];

var handlers = [
    function handleNote(e) {
        if (!isNote(e)) return;

        // Ignore notes from other channels
        const ch = GetParameter(0);
        if (ch !== 17 && e.channel !== ch) return true;

        e.send();
        return true;
    },

    function handlePitchBend(e) {
        if (!isPitch(e)) return;

        // Ignore pitch bends from other channels
        const ch = GetParameter(1);
        if (ch !== 17 && e.channel !== ch) return true;

        e.send();
        return true;
    },

    createStartStopSwitch('')
];




// HandleMIDI is called every time the Scripter receives a MIDI event.
function HandleMIDI(e) {
    // Call handlers
    var n = -1;
    while(handlers[++n]) if (handlers[n](e)) break;
};
