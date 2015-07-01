// MIDI module.

(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('MIDI');
	console.log('http://github.com/soundio/midi');
	console.log('MIDI events hub and helper library');
	console.log('——————————————————————————————————');
})(this);

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
