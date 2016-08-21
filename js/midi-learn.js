(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('MIDI 0.6.2');
	console.log('http://github.com/soundio/midi');
	//console.log('MIDI events hub and helper library');
})(this);

(function(window) {
	"use strict";

	// Import

	var MIDI   = window.MIDI;
	var assign = Object.assign;

	//

	function isNotNoteOff(event) {
		return event[1] !== "noteoff";
	}



	assign(MIDI.prototype, {
		learn: function(fn) {
			var object;

			this
			.filter(isNotNoteOff)
			.head()
			.each(function(event) {
				object = [undefined, event[1], event[2]];
				fn(object);
			});

			return this.filter(function(event) {
				return object && (object.length < 2 ||
					object[1] === event[1] && (object.length < 3 ||
					object[2] === event[2] && (object.length < 4 ||
					object[3] === event[3]))) ;
			});
		},

		consolidateNotes: function() {
			var notes = {};

			function open(event) {
				var note = [event[0], "note", event[2], event[3], undefined];
				var number = event[2];

				// get rid of old note?
				if (notes[number]) {
					resolve(event);
				}

				// Resolve note duration
				notes[number] = function resolve(time) {
					delete notes[number];
					note[4] = time - event[0];
				};

				return note;
			}

			function resolve(event) {
				var resolver = notes[event[2]];
				return resolver && resolver(event[0]);
			}

			this.on('end', function() {
				var time = Fn.now();
				var number;

				for (number in notes) {
					notes[number](time);
				}
			});

			return this.map(function(noteon) {
				if (event[1] === "noteoff") {
					return resolve(event);
				}

				if (event[1] !== "noteon") {
					return open(event);
				}

				return event;
			};
		},

	});


})(window);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('______________________________');
})(this);
