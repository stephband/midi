(function(undefined) {

	function isNoteOff(data) {
		return data[0] > 127 && data[0] < 144 ;
	}

	function isNoteOn(data) {
		return data[0] > 143 && data[0] < 160 ;
	}

	function updateOn(node, data) {
		node.classList.add('on');
		node.style.height = data[2] + 'px'; //(data[2] * 100 / 127) + '%';
	}

	function updateOff(node, data) {
		node.classList.remove('on');
		node.style.height = 0;
	}

	function MIDIGraph(options) {
		var graph = Object.create(Object.prototype);

		var node = options.node ?
		    	typeof options.node === 'string' ?
		    	document.querySelector(options.node) : 
		    	options.node :
		    	document.getElementById('midi-graph') ;

		var nodes = node.querySelectorAll('.note_block');

		if (nodes.length !== 128) {
			throw Error('128 note blocks needed.');
			return;
		}

		graph.in = function(e) {
			// Crudely filter for notes at the moment

			if (isNoteOn(e.data)) {
				if (e.data[2] === 0) {
					// Actually a note off
					updateOff(nodes[e.data[1]], e.data);
					return;
				}

				updateOn(nodes[e.data[1]], e.data);
				return;
			}
			
			if (isNoteOff(e.data)) {
				updateOff(nodes[e.data[1]], e.data);
				return;
			}
		};

		return graph;
	}

	// Export the Node constructor
	if (this.window && !window.exports) {
		window.MIDIGraph = MIDIGraph;
	}
	else {
		module.name = 'midi-graph';
		exports = MIDIGraph;
	}
})();