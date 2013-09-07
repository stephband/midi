(function() {
	var prototype = {
		in: returnThis,
		out: out
	};

	function noop() {}

	function returnThis() {
		return this;
	}

	function out(fn) {
		var wrap = fn;

		function input(e) {
			wrap(e);
			return this;
		}

		function output(fn) {
			wrap = createWrap(wrap, fn);
			return this;
		}

		this.in = input;
		this.out = output;

		return this;
	}

	function createWrap(wrap, fn) {
		return function(e) {
			wrap(e);
			fn(e);
		};
	}

	function MIDI() {
		return Object.create(prototype);
	}

	function createMethod(Node) {
		function method(options) {
			var node = new Node(options);

			function output(fn) {
				var wrap = fn;

				function output(fn) {
					wrap = createWrap(wrap, fn);
					node.out(wrap);
					
					return this;
				}

				node.out(fn);
				this.out = output;

				return this;
			}


			// Set in() to the in() of the first node.
			if (node.in && this.in === returnThis) {
				this.in = function(e) {
					node.in(e);
					return this;
				}
			}

			// Connect the out of the previous node to the in of this node.
			if (node.in) {
				this.out(node.in);
			}

			// Redefine out() to alias this node.
			if (node.out) {
				this.out = output;
			}

			return this;
		}

		return method;
	}

	function registerNode(name, Node) {
		prototype[name] = createMethod(Node);
	}

	MIDI.register = registerNode;
	MIDI.available = navigator.requestMIDIAccess;

	window.MIDI = MIDI;
})();



(function() {
	var debug = true;

	function noop() {}

	function fail(error) {
		console.log( "MIDI access rejected", error);
	}

	function request(pass) {
		navigator.requestMIDIAccess && navigator
		.requestMIDIAccess()
		.then(pass, fail);
	}

	function normalise(e) {
		// If it's a noteon with 0 velocity, normalise it to a noteoff
		if (e.data[2] === 0 && e.data[0] > 143 && e.data[0] < 160) {
			e.data[0] += -16;
		}
	}

	function find(array, id) {
		var l = array.length,
			item;

		while (l--) {
			item = array[l];

			if (item.name === id || item.id === id || item === id) {
				return array[l];
			}
		}

		console.log('MIDI port \'' + id + '\' not found');
		return;
	}

	function Input(id) {
		var node = Object.create(Object.prototype),
		    send;

		function filter(input) {
			return input.name === id || input.id === id || input === id;
		}

		node.out = function(fn) {
			send = fn;
		};

		request(function(midi) {
			var ports = id ? [find(midi.inputs(), id)] : midi.inputs() ;
			var l = ports.length;

			while (l--) {
				ports[l].addEventListener('midimessage', function(e) {
					// For some reason the connection is being dropped unless we
					// log all events.
					if (debug) { console.log(e.data, 'input'); }
					normalise(e);
					send(e);
				});
			}
		});

		return node;
	}

	function Output(id) {
		var node = Object.create(Object.prototype);
		var port;

		node.in = function(e) {
			if (!port) { return; }
			if (debug) { console.log(e.data, 'output'); }
			port.send(e.data, e.time);
		};

		request(function(midi) {
			port = id ? find(midi.outputs(), id) : midi.outputs()[0] ;
		});

		return node;
	}

	MIDI.Input = Input;
	MIDI.Output = Output;
	MIDI.register('input', Input);
	MIDI.register('output', Output);
})();



(function(MIDI) {
	function LogNode() {
		var node = Object.create(Object.prototype);

		node.in = function(e) {
			console.log(e.data);
		};

		return node;
	}

	MIDI.Log = LogNode;
	MIDI.register('log', LogNode);
})(MIDI);


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
	    	'G♯',
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