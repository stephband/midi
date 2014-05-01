(function(MIDI) {
	// Test existence
	console.assert(!!window.MIDI, 'window.MIDI does not exist', window.MIDI);
})(MIDI);

(function(MIDI) {
	console.group('Testing MIDI.Input()...');

	var input = MIDI.Input(),
	    count = 0;

	console.log(input);

	// Test existence
	console.assert(!!input, 'input does not exist', input);
	console.assert(!input.in, 'input.in should not exist', input);
	console.assert(!!input.out, 'input.out should exist', input);

	input._send({ data: [144, 70, 70] });

	input.out(function(e) {
		count++;
	});

	input._send({ data: [144, 70, 70] });

	input.out(function(e) {
		count++;
	});

	input._send({ data: [144, 70, 70] });

	console.assert(count === 3, '3 messages should have been counted. There were', count);

	input.out(function(e) {
		console.log(e);
	});

	console.groupEnd();
})(MIDI);

(function(MIDI) {
	console.group('MIDI()...');

	var count = 0;

	var route = MIDI();

	console.log(route);

	route.in({ test: 1 });

	route
	.input()
	.log()
	.out(function(e) {
		count++;
	})
	.in({ data: 2 });

	console.assert(count === 1, '1 message should have been counted. There were', count);
})(MIDI);
