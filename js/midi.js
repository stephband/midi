// Core MIDI module.
// 
// Write MIDI routes like so:
// 
// MIDI()
// .input({ name: 'Bus 1' })
// .filter({ message: 'note' })
// .modify({ channel: 2 })
// .out(function(e) {
//     // Do something with event e
// });
// 
// A MIDI() object has a few special methods:
// 
// .in(e)      Can't be changed. Call it with a midi event.
// .out(fn)    Returns this so multiple outs from the same
//             MIDI node can be chained.
// .send(e)    Used internally, but also for debugging. Call
//             .send() to send a message to the out.
// 
// A MIDI(fn) object takes a function. This function is
// attached to the node as it's 'in' method. Typically, an
// 'in' function calls this.send(e) to trigger the node.out.
// 
// var midi = MIDI(function(e) {
//     this.send(e);
// });

(function (window) {
	'use strict';

	var alertFlag = false;

	// Node prototype

	var prototype = {
	    	out: out1,
	    	send: send
	    };

	function noop() {}

	function out1(fn) {
		// Override send with this listener function. Because we want this
		// thing to be fast in the most common case, where exactly one
		// listener function is specified.
		this.send = fn;
		this.out = out2;
		return this;
	}

	function out2(fn) {
		var listeners = [this.send, fn];

		Object.defineProperty(this, 'listeners', {
			value: listeners
		});

		this.out = out3;

		// Fall back to prototype send
		delete this.send;
		return this;
	}

	function out3(fn) {
		this.listeners.push(fn);
		return this;
	}

	function send(message) {
		if (!this.listeners) { return; }

		var length = this.listeners.length,
			l = -1;

		while (++l < length) {
			this.listeners[l](message);
		}
		
		return this;
	}

	function passThru(e) {
		this.send.apply(this, arguments);
	}

	function Node(fn) {
		return Object.create(prototype, {
			in: {
				value: fn || passThru,
				enumerable: true
			}
		});
	}

	function Source(fn) {
		var node = Node(noop);
		return node;
	}

	function Destination(fn) {
		var node = Node(fn);
		node.out = noop;
		return node;
	}

	function createMethod(Node) {
		return function method(options) {
			var node = Node(options);
			this.out(node.in);
			return node;
		};
	}

	function createMethod(name, Node) {
		return function method(options) {
			var node = Node(options);
			
			this.out(node.in.bind(node));
			
			if (node.out !== noop) {
				this.out = function(fn) {
					node.out(fn);
					return this;
				};
			}
			
			return this;
		};
	}

	function register(name, Node) {
		prototype[name] = createMethod(name, Node);
	}

	function log(e) {
		console.log(e);
	}
	
	function warn(e) {
		console.warn(e);
	}

	function request(fn) {
		if (!navigator.requestMIDIAccess) {
			if (!alertFlag) {
				alert('Your browser does not support MIDI via the navigator.requestMIDIAccess() API.');
			}
			
			return;
		}
		
		return navigator.requestMIDIAccess().then(fn, warn);
	}

	function MIDI() {
		return MIDI.Node();
	}

	MIDI.noop = noop;
	MIDI.request = request;
	MIDI.register = register;

	MIDI.Node = Node;
	MIDI.Source = Source;
	MIDI.Destination = Destination;

	window.MIDI = MIDI;
})(window);

// MIDI utilities
//
// Declares utility functions and constants on the MIDI object.

