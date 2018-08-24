var app_console = new App('#app_console');

(function(jQuery, app, undefined){
	var debug = true;

	var eventMax = 200;

	function digits2(n) {
		return n < 10 ? '0' + n : n ;
	}

	function digits3(n) {
		return n < 100 ? '0' + digits2(n) : n ;
	}

	function msToTime(ms) {
		var h, m, s;

		h = Math.floor(ms / 3600000);
		ms = ms - h * 3600000;
		m = Math.floor(ms / 60000);
		ms = ms - m * 60000;
		s = Math.floor(ms / 1000);
		ms = ms - s * 1000;

		return digits2(h) + ':' +
			digits2(m) + ':' +
			digits2(s) + ':' +
			digits3(Math.floor(ms))
	}

	// View functions

	jQuery.extend(app.views, {
		console: function(node, data) {
			var elem = jQuery(node);
			var template = app.templates.readout.content;
			var tdNodes = template.querySelectorAll('td');
			var prevNode;
			var list = [];
			var rootNode = document.getElementById('app_console');

			MIDI()
			.then(function(midi) {
				midi.on(function(e) {

// For some reason, Chrome is dropping the MIDI connection unless we
// explicitly log midi event objects.
console.log(e);

					// Populate the table cells
					tdNodes[0].textContent = msToTime(e.receivedTime);
					tdNodes[1].textContent = e.target.name;
					tdNodes[2].textContent = e.message;
					tdNodes[3].textContent = e.channel;
					tdNodes[4].textContent = e.data1;
					tdNodes[5].textContent = (e.message === 'noteon' || e.message === 'noteoff') ?
						MIDI.numberToNote(e.data1) + MIDI.numberToOctave(e.data1) :
						'' ;
					tdNodes[6].textContent = e.data2;

					var trNode = template.cloneNode(true);

					// Put the new node in the table
					//node.appendChild(trNode);
					node.insertBefore(trNode, node.firstChild);

					if (e.message === 'noteon') {
						(function(tr) {
							tr.setAttribute('class', 'on');

							e.noteoff(function() {
								tr.removeAttribute('class');
							});
						})(node.querySelector('tr:first-child'));
					}

					// Keep a list of nodes so we can throw them away when the table
					// gets too big.
					list.push(node.querySelector('tr:first-child'));

					if (list.length > eventMax) {
						node.removeChild(list.shift());
					}

					//rootNode.scrollTop = 10000000000;
				});
			})
		}
	});
})(jQuery, window.app_console);
