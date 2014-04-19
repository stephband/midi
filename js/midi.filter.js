(function(MIDI) {
	var types = MIDI.messages;

	var filters = {
		port: function(e, filter) {
			if (!e.target) { return false; }

			return typeof filter === 'number' ?
				filter === e.target.id :
				typeof filter === 'string' ?
				filter === e.target.name :
				filter === e.target ;
		},

		channel: function(e, filter) {
			if (e.channel === undefined) {
				e.channel = returnChannel(e.data);
			}

			return typeof filter === 'number' ?
				filter === e.channel :
				filter(e.channel) ;
		},

		message: function(e, filter) {
			if (e.message === undefined) {
				e.message = returnType(e.data);
			}

			return typeof filter === 'string' ?
				filter === e.message :
				filter(e.message) ;
		},

		data1: function(e, filter) {
			return typeof filter === 'number' ?
				filter === e.data[1] :
				filter(e.data[1]) ;
		},

		data2: function(e, filter) {
			return typeof filter === 'number' ?
				filter === e.data[2] :
				filter(e.data[2]) ;
		}
	};


	function returnType(data) {
		var name = types[Math.floor(data[0] / 16) - 8];
	
		// Catch type noteon with zero velocity and rename it as noteoff
		return name === types[1] && data[2] === 0 ?
			types[0] :
			name ;
	}

	function returnChannel(data) {
		return data[0] % 16 + 1;
	}

	function Node(options) {
		return MIDI.Node(function(e) {
			var data = e.data;
			var key;

			for (key in options) {
				if (filters[key] && !filters[key](e, options[key])) {
					return;
				}
			}

			e.channel = e.channel || returnChannel(e.data);
			e.message = e.message || returnType(e.data);

			this.send(e);
		});
	}

	MIDI.Filter = Node;
	MIDI.register('filter', Node);
})(MIDI);