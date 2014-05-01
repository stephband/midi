
(function() {
	'use strict';
	
	var debug = true;

	function noop() {}

	function log(error) {
		console.log(error);
	}

	function find(array, id) {
		var l = array.length,
			item;

		while (l--) {
			item = array[l];

			if (item.name === id || item.id === id || item === id) {
				return array[l];
			}
		}

		console.log('MIDI port \'' + id + '\' not found');
		return;
	}

	function Output(id) {
		var port;

		var node = MIDI.Destination(function(e) {
			if (!port) { return; }
			if (debug) { console.log(e.data, 'output'); }
			port.send(e.data, e.time);
		});

		MIDI.request(function(midi) {
			port = id ? find(midi.outputs(), id) : midi.outputs()[0] ;
		});

		return node;
	}

	MIDI.Output = Output;
	MIDI.register('output', Output);
})();