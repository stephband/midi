(function() {
	"use strict";

	function detectControl(data, time, port) {
		console.log(data, data[2] === 0);
	}

	// Bind
	MIDI.on([176, 4], detectControl);
	MIDI.on([176, 8], detectControl);
	MIDI.on([176], detectControl);

	// Test bind
	MIDI.in([176, 4, 0]);
	MIDI.in([176, 8, 0]);

	// Test remove binding
	MIDI.off([176], detectControl);

//	// Test remove binding
//	MIDI.off([176, 4], detectControl);
//
//	MIDI.trigger([176, 4, 0]);
//	MIDI.trigger([176, 8, 0]);
//
//	// Test remove of non-existant binding 
//	MIDI.off([176, 12], detectControl);
})();