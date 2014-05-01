// midi.js
//
// Process and route incoming and outgoing MIDI events.
// 

var midi = MIDI('Port 1'),
    midi_out = MIDI('IAC2');

midi.on('note', 23, function(note) {
	var vel = note.velocity;

	// Note is a promise. The 'then' method is called on noteoff.
	note
	.number(24)
	.transpose(3)
	.velocity(100)
	.delay(100)
	.add([2,34,0])
	.then(function() {
		
	});
})
.on('noteoff', 23, function(note) {
	
})
.on('cc', function(cc) {
	console.log(cc.number);
})
.on('pitch', function(pitch) {
	console.log(pitch.number);
});




proto = {
	pitch: function(n) {
		if (isFunction(n)) {
			return n;
		}
		
		return function() {
			return n;
		}
	}
}
// Aaargh.


function isFunction(obj) {
	// Crude.
	return typeof obj === 'function';
}


function transpose(n) {
	var event = this;

	if (event.type !== 'note') { return; }

	event.pitch(isFunction(n) ? n(event) : event.pitch() + n);

	return event;
}

function pitch(n) {
	var event = this;

	if (event.type !== 'note') { return; }

	if (!n) { return event.array[1]; }

	event.array[1] = isFunction(n) ?
		n(event) :
		n ;

	return event;
}

function mixNote(obj) {
	obj.transpose = transpose;
	obj.pitch = pitch;

	return obj;
}

var types = {
    // 2-way conversion table for event types
    	0: '',
    	1: 'note',
    	2: 'cc',
    	3: 'pitch',
    	note: 1,
    	pitch: 3,
    	cc: 2
    };

function type(t) {
	var array = this.array;

	if (t === undefined) { return types[array[0]]; }

	array[0] = types[t];

	return this;
}

function Event(array) {
	var event = Object.create({
	    	// A new array to act as our data store
	    	array: array.slice(),

	    	// Methods
	    	type: type
	    });

	if (event.type() === 'note') {
		mixNote(event);
	}

	return event;
}




var note = midi('note', 23)
.transpose(3)
.pitch(function() {
	return -2;
})

.on(function(note) {
	midi.notes(); // Array of notes currently playing
	midi_out.send(note);
})

// midi_out.send(note) - where note is the given by .off callback.
.off(midi_out.send);




midi({
	note: {
		23: function(note) {
			note.pitch = 4;
		}
	}
});



midi('note', 23, function(note) {
	note
	.transpose(3)
	.pitch(function() {
		return -2;
	})
	.on(function() {
		
	})
	.off(function() {
		
	});
});



// garbage

(function(ns) {
	var bin = [];
	
	function garbage(obj) {
		bin.push(obj);
	}
	
	garbage.empty = function() {
		bin.length = 0;
	}
	
	ns.garbage = garbage;
})(window);




// midi

var midi = {};

function noteon(n, note) {
	cache[n] = note;
}

function noteoff(n) {
	var note = cache[n];

	note.off();
	garbage(note);
	delete cache[n];
}

function toNotes(n) {
	return cache[n];
}

function notes() {
	return Object
	.keys(cache)
	.map(toNotes);
}

function has(type, n) {
	
}

function MIDI(port) {
	var cache = {};


}

function number() {
	
}

function Event() {
	var event = {};

	event.number = number;

	return Event;
}




// ---------



function log() {
	console.log.apply(console, arguments);
}

function pass(midiAccess) {
	var inputs = midiAccess.getInputs();
	var outputs = midiAccess.getOutputs();

	inputs.forEach(log);
	outputs.forEach(log);

	inputs[0].onmidimessage = midimessage;
}

function call(e, fn) {
	fn(e);
	return e;
}

function midimessage(e) {
	console.log(event);

	var l = queue.length, i = -1;

	queue.reduce(call, e);
}

function method(queue, fn) {
	return function(callback) {
		queue.push(fn(callback));
		return this;
	};
}

function MIDI(device, port, in, out) {
	function midi(type, n) {
		var queue = [];

		// Convert type string to number
		types = types[type];

		inputs[n].onmidimessage = function(e) {
			// Reject events of the wrong type.
			if (e.data[0] !== type) { return; }
			// Reject events of the wrong number
			if (n !== undefined && e.data[1] !== n) { return; }

			queue.reduce(call, e);
		};

		return {
			on: method(queue, on);
			off: method(queue, off);
			pitch: method(queue, pitch);
			transpose: method(queue, transpose);
		};
	}

	navigator
	.requestMIDIAccess(port)
	.then(fn, log);

	return midi;
}




var midi = MIDI('IAC', 0, 0, 0);
var midiout = MIDI('IAC', 1, 0, 0);


var note = midi('note', 60);

note
.transpose(function(note) {
	return 3;
})
.pitch(function(note) {
	return note.number() + 3;
})
.on(function(note) {
	midiout.send(note);
})
.off(function(note) {
	midiout.send(note);
})
.tap(function(note) {
	// Fires when note has been tapped
	midiout.send(note);
})
.hold(function(note) {
	midiout.send(note);
});








midi.on('note', 60, function(note) {
	
});













