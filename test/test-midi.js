module('MIDI Utilities', function(fixture) {

	var names = MIDI.noteNames;

	test('MIDI.numberToNote()', 131, function() {
		ok(MIDI.numberToNote(12) === 'C0', 'MIDI note 12 is not C0 (' + MIDI.numberToNote(12) + ')');
		ok(MIDI.numberToNote(60) === 'C4', 'MIDI note 60 is not C4 (' + MIDI.numberToNote(60) + ')');
		ok(MIDI.numberToNote(69) === 'A4', 'MIDI note 69 is not A4 (' + MIDI.numberToNote(69) + ')');

		var n = -1;
		var name;

		while (++n < 128) {
			name = names[n % 12] + (Math.floor(n / 12) - 1);
			ok(MIDI.numberToNote(n) === name, 'MIDI note ' + n + ' is not ' + name + ' (' + MIDI.numberToNote(n) + ')');
		}
	});

	test('MIDI.noteToNumber()', 131, function() {
		ok(MIDI.noteToNumber('C0') === 12, 'MIDI note C0 is not 0 (' + MIDI.noteToNumber('C0')  + ')');
		ok(MIDI.noteToNumber('C4') === 60, 'MIDI note C4 is not 60 (' + MIDI.noteToNumber('C4') + ')');
		ok(MIDI.noteToNumber('A4') === 69, 'MIDI note A4 is not 69 (' + MIDI.noteToNumber('A4') + ')');

		var n = -1;
		var name;

		while (++n < 128) {
			name = names[n % 12] + (Math.floor(n / 12) - 1);
			ok(MIDI.noteToNumber(name) === n, 'MIDI note ' + name + ' is not ' + n + ' (' + MIDI.numberToNote(n) + ')');
		}
	});

	test('MIDI.numberToFrequency()', 8, function() {
		ok(MIDI.numberToFrequency(21) === 27.5, 'MIDI note 21 is not 27.5 (' + MIDI.numberToFrequency(21) + ')');
		ok(MIDI.numberToFrequency(33) === 55,   'MIDI note 33 is not 55 (' + MIDI.numberToFrequency(33) + ')');
		ok(MIDI.numberToFrequency(45) === 110,  'MIDI note 45 is not 110 (' + MIDI.numberToFrequency(45) + ')');
		ok(MIDI.numberToFrequency(57) === 220,  'MIDI note 57 is not 220 (' + MIDI.numberToFrequency(57) + ')');
		ok(MIDI.numberToFrequency(69) === 440,  'MIDI note 69 is not 440 (' + MIDI.numberToFrequency(69) + ')');
		ok(MIDI.numberToFrequency(81) === 880,  'MIDI note 81 is not 880 (' + MIDI.numberToFrequency(81) + ')');
		ok(MIDI.numberToFrequency(93) === 1760, 'MIDI note 93 is not 1760 (' + MIDI.numberToFrequency(93) + ')');
		ok(Math.round(MIDI.numberToFrequency(60)) === 262,  'MIDI note 60 is not ~262 (' + MIDI.numberToFrequency(60) + ')');
	});

	test('MIDI.frequencyToNumber()', 8, function() {
		ok(MIDI.frequencyToNumber(27.5) === 21, 'Frequency 27.5 is not MIDI number 21 (' + MIDI.frequencyToNumber(27.5) + ')');
		ok(MIDI.frequencyToNumber(55) === 33,   'Frequency 55 is not MIDI number 33 (' +   MIDI.frequencyToNumber(55)   + ')');
		ok(MIDI.frequencyToNumber(110) === 45,  'Frequency 110 is not MIDI number 45 (' +  MIDI.frequencyToNumber(110)  + ')');
		ok(MIDI.frequencyToNumber(220) === 57,  'Frequency 220 is not MIDI number 57 (' +  MIDI.frequencyToNumber(220)  + ')');
		ok(MIDI.frequencyToNumber(440) === 69,  'Frequency 440 is not MIDI number 69 (' +  MIDI.frequencyToNumber(440)  + ')');
		ok(MIDI.frequencyToNumber(880) === 81,  'Frequency 880 is not MIDI number 81 (' +  MIDI.frequencyToNumber(880)  + ')');
		ok(MIDI.frequencyToNumber(1760) === 93, 'Frequency 1760 is not MIDI number 93 (' + MIDI.frequencyToNumber(1760) + ')');
		ok(MIDI.frequencyToNumber(261.625565) === 60, 'Frequency 261.625565 is not MIDI number 60 (' + MIDI.frequencyToNumber(261.625565) + ')');
	});
});