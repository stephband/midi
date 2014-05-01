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