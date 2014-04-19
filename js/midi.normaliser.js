(function() {
	function Normaliser(fn) {
		var node = MIDI.Destination(function(e) {
			// Format the message to an OSC-like array.
			var message = [
				MIDI.message(e.data[0]),
				MIDI.numberToInt(e.data[1]),
				MIDI.numberToFloat(e.data[2])
			];
			
			fn(message);
		});

		return node;
	}

	MIDI.Normaliser = Normaliser;
	MIDI.register('normalise', Normaliser);
})();