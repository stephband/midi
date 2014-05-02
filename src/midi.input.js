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
		inputs[input.name] = {
			input: input
		};
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

	function call(listener) {
		listener(this);
	}

	function Input(name) {
		var node = MIDI.Source();
		var input;

		function send(e) {
			node.send(e);
		}

		function listen(input) {
			// WebMIDI is dropping multiple listeners.
			// https://code.google.com/p/chromium/issues/detail?id=163795#c121
			// To get round this, we distribute our own listeners. 
			
			var obj = inputs[input.id];
			var listeners = obj.listeners;
			
			if (!listeners) {
				listeners = obj.listeners = [send];
				input.addEventListener('midimessage', function(e) {
					listeners.forEach(call, e);
				});
			}
			else {
				obj.listeners.push(send);
			}
		}

		MIDI.request(function(midi) {
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
