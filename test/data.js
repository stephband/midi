import { test } from '../../fn/fn.js';
import {
    controlToNumber,
    frequencyToNumber,
    normaliseNote,
    noteToNumber,
    numberToControl,
    numberToFrequency,
    numberToNote,
    numberToOctave,
    toStatus
} from '../modules/data.js';

test('MIDI data functions', function(run, log, fixture) {
    run('controlToNumber()', function(equals, done) {
        equals(controlToNumber('modulation'), 1);
        equals(controlToNumber('volume'), 7);
		equals(controlToNumber('sustain'), 64);
		equals(controlToNumber('98'), 98);
        done();
	});

    run('frequencyToNumber()', function(equals, done) {
		equals(frequencyToNumber(440, 27.5), 21, 'Frequency 27.5 is not MIDI number 21 (' + frequencyToNumber(440, 27.5) + ')');
		equals(frequencyToNumber(440, 55), 33,   'Frequency 55 is not MIDI number 33 (' +   frequencyToNumber(440, 55)   + ')');
		equals(frequencyToNumber(440, 110), 45,  'Frequency 110 is not MIDI number 45 (' +  frequencyToNumber(440, 110)  + ')');
		equals(frequencyToNumber(440, 220), 57,  'Frequency 220 is not MIDI number 57 (' +  frequencyToNumber(440, 220)  + ')');
		equals(frequencyToNumber(440, 440), 69,  'Frequency 440 is not MIDI number 69 (' +  frequencyToNumber(440, 440)  + ')');
		equals(frequencyToNumber(440, 880), 81,  'Frequency 880 is not MIDI number 81 (' +  frequencyToNumber(440, 880)  + ')');
		equals(frequencyToNumber(440, 1760), 93, 'Frequency 1760 is not MIDI number 93 (' + frequencyToNumber(440, 1760) + ')');
		equals(frequencyToNumber(440, 261.625565), 60, 'Frequency 261.625565 is not MIDI number 60 (' + frequencyToNumber(440, 261.625565) + ')');
        done();
	});

    run('normaliseNote()', function(equals, done) {
        equals(normaliseNote('Db7'), 'D♭7');
        equals(normaliseNote('E#1'), 'E♯1');
		equals(normaliseNote('Bb'), 'B♭');
		equals(normaliseNote('C#'), 'C♯');
        done();
	});

	var names = [
    	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'
    ];

    run('noteToNumber()', function(equals, done) {
		equals(noteToNumber('C0'), 12, 'MIDI note C0 is not 0 ('  + noteToNumber('C0')  + ')');
		equals(noteToNumber('C4'), 60, 'MIDI note C4 is not 60 (' + noteToNumber('C4') + ')');
		equals(noteToNumber('A4'), 69, 'MIDI note A4 is not 69 (' + noteToNumber('A4') + ')');

		var n = -1;
		var name;

		while (++n < 128) {
			name = names[n % 12] + (Math.floor(n / 12) - 1);
			equals(noteToNumber(name), n, 'MIDI note ' + name + ' is not ' + n + ' (' + numberToNote(n) + ')');
		}

        done();
	});

    run('numberToControl()', function(equals, done) {
		equals(numberToControl(1), 'modulation');
		equals(numberToControl(7), 'volume');
		equals(numberToControl(64), 'sustain');
        equals(numberToControl(98), '98');
        done();
	});

    run('numberToFrequency()', function(equals, done) {
		equals(numberToFrequency(440, 21), 27.5, 'MIDI note 21 is not 27.5 (' + numberToFrequency(440, 21) + ')');
		equals(numberToFrequency(440, 33), 55,   'MIDI note 33 is not 55 ('   + numberToFrequency(440, 33) + ')');
		equals(numberToFrequency(440, 45), 110,  'MIDI note 45 is not 110 ('  + numberToFrequency(440, 45) + ')');
		equals(numberToFrequency(440, 57), 220,  'MIDI note 57 is not 220 ('  + numberToFrequency(440, 57) + ')');
		equals(numberToFrequency(440, 69), 440,  'MIDI note 69 is not 440 ('  + numberToFrequency(440, 69) + ')');
		equals(numberToFrequency(440, 81), 880,  'MIDI note 81 is not 880 ('  + numberToFrequency(440, 81) + ')');
		equals(numberToFrequency(440, 93), 1760, 'MIDI note 93 is not 1760 (' + numberToFrequency(440, 93) + ')');
		equals(Math.round(numberToFrequency(440, 60)), 262,  'MIDI note 60 is not ~262 (' + numberToFrequency(440, 60) + ')');
        done();
    });

	run('numberToNote()', function(equals, done) {
		equals(numberToNote(12), 'C0', 'MIDI note 12 is not C0 (' + numberToNote(12) + ')');
		equals(numberToNote(60), 'C4', 'MIDI note 60 is not C4 (' + numberToNote(60) + ')');
		equals(numberToNote(69), 'A4', 'MIDI note 69 is not A4 (' + numberToNote(69) + ')');

		var n = -1;
		var name;

		while (++n < 128) {
			name = names[n % 12] + (Math.floor(n / 12) - 1);
			equals(numberToNote(n), name, 'MIDI note ' + n + ' is not ' + name + ' (' + numberToNote(n) + ')');
		}

        done();
	});

    run('toStatus()', function(equals, done) {
        // noteoff:      128
    	// noteon:       144
    	// polytouch:    160
    	// control:      176
    	// program:      192
    	// channeltouch: 208
    	// pitch:        224

        equals(toStatus(1, 'noteoff'), 128);
        equals(toStatus(2, 'noteoff'), 129);
        equals(toStatus(3, 'noteoff'), 130);
        equals(toStatus(4, 'noteoff'), 131);
        equals(toStatus(5, 'noteoff'), 132);
        equals(toStatus(6, 'noteoff'), 133);
        equals(toStatus(7, 'noteoff'), 134);
        equals(toStatus(8, 'noteoff'), 135);
        equals(toStatus(16,'noteoff'), 143);

        equals(toStatus(1, 'pitch'), 224);
        equals(toStatus(2, 'pitch'), 225);
        equals(toStatus(3, 'pitch'), 226);
        equals(toStatus(4, 'pitch'), 227);
        equals(toStatus(5, 'pitch'), 228);
        equals(toStatus(6, 'pitch'), 229);
        equals(toStatus(7, 'pitch'), 230);
        equals(toStatus(8, 'pitch'), 231);
        equals(toStatus(16,'pitch'), 239);

        done();
    });
});
