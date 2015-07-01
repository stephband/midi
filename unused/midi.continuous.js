// Continuous
// 
// Converts matching continuous CC messages to absolute values, passing
// unmatched MIDI messages straight through to the out.

(function(MIDI) {
	'use strict';

	var defaults = {};
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function continuousValue(map, data) {
		var array = map[data[0]] || (map[data[0]] = []);
		var value = array[data[1]];
		
		if (!isDefined(value)) {
			value = 0;
		}
		
		value += e.data[2] - 63;
		value = value < 0 ? 0 : value > 127 ? 127 : value ;
		e.data[2] = array[data[1]] = value;
	}

	function Convert(options) {
		options = Object.assign({}, defaults, options);
		
		var filterNode = MIDI.Filter(options);
		var node = MIDI.Node(function(e) {
		    	filterNode.in(e);
		    });
		var map = {};
		
		options.reject = function reject(e) {
			node.send(e);
		};
		
		if (options.type === 'continuous') {
			filterNode.out(function(e) {
				continuousValue(map, e);
				node.send(e);
			});
		}

		return node;
	}

	MIDI.Convert = Convert;
	MIDI.register('convert', Convert);
})(MIDI);
