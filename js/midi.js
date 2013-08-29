var MIDI = (function(undefined) {
	var debug = true;

	var types = [
	    	'noteoff',
	    	'noteon',
	    	'polytouch',
	    	'cc',
	    	'pc',
	    	'channeltouch',
	    	'pitch'
	    ],

	    empty = {},

	    // Maintain a list of listeners for each input, indexed by input id.
	    listeners = {},

	    // Keep a reference to the MIDIAccess promise.
	    promise;


	function returnType(data) {
		var name = types[Math.floor(data[0] / 16) - 8];
	
		// Catch type noteon with zero velocity and rename it as noteoff
		return name === types[1] && data[2] === 0 ?
			types[0] :
			name ;
	}

	function returnChannel(data) {
		return data[0] % 16 + 1;
	}

	function onNoteOff(fn) {
		var input = this.target,
		    data = this.data;
		
		function noteoff(e) {
			if (data[1] === e.data[1] &&
			    returnType(e.data) === types[0]) {
				fn();
				input.removeEventListener('midimessage', noteoff);
			}
		}

		input.addEventListener('midimessage', noteoff);
	}

	function note() {
		var number = this.data[1];
		return MIDI.numberToNote(number) + MIDI.numberToOctave(number);
	}

	function createFilter(input, listeners, undefined) {
		return function(e) {
			var l = listeners.length,
			    n = -1,
			    data = e.data,
			    pair, channel, type, event;

			// Loop through filter/fn pairs and test the incoming event data
			// against the filters, caching channel and type for speed. Only
			// create an event object at the point that it is needed.
			while (++n < l) {
				pair = listeners[n];
				filter = pair[0];

				if (filter.channel) {
					if (channel === undefined) {
						channel = returnChannel(data);
					}

					if (typeof filter.channel === 'number') {
						if (filter.channel !== channel) {
							continue;
						}
					}
					else {
						if (!filter.channel(channel)) {
							continue;
						}
					}
				}

				if (filter.message) {
					if (type === undefined) {
						type = returnType(data);
					}

					if (typeof filter.message === 'string') {
						if (filter.message !== type) {
							continue;
						}
					}
					else {
						if (!filter.message(type)) {
							continue;
						}
					}
				}

				if (filter.data1 !== undefined) {
					if (typeof filter.data1 === 'number') {
						if (filter.data1 !== data[1]) {
							continue;
						}
					}
					else {
						if (!filter.data1(data[1])) {
							continue;
						}
					}
				}

				if (filter.data2 !== undefined) {
					if (typeof filter.data2 === 'number') {
						if (filter.data2 !== data[2]) {
							continue;
						}
					}
					else {
						if (!filter.data2(data[2])) {
							continue;
						}
					}
				}

				if (!event) {
					event = Object.create(e);

					event.port = input;
					event.data1 = data[1];
					event.data2 = data[2];
					event.channel = channel = channel || returnChannel(data);
					event.message = type    = type    || returnType(data);

					if (type === types[1]) {
						event.note = note;
						event.velocity = data[2];
						event.noteoff = onNoteOff;
					}
				}

				// Call the filtered callback
				pair[1](event);
			}
		};
	}


	function addEvent(input, filter, fn) {
		// Only bind once to each input, then maintain a list of filter/fn
		// listeners that we loop through on incoming events.
		if (!listeners[input.id]) {
			listeners[input.id] = [];
			input.addEventListener('midimessage', createFilter(input, listeners[input.id]));
		}

		listeners[input.id].push([filter, fn]);
	}

	function createMidi(midiAccess) {
		return {
			inputs: midiAccess.inputs.bind(midiAccess),
			outputs: midiAccess.outputs.bind(midiAccess),

			input: function(name) {
				var inputs = midiAccess.inputs(),
				    i = inputs.length;

				if (typeof name === 'number') {
					return inputs[name];
				}

				while (i--) {
					if (inputs[i].name === name) {
						return inputs[i];
					}
				}
			},

			output: function(name) {
				var inputs = midiAccess.inputs(),
				    i = inputs.length;

				if (typeof name === 'number') {
					return inputs[name];
				}

				while (i--) {
					if (inputs[i].name === name) {
						return inputs[i];
					}
				}
			},

			on: function(filter, fn) {
				if (!fn) {
					fn = filter;
					filter = empty;
				}

				if (filter.port) {
					addEvent(this.input(filter.port), filter, fn);
				}
				else {
					this.inputs().forEach(function(input) {
						addEvent(input, filter, fn);
					});
				}

				return this;
			},

			send: function(fn) {
				return this;
			}
		};
	}

	function request(resolver) {
		function resolve(midiAccess) {
			var midi = createMidi(midiAccess);
			resolver.resolve(midi);
		}

		function reject(error) {
			console.log( "MIDI access rejected", error);
			resolver.reject(error);
		}

		navigator
		.requestMIDIAccess()
		.then(resolve, reject);
	}

	function MIDI() {
		// While DOM Promise is behind a flag, requestMIDIAccess doesn't return
		// an object that has chainable .then()s, as a real promise should, so
		// wrap it in a real promise.
		promise = promise || new Promise(request);

		return promise;
	}

	MIDI.eventTypes = types;

	return MIDI;
})();






// Extend MIDI with some helper functions for handling notes.

(function(MIDI) {
	var noteNames = [
	    	'C',
	    	'C♯',
	    	'D',
	    	'E♭',
	    	'E',
	    	'F',
	    	'F♯',
	    	'G',
	    	'A♯',
	    	'A',
	    	'B♭',
	    	'B'
	    ],

	    noteTable = {
	    	'C':  0,
	    	'C♯': 1,
	    	'D♭': 1,
	    	'D':  2,
	    	'D♯': 3,
	    	'E♭': 3,
	    	'E':  4,
	    	'F':  5,
	    	'F♯': 6,
	    	'G♭': 6,
	    	'G':  7,
	    	'G♯': 8,
	    	'A♭': 8,
	    	'A':  9,
	    	'A♯': 10,
	    	'B♭': 10,
	    	'B':  11
	    },

	    pitch = 440,
	    middle = 3,

	    rname = /^([A-G][♭♯]?)(\d)$/;

	function round(n, d) {
		var factor = Math.pow(10, d); 
		return Math.round(n * factor) / factor;
	}

	function noteToNumber(str) {
		var r = rnote.exec(str);
		return parseInt(r[2]) * 12 + noteTable[r[1]];
	}

	function numberToNote(n) {
		return noteNames[n % 12];
	}

	function numberToOctave(n) {
		return Math.floor(n / 12) - (5 - middle);
	}

	function numberToFrequency(n) {
		return round(pitch * Math.pow(1.059463094359, (n + 3 - (middle + 2) * 12)));
	}

	MIDI.pitch = 440;
	MIDI.middle = 3;

	//MIDI.noteNames = noteNames;
	//MIDI.noteTable = noteTable;
	MIDI.noteToNumber = noteToNumber;
	MIDI.numberToNote = numberToNote;
	MIDI.numberToOctave = numberToOctave;
	MIDI.numberToFrequency = numberToFrequency;
})(MIDI);


if (!this.window) {
	module.exports = MIDI;
}