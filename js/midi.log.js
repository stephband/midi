(function(MIDI) {
	"use strict";

	function Log() {
		// We deliberately make Log() a destination node
		// so that folks don't put it in a critical path. Hmm.
		return MIDI.DestinationNode(function(e) {
			console.log(e.data);
		});
	}

	MIDI.Log = Log;
	MIDI.register('log', Log);
})(MIDI);