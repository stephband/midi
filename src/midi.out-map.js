(function(MIDI) {
	'use strict';
	
	var defaults = {
	    	range: 2
	    };

	var isNote    = MIDI.isNote;
	var isControl = MIDI.isControl;
	var isPitch   = MIDI.isPitch;

	function now() {
		return window.performance.now();
	}

	function updateNote(state, data) {
		state[MIDI.channel(data) - 1].notes[data[1]] = data[0] < 144 ? 0 : data[2] ;
	}

	function updateControl(state, data) {
		var obj = state[MIDI.channel(data) - 1].ccs[data[1]];

		if (!obj) {
			obj = {};
			state[MIDI.channel(data) - 1].ccs[data[1]] = obj;
		}

		obj.data = data;
		obj.time = now();
	}

	function OutMap(fn) {
		var state = [];
		var count = 16;

		fn = fn || MIDI.noop;

		while (count--) {
			state[count] = {
				notes: [],
				ccs: [],
				pitch: 0
			};
		}
		
		// We call this function just once with the live state object. The
		// intention is that this object is observed for changes.
		fn(state);

		return MIDI.Destination(function(e) {
			if (isNote(e.data)) {
				updateNote(state, e.data);
				return;
			}

			if (isControl(e.data)) {
				updateControl(state, e.data);
				return;
			}

			if (isPitch(e.data)) {
				state[MIDI.channel(e.data) - 1].pitch = MIDI.pitchToFloat(e.data, defaults.range || 2);
				return;
			}
		});
	}

	MIDI.OutMap = OutMap;
	MIDI.OutMap.defaults = defaults;
	MIDI.register('outMap', MIDI.OutMap);
})(MIDI);