// MIDI.Filter
// 
// Filters MIDI messages to those that match the rules specified in options.

(function(MIDI) {
	"use strict";

	var types = {
		port: function(filter) {
			var type = typeOf(filter);

			return type === 'number' ? function(e) {
					if (!e.target) { return false; }
					return e.target.id === (filter + '');
				} :
				type === 'string' ? function(e) {
					if (!e.target) { return false; }
					return e.target.name === filter;
				} :
				type === 'regexp' ? function(e) {
					if (!e.target) { return false; }
					return filter.test(e.target.name);
				} :
				function(e) {
					return e.target === filter;
				} ;
		},

		channel: function(filter) {
			var type = typeOf(filter);
			
			return type === 'number' ? function(e) {
					return channel(e) === filter;
				} :
				type === 'function' ? function(e) {
					return filter(channel(e));
				} :
				returnFalse ;
		},

		message: function(filter) {
			var type = typeOf(filter);
			
			return type === 'number' ? function(e) {
					return message(e) === filter;
				} :
				type === 'regexp' ? function(e) {
					return filter.test(message(e));
				} :
				type === 'function' ? function() {
					return filter(message(e));
				} :
				returnFalse ;
		},

		data1: function(e, filter) {
			var type = typeOf(filter);
			
			return type === 'number' ? function(e) {
					return e.data[1] === filter;
				} :
				type === 'function' ? function(e) {
					return filter(e.data[1]);
				} :
				returnFalse ;
		},

		data2: function(e, filter) {
			var type = typeOf(filter);
			
			return type === 'number' ? function(e) {
					return e.data[2] === filter;
				} :
				type === 'function' ? function(e) {
					return filter(e.data[2]);
				} :
				returnFalse ;
		}
	};

	var rtype = /^\[object\s([A-Za-z]+)/;

	function typeOf(object) {
		var type = typeof object;

		return type === 'object' ?
			rtype.exec(Object.prototype.toString.apply(object))[1].toLowerCase() :
			type ;
	}

	function returnFalse() {
		return false;
	}

	function channel(e) {
		return e.channel || (e.channel = MIDI.channel(e.data));
	}

	function message(e) {
		return e.message || (e.message = MIDI.message(e.data));
	}

	function Node(options) {
		var filters = {};
		
		for (key in options) {
			if (type[key]) {
				filters[key] = types[key](options[key]);
			}
		}

		return MIDI.Node(function(e) {
			var data = e.data;
			var key;

			for (key in filters) {
				if (!filters[key](e)) {
					if (options.reject) { options.reject(e); }
					return;
				}
			}

			this.send(e);
		});
	}

	MIDI.Filter = Node;
	MIDI.register('filter', Node);
})(MIDI);
