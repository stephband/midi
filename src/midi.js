// MIDI module.

(function (window) {
	'use strict';

	var MIDI = {};

	MIDI.request = navigator.requestMIDIAccess ?
		navigator.requestMIDIAccess() :
		new Promise(function(accept, reject){
			reject('Your browser does not support MIDI via the navigator.requestMIDIAccess() API.');
		}) ;

	window.MIDI = MIDI;
})(window);