(function(MIDI) {
	'use strict';

	var noteNames = [
	    	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G♯', 'A', 'B♭', 'B'
	    ],

	    noteTable = {
	    	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	    	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	    	'A♯': 10, 'B♭': 10, 'B': 11
	    },

	    rname = /^([A-G][♭♯]?)(\d)$/;

	function round(n, d) {
		var factor = Math.pow(10, d); 
		return Math.round(n * factor) / factor;
	}


	// Library functions

	function isNote(data) {
		return data[0] > 127 && data[0] < 160 ;
	}

	function isControl(data) {
		return data[0] > 175 && data[0] < 192 ;
	}

	function isPitch(data) {
		return data[0] > 223 && data[0] < 240 ;
	}

	function returnChannel(data) {
		return data[0] % 16 + 1;
	}

	//function returnMessage(data) {
	//	return MIDI.messages[Math.floor(data[0] / 16) - 8];
	//}

	function returnMessage(data) {
		var name = MIDI.messages[Math.floor(data[0] / 16) - 8];
	
		// Catch type noteon with zero velocity and rename it as noteoff
		return name === MIDI.messages[1] && data[2] === 0 ?
			MIDI.messages[0] :
			name ;
	}

	function normaliseNoteOff(data) {
		// If it's a noteon with 0 velocity, normalise it to a noteoff
		if (data[2] === 0 && data[0] > 143 && data[0] < 160) {
			data[0] -= 16;
		}

		return data;
	}

	function normaliseNoteOn(data) {
		// If it's a noteoff, make it a noteon with 0 velocity.
		if (data[0] > 127 && data[0] < 144) {
			data[0] += 16;
			data[2] = 0;
		}

		return data;
	}

	function pitchToInt(data) {
		return (data[2] << 7 | data[1]) - 8192 ;
	}

	function pitchToFloat(data, range) {
		return (range === undefined ? 2 : range) * pitchToInt(data) / 8191 ;
	}

	function noteToNumber(str) {
		var r = rnote.exec(str);
		return parseInt(r[2]) * 12 + noteTable[r[1]];
	}

	function numberToNote(n) {
		return noteNames[n % 12];
	}

	function numberToOctave(n) {
		return Math.floor(n / 12) - (5 - MIDI.middle);
	}

	function numberToFrequency(n) {
		return round(MIDI.pitch * Math.pow(1.059463094359, (n + 3 - (MIDI.middle + 2) * 12)));
	}

	MIDI.messages = [
		'noteoff',
		'noteon',
		'polytouch',
		'cc',
		'pc',
		'channeltouch',
		'pitch'
	];

	MIDI.pitch = 440;
	MIDI.middle = 3;

	//MIDI.noteNames = noteNames;
	//MIDI.noteTable = noteTable;
	MIDI.isNote = isNote;
	MIDI.isPitch = isPitch;
	MIDI.isControl = isControl;
	MIDI.noteToNumber = noteToNumber;
	MIDI.numberToNote = numberToNote;
	MIDI.numberToOctave = numberToOctave;
	MIDI.numberToFrequency = numberToFrequency;
	MIDI.channel = returnChannel;
	MIDI.message = returnMessage;
	MIDI.normaliseNoteOn = normaliseNoteOn;
	MIDI.normaliseNoteOff = normaliseNoteOff;
	MIDI.pitchToInt = pitchToInt;
	MIDI.pitchToFloat = pitchToFloat;
})(MIDI);

// MIDI.Input
// 
// Connects to a navigator's input port or ports.

(function(MIDI) {
	"use strict";

	var inputs = {};

	function emptyObject(obj) {
		var key;

		for (key in obj) {
			delete obj[key];
		}
	}

	function addInput(input) {
		inputs[input.name] = input;
	}

	function updateInputs(midi) {
		emptyObject(inputs);
		midi.inputs().forEach(addInput);
	}

	function setupConnection(midi) {
		midi.addEventListener('connect', function() {
			updateInputs(midi);
		});

		midi.addEventListener('disconnect', function() {
			updateInputs(midi);
		});

		updateInputs(midi);

		// Guarantee this setup is only called once.
		setupConnection = MIDI.noop;
	}

	function Input(options) {
		var node = MIDI.Source();
		var input;

		function send(e) {
			node.send(e);
		}

		function listen(input) {
			input.addEventListener('midimessage', send);
		}

		MIDI.request(function(midi) {
			//console.log('midi.inputs()', midi.inputs());

			// Listen to connection.
			setupConnection(midi);

			// Where a port is specified, listen to it, otherwise listen to
			// all ports.
			if (options && options.port) {
				listen(inputs[options.port]);
			}
			else {
				midi.inputs().forEach(listen);
			}
		});

		return node;
	}

	MIDI.Input = Input;
	MIDI.register('input', MIDI.Input);
})(MIDI);

