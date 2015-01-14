// MIDI module.

(function (window) {
	'use strict';

	var MIDI = {};

	MIDI.request = navigator.requestMIDIAccess ?
		navigator.requestMIDIAccess() :
		new Promise(function(accept, reject){
			reject({
				message: 'This browser does not support Web MIDI.'
			});
		}) ;

	window.MIDI = MIDI;
})(window);
