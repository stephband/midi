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