// MIDI.Output
// 
// Sends MIDI events to a navigator's output port(s)

(function() {
	'use strict';
	
	var debug = true;

	function noop() {}

	function log(error) {
		console.log(error);
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

	function Output(id) {
		var port;

		var node = MIDI.Destination(function(e) {
			if (!port) { return; }
			if (debug) { console.log(e.data, 'output'); }
			port.send(e.data, e.time);
		});

		MIDI.request(function(midi) {
			port = id ? find(midi.outputs(), id) : midi.outputs()[0] ;
		});

		return node;
	}

	MIDI.Output = Output;
	MIDI.register('output', Output);
})();
// MIDI.Filter
// 
// Filters MIDI messages to those that match the rules specified in options.

(function(MIDI) {
	"use strict";
	
	var types = MIDI.messages;

	var filters = {
		port: function(e, filter) {
			if (!e.target) { return false; }

			return typeof filter === 'number' ?
				filter === e.target.id :
				typeof filter === 'string' ?
				filter === e.target.name :
				filter === e.target ;
		},

		channel: function(e, filter) {
			if (e.channel === undefined) {
				e.channel = MIDI.channel(e.data);
			}

			//return typeOf(filter);

			return typeof filter === 'number' ?
				filter === e.channel :
				filter(e.channel) ;
		},

		message: function(e, filter) {
			if (e.message === undefined) {
				e.message = MIDI.message(e.data);
			}

			return typeof filter === 'string' ?
				filter === e.message :
				Object.prototype.toString.apply(filter) === '[object RegExp]' ?
				filter.test(e.message) :
				filter(e.message) ;
		},

		data1: function(e, filter) {
			return typeof filter === 'number' ?
				filter === e.data[1] :
				filter(e.data[1]) ;
		},

		data2: function(e, filter) {
			return typeof filter === 'number' ?
				filter === e.data[2] :
				filter(e.data[2]) ;
		}
	};

	//var objectTypes = {
	//	'[object String]': equals,
	//	'[object Number]': equals,
	//	
	//	'[object RegExp]': function(regexp, value) {
	//		return regexp.test(value);
	//	}
	//};
//
	//function equals(val1, val2) {
	//	return val1 === val2;
	//}
//
	//function typeOf(object) {
	//	return objectTypes[Object.prototype.toString.apply(object)];
	//}

	function Node(options) {
		//var filters = {};
		//
		//for (key in options) {
		//	filters[key] = filters[key](options[key]);
		//}

		return MIDI.Node(function(e) {
			var data = e.data;
			var key;

			for (key in options) {
				if (filters[key] && !filters[key](e, options[key])) {
					if (options.reject) { options.reject(e); }
					return;
				}
			}

			e.channel = e.channel || MIDI.channel(e.data);
			e.message = e.message || MIDI.message(e.data);

			this.send(e);
		});
	}

	MIDI.Filter = Node;
	MIDI.register('filter', Node);
})(MIDI);

// MIDI.Modify
// 
// Modifies incoming MIDI events to match the rules in options.

(function(MIDI) {
	'use strict';

	var types = MIDI.messages;

	var modifiers = {
		port: function(e, value) {
			e.port = value;
		},

		channel: function(e, value) {
			var channel = MIDI.channel(e.data);

			// When value is not a number, assume it's a function
			if (typeof value !== 'number') {
				value = value(channel);
			}

			// Is value out of range?
			if (value < 1 || value > 16) {
				throw new Error('Cannot change channel to ' + value);
			}

			e.data[0] = e.data[0] - channel + value;
			e.channel = value;
		},

		message: function(e, value) {
			var index = types.indexOf(value);

			if (index === -1) {
				throw new Error('Cannot change message to \'' + value + '\'');
			}

			e.data[0] = 16 * (index + 8) + e.data[0] % 16;
			e.message = value;
		},

		data1: function(e, value) {
			// When value is not a number, assume it's a function
			if (typeof value !== 'number') {
				value = value(data[1]);
			}

			// Coerce value into range
			if (value < 0) { value = 0; }
			else if (value > 127) { value = 127; }

			e.data[1] = value;
		},

		data2: function(e, value) {
			// When value is not a number, assume it's a function
			if (typeof value !== 'number') {
				value = value(data[2]);
			}

			// Coerce value into range
			if (value < 0) { value = 0; }
			else if (value > 127) { value = 127; }

			e.data[2] = value;
		}
	};


	function normalise(e) {
		if (e.message === 'noteon' && e.data[2] === 0) {
			e.data[0] += -16;
			e.message = types[0];
		}
	}

	function modify(e, options) {
		var key;

		for (key in options) {
			if (modifiers[key]) {
				modifiers[key](e, options[key]);
			}
		}

		normalise(e);
	}

	function Modify(options) {
		return MIDI.Node(function(e) {
			modify(e, options);
			this.send(e);
		});
	}

	MIDI.Modify = Modify;
	MIDI.register('modify', Modify);
})(MIDI);

// Continuous
// 
// Converts matching continuous CC messages to absolute values, passing
// unmatched MIDI messages straight through to the out.

(function(MIDI) {
	'use strict';

	var defaults = {};
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function continuousValue(map, data) {
		var array = map[data[0]] || (map[data[0]] = []);
		var value = array[data[1]];
		
		if (!isDefined(value)) {
			value = 0;
		}
		
		value += e.data[2] - 63;
		value = value < 0 ? 0 : value > 127 ? 127 : value ;
		e.data[2] = array[data[1]] = value;
	}

	function Convert(options) {
		options = Sparky.extend({}, defaults, options);
		
		var filterNode = MIDI.Filter(options);
		var node = MIDI.Node(function(e) {
		    	filterNode.in(e);
		    });
		var map = {};
		
		options.reject = function reject(e) {
			node.send(e);
		};
		
		if (options.type === 'continuous') {
			filterNode.out(function(e) {
				continuousValue(map, e);
				node.send(e);
			});
		}

		return node;
	}

	MIDI.Convert = Convert;
	MIDI.register('convert', Convert);
})(MIDI);

// MIDI.Graph
// 
// Draws MIDI messages to a <canvas> element.

(function(undefined) {
    'use strict';
    
	var defaults = {
	    	paddingLeft:  1 / 30,
	    	paddingRight: 1 / 30,
	    	paddingTop:   0.125,
	    	ease: 0.6667,
	    	fadeDuration: 6000,
	    	fadeLimit: 0.24,
	    	gridColor1: 'hsla(0, 0%, 60%, 0.24)',
	    	gridColor2: 'hsla(0, 0%, 40%, 0.12)'
	    };

	var colors = [
	    	[220, 56, 68, 1],
	    	[232, 57, 66, 1],
	    	[244, 58, 65, 1],
	    	[256, 60, 62, 1],
	    	[268, 60, 62, 1],
	    	[280, 61, 61, 1],
	    	[292, 62, 61, 1],
	    	[304, 58, 60, 1],
	    	[316, 62, 62, 1],
	    	[328, 64, 62, 1],
	    	[340, 66, 62, 1],
	    	[352, 68, 62, 1],
	    	[4,   71, 61, 1],
	    	[16,  74, 61, 1],
	    	[28,  77, 61, 1],
	    	[40,  80, 60, 1]
	    ];


	var rhsl = /^(?:hsl\()?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?\)?$/;


	function isNote(data) {
		return data[0] > 127 && data[0] < 160 ;
	}

	function isControl(data) {
		return data[0] > 175 && data[0] < 192 ;
	}

	function isPitch(data) {
		return data[0] > 223 && data[0] < 240 ;
	}

	function pitchToInt(data) {
		return (data[2] << 7 | data[1]) - 8192 ;
	}

	function pitchToFloat(data, range) {
		return range * pitchToInt(data) / 8191 ;
	}

	function returnChannel(data) {
		return data[0] % 16 + 1;
	}

	function now() {
		return window.performance.now();
	}

	function toHSL(h, s, l, a) {
		return ['hsla(', h, ',', s, '%,', l, '%,', a, ')'].join('');
	}

	function clearCanvas(ctx, set) {
		ctx.clearRect(0, 0, set.width, set.height);
	}

	function scaleCanvas(ctx, set) {
		ctx.setTransform(
			set.innerWidth / (128 * set.xblock),
			0,
			0,
			set.innerHeight / 127,
			set.paddingLeft,
			set.paddingTop
		);

		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
	}

	function drawGrid(ctx, set) {
		ctx.save();
		ctx.lineWidth = 2;
		ctx.strokeStyle = set.gridColor1;
		ctx.beginPath();
		ctx.moveTo(0, set.paddingTop + 1);
		ctx.lineTo(set.width, set.paddingTop + 1);
		ctx.stroke();
		ctx.closePath();
		ctx.lineWidth = 2;
		ctx.strokeStyle = set.gridColor2;
		ctx.beginPath();
		ctx.moveTo(0, set.paddingTop + set.innerHeight / 2);
		ctx.lineTo(set.width, set.paddingTop + set.innerHeight / 2);
		ctx.stroke();
		ctx.closePath();
		ctx.restore();
	}

	function drawChannel(ctx, set, c) {
		var hsla = toHSL.apply(this, set.colors[c]);
		ctx.fillStyle = hsla;
		ctx.strokeStyle = hsla;
	}

	function drawStraightNote(ctx, set, n, v) {
		ctx.lineWidth = set.xunit * 6;
		ctx.fillRect(set.xunit * 3 + n * set.xblock, 127 - v, 6 * set.xunit, v);
		ctx.strokeRect(set.xunit * 3 + n * set.xblock, 127 - v, 6 * set.xunit, v);
	}

	function drawBentNote(ctx, set, n, v, p) {
		var xl = set.xunit * 3 + n * set.xblock;
		var xr = set.xunit * 9 + n * set.xblock;

		ctx.lineWidth = set.xunit * 6;
		ctx.beginPath();
		ctx.moveTo(xl, 127);
		ctx.bezierCurveTo(xl, 127 - v * 0.12,
		                  xl, 127 - v * 0.40,
		                  set.xunit * 3 + (n + p) * set.xblock, 127 - v);

		// TODO: The angle of the bar top could be worked out better.
		ctx.lineTo(set.xunit * 9 + (n + p) * set.xblock, 127 - v + p / 6);
		ctx.bezierCurveTo(xr, 127 - v * 0.40,
		                  xr, 127 - v * 0.12,
		                  xr, 127);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
	}

	function drawNote(ctx, set, n, v, p) {
		return !!p ?
			drawBentNote(ctx, set, n, v, p) :
			drawStraightNote(ctx, set, n, v) ;
	}

	function drawControl(ctx, set, n, v, color) {
		var xc = set.xunit * 6 + n * set.xblock;

		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = set.xunit * 4;
		ctx.beginPath();
		ctx.moveTo(xc, 127);
		ctx.lineTo(xc, 127 + 3 - v);
		ctx.arc(xc, 127 - v, 3, 0.5 * Math.PI, 2.5 * Math.PI, false);
		ctx.stroke();
		ctx.closePath();
		ctx.restore();
	}

	function renderChannel(ctx, set, ch, state) {
		var array, n;

		drawChannel(ctx, set, ch);

		array = state.ccs;

		n = array.length;

		while(n--) {
			if (array[n] === undefined) { continue; }
			drawControl(ctx, set, n, array[n].data[2], array[n].color);
		}

		array = state.notesRender;
		n = array.length;

		while(n--) {
			if (!array[n]) { continue; }
			drawNote(ctx, set, n, array[n], state.pitch);
		}
	}

	function renderGraph(ctx, set, state) {
		var count = 16;

		ctx.save();
		clearCanvas(ctx, set);
		drawGrid(ctx, set);
		scaleCanvas(ctx, set);

		while (count--) {
			renderChannel(ctx, set, count, state[count]);
		}

		ctx.restore();
	}

	function renderNames(nodes, set, state) {
		var ch = 16,
		    active = [],
		    notes, n;

		while (ch--) {
			notes = state[ch].notes;
			n = notes.length;

			while (n--) {
				if (notes[n]) {
					active[n] = true;
				}
			}
		}

		n = 128;//active.length;

		while (n--) {
			if (active[n]) {
				nodes[n].classList.add('on');
			}
			else {
				nodes[n].classList.remove('on');
			}
		}
	}

	function toInteger(str) {
		return parseInt(str, 10);
	}

	function hslToArray(hsl) {
		return rhsl.exec(hsl).splice(1, 3).map(toInteger);
	}

	function createSettings(options, node) {
		var paddingLeft  = (options.paddingLeft || defaults.paddingLeft) * node.width;
		var paddingRight = (options.paddingRight || defaults.paddingRight) * node.width;
		var paddingTop   = (options.paddingTop || defaults.paddingTop) * node.height;
		var innerWidth   = node.width - paddingLeft - paddingRight;
		var innerHeight  = node.height - paddingTop;

		if (options.colors) {
			var col = options.colors.map(hslToArray);
			var l = col.length;

			// Populate missing fields with colors from default colors array.
			while (l--) {
				if (col[l] === undefined) {
					col[l] = colors[l];
				}
				else {
					col[l].push(1);
				}
			}
		}

		return {
			width:        node.width,
			height:       node.height,
			paddingLeft:  paddingLeft,
			paddingRight: paddingRight,
			paddingTop:   paddingTop,
			innerWidth:   innerWidth,
			innerHeight:  innerHeight,
			gridColor1:   options.gridColor1 || defaults.gridColor1,
			gridColor2:   options.gridColor2 || defaults.gridColor2,
			xblock:       innerWidth / innerHeight,
			xunit:        128 / innerHeight,
			colors:       col || colors
		};
	}

	function updateNoteRender(state, data) {
		var channel = returnChannel(data) - 1;
		var notesRender = state[channel].notesRender;
		var notesActual = state[channel].notes;
		var render  = notesRender[data[1]] || 0;
		var actual  = notesActual[data[1]];

		// Render value has reached actual value
		if (render === actual) {
			return false;
		}

		// Render value requires further iteration
		notesRender[data[1]] = (actual - render < 2) ?
			actual :
			render + (actual - render) * defaults.ease ;

		return true;
	}

	function updateCcColor(state, set, cc, now) {
		var channel = returnChannel(cc.data) - 1;
		var color = set.colors[channel];
		var fade = (defaults.fadeDuration - now + cc.time) / defaults.fadeDuration;

		if (fade < 0) {
			return false;
		}

		cc.color = toHSL(color[0], color[1] * fade, color[2], color[3] * (defaults.fadeLimit + (1 - defaults.fadeLimit) * fade));
		return true;
	}

	function updateNote(state, data) {
		state[returnChannel(data) - 1].notes[data[1]] = data[0] < 144 ? 0 : data[2] ;
	}

	function updateControl(state, data) {
		var obj = state[returnChannel(data) - 1].ccs[data[1]];

		if (!obj) {
			obj = {};
			state[returnChannel(data) - 1].ccs[data[1]] = obj;
		}

		obj.data = data;
		obj.time = now();
	}

	function MIDIGraph(options) {
		var canvasNode = typeof options.canvas === 'string' ?
		    	document.querySelector(options.canvas) : 
		    	options.canvas;
		
		//var canvasNode = node.querySelector('canvas');
		//var notesNode  = node.querySelector('.note_index');
		//var noteNodes = notesNode.querySelectorAll('li');

		if (!canvasNode.getContext) {
			throw new Error('options.node must contain a canvas element.');
		}

		var context = canvasNode.getContext('2d');
		var settings = createSettings(options, canvasNode);
		
		var state = [];
		var notes = [];
		var count = 16;
		var queued = false;

		//console.log('MIDIGraph instance created', node, graph);

		function render(now) {
			var c = 16,
			    i, cc;

			queued = false;
			
			i = notes.length;

			// Look through updated notes to determine which ones need to
			// continue being animated.
			while (i--) {
				if (updateNoteRender(state, notes[i])) {
					queueRender();
				}
				else {
					notes.splice(i, 1);
				}
			}

			// Look through each channel's ccs to determine what still needs to
			// be animated.
			while (c--) {
				i = state[c].ccs.length;

				while (i--) {
					cc = state[c].ccs[i];

					if (!cc) { continue; }

					if (updateCcColor(state, settings, cc, now)) {
						queueRender();
					}
				}
			}

			renderGraph(context, settings, state);
			//renderNames(noteNodes, settings, state);
		}

		function queueRender() {
			if (queued === true) { return; }
			
			window.requestAnimationFrame(render);
			queued = true;
		}

		while (count--) {
			state[count] = {
				notesRender: [],
				notes: [],
				ccs: [],
				pitch: 0
			};
		}

		return MIDI.Destination(function(e) {
			if (isNote(e.data)) {
				notes.push(e.data);
				updateNote(state, e.data, queueRender);
				queueRender(render);
				return;
			}

			if (isControl(e.data)) {
				updateControl(state, e.data);
				queueRender(render);
				return;
			}

			if (isPitch(e.data)) {
				state[returnChannel(e.data) - 1].pitch = pitchToFloat(e.data, options.range || 2);
				queueRender(render);
				return;
			}
		});
	}

	MIDI.Graph = MIDIGraph;
	MIDI.Graph.defaults = defaults;
	MIDI.register('graph', MIDI.Graph);
})();

// MIDI.ourtMap
// 
// Outputs a live updating map of MIDI state.

(function(MIDI) {
	'use strict';
	
	var defaults = {
	    	range: 2
	    };

	var isNote    = MIDI.isNote;
	var isControl = MIDI.isControl;
	var isPitch   = MIDI.isPitch;

	function now() {
		return window.performance.now();
	}

	function updateNote(state, data) {
		state[MIDI.channel(data) - 1].notes[data[1]] = data[0] < 144 ? 0 : data[2] ;
	}

	function updateControl(state, data) {
		var obj = state[MIDI.channel(data) - 1].ccs[data[1]];

		if (!obj) {
			obj = {};
			state[MIDI.channel(data) - 1].ccs[data[1]] = obj;
		}

		obj.data = data;
		obj.time = now();
	}

	function OutMap(fn) {
		var state = [];
		var count = 16;

		fn = fn || MIDI.noop;

		while (count--) {
			state[count] = {
				notes: [],
				ccs: [],
				pitch: 0
			};
		}
		
		// We call this function just once with the live state object. The
		// intention is that this object is observed for changes.
		fn(state);

		return MIDI.Destination(function(e) {
			if (isNote(e.data)) {
				updateNote(state, e.data);
				return;
			}

			if (isControl(e.data)) {
				updateControl(state, e.data);
				return;
			}

			if (isPitch(e.data)) {
				state[MIDI.channel(e.data) - 1].pitch = MIDI.pitchToFloat(e.data, defaults.range || 2);
				return;
			}
		});
	}

	MIDI.OutMap = OutMap;
	MIDI.OutMap.defaults = defaults;
	MIDI.register('outMap', MIDI.OutMap);
})(MIDI);

// MIDI.outArray
// 
// Outputs an OSC-like array of each MIDI event.

(function(MIDI) {
	'use strict';

	function numberToFloat(n) {
		return n / 127;
	}

	function Node(fn) {
		var node = MIDI.Destination(function(e) {
			var message = MIDI.message(e.data);
			
			if (message === MIDI.messages[6]) {
				return fn([
					e.receivedTime,
					message,
					MIDI.pitchToFloat(e.data)
				]);
			}
			
			return fn([
				e.receivedTime,
				message,
				e.data[1],
				numberToFloat(e.data[2])
			]);
		});

		return node;
	}

	MIDI.OutArray = Node;
	MIDI.register('outArray', Node);
})(MIDI);
// MIDI.Log
// 
// Logs MIDI events to the console.

(function(MIDI) {
	"use strict";

	function Log() {
		// We deliberately make Log() a destination node
		// so that folks don't put it in a critical path. Hmm.
		return MIDI.Destination(function(e) {
			console.log(e.data);
		});
	}

	MIDI.Log = Log;
	MIDI.register('log', Log);
})(MIDI);