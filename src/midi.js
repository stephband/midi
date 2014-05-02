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
