(function(MIDI) {
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

	MIDI.Array = Node;
	MIDI.register('array', Node);
})(MIDI);