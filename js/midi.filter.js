(function(MIDI) {
	"use strict";
	
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
				e.channel = MIDI.channel(e.data);
			}

			//return typeOf(filter);

			return typeof filter === 'number' ?
				filter === e.channel :
				filter(e.channel) ;
		},

		message: function(e, filter) {
			if (e.message === undefined) {
				e.message = MIDI.message(e.data);
			}

			return typeof filter === 'string' ?
				filter === e.message :
				Object.prototype.toString.apply(filter) === '[object RegExp]' ?
				filter.test(e.message) :
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

	//var objectTypes = {
	//	'[object String]': equals,
	//	'[object Number]': equals,
	//	
	//	'[object RegExp]': function(regexp, value) {
	//		return regexp.test(value);
	//	}
	//};
//
	//function equals(val1, val2) {
	//	return val1 === val2;
	//}
//
	//function typeOf(object) {
	//	return objectTypes[Object.prototype.toString.apply(object)];
	//}

	function Node(options) {
		//var filters = {};
		//
		//for (key in options) {
		//	filters[key] = filters[key](options[key]);
		//}

		return MIDI.Node(function(e) {
			var data = e.data;
			var key;

			for (key in options) {
				if (filters[key] && !filters[key](e, options[key])) {
					if (options.reject) { options.reject(e); }
					return;
				}
			}

			e.channel = e.channel || MIDI.channel(e.data);
			e.message = e.message || MIDI.message(e.data);

			this.send(e);
		});
	}

	MIDI.Filter = Node;
	MIDI.register('filter', Node);
})(MIDI);