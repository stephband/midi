import { test } from '../../fn/module.js';
import {
    toControlNumber,
    frequencyToFloat,
    normaliseNoteName,
    toNoteNumber,
    toControlName,
    floatToFrequency,
    toNoteName,
    toNoteOctave,
    toStatus,
    toChannel,
    toType
} from '../modules/data.js';

test('MIDI data functions', function(run, log, fixture) {
    run('toControlNumber()', function(equals, done) {
        equals(toControlNumber('modulation'), 1);
        equals(toControlNumber('volume'), 7);
		equals(toControlNumber('sustain'), 64);
		equals(toControlNumber('98'), 98);
        done();
	});

    run('frequencyToFloat()', function(equals, done) {
		equals(frequencyToFloat(440, 27.5), 21, 'Frequency 27.5 is not MIDI number 21 (' + frequencyToFloat(440, 27.5) + ')');
		equals(frequencyToFloat(440, 55), 33,   'Frequency 55 is not MIDI number 33 (' +   frequencyToFloat(440, 55)   + ')');
		equals(frequencyToFloat(440, 110), 45,  'Frequency 110 is not MIDI number 45 (' +  frequencyToFloat(440, 110)  + ')');
		equals(frequencyToFloat(440, 220), 57,  'Frequency 220 is not MIDI number 57 (' +  frequencyToFloat(440, 220)  + ')');
		equals(frequencyToFloat(440, 440), 69,  'Frequency 440 is not MIDI number 69 (' +  frequencyToFloat(440, 440)  + ')');
		equals(frequencyToFloat(440, 880), 81,  'Frequency 880 is not MIDI number 81 (' +  frequencyToFloat(440, 880)  + ')');
		equals(frequencyToFloat(440, 1760), 93, 'Frequency 1760 is not MIDI number 93 (' + frequencyToFloat(440, 1760) + ')');
		equals(frequencyToFloat(440, 261.625565), 60, 'Frequency 261.625565 is not MIDI number 60 (' + frequencyToFloat(440, 261.625565) + ')');
        done();
	});

    run('normaliseNoteName()', function(equals, done) {
        equals(normaliseNoteName('Db7'), 'D♭7');
        equals(normaliseNoteName('E#1'), 'E♯1');
		equals(normaliseNoteName('Bb'), 'B♭');
		equals(normaliseNoteName('C#'), 'C♯');
        done();
	});

	var names = [
    	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'
    ];

    run('toNoteNumber()', function(equals, done) {
		equals(toNoteNumber('C0'), 12, 'MIDI note C0 is not 0 ('  + toNoteNumber('C0')  + ')');
		equals(toNoteNumber('C4'), 60, 'MIDI note C4 is not 60 (' + toNoteNumber('C4') + ')');
		equals(toNoteNumber('A4'), 69, 'MIDI note A4 is not 69 (' + toNoteNumber('A4') + ')');

		var n = -1;
		var name;

		while (++n < 128) {
			name = names[n % 12] + (Math.floor(n / 12) - 1);
			equals(toNoteNumber(name), n, 'MIDI note ' + name + ' is not ' + n + ' (' + toNoteName(n) + ')');
		}

        done();
	});

    run('toControlName()', function(equals, done) {
		equals(toControlName(1), 'modulation');
		equals(toControlName(7), 'volume');
		equals(toControlName(64), 'sustain');
        equals(toControlName(98), '98');
        done();
	});

    run('floatToFrequency()', function(equals, done) {
		equals(floatToFrequency(440, 21), 27.5, 'MIDI note 21 is not 27.5 (' + floatToFrequency(440, 21) + ')');
		equals(floatToFrequency(440, 33), 55,   'MIDI note 33 is not 55 ('   + floatToFrequency(440, 33) + ')');
		equals(floatToFrequency(440, 45), 110,  'MIDI note 45 is not 110 ('  + floatToFrequency(440, 45) + ')');
		equals(floatToFrequency(440, 57), 220,  'MIDI note 57 is not 220 ('  + floatToFrequency(440, 57) + ')');
		equals(floatToFrequency(440, 69), 440,  'MIDI note 69 is not 440 ('  + floatToFrequency(440, 69) + ')');
		equals(floatToFrequency(440, 81), 880,  'MIDI note 81 is not 880 ('  + floatToFrequency(440, 81) + ')');
		equals(floatToFrequency(440, 93), 1760, 'MIDI note 93 is not 1760 (' + floatToFrequency(440, 93) + ')');
		equals(Math.round(floatToFrequency(440, 60)), 262,  'MIDI note 60 is not ~262 (' + floatToFrequency(440, 60) + ')');
        done();
    });

	run('toNoteName()', function(equals, done) {
		equals(toNoteName(12), 'C0', 'MIDI note 12 is not C0 (' + toNoteName(12) + ')');
		equals(toNoteName(60), 'C4', 'MIDI note 60 is not C4 (' + toNoteName(60) + ')');
		equals(toNoteName(69), 'A4', 'MIDI note 69 is not A4 (' + toNoteName(69) + ')');

		var n = -1;
		var name;

		while (++n < 128) {
			name = names[n % 12] + (Math.floor(n / 12) - 1);
			equals(toNoteName(n), name, 'MIDI note ' + n + ' is not ' + name + ' (' + toNoteName(n) + ')');
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

    run('toChannel()', function(equals, done) {
        equals(1, toChannel(128));
        equals(3, toChannel(130));
        equals(1, toChannel(144));
        equals(3, toChannel(146));
        equals(2, toChannel(161));
        done();
	});

    run('toType()', function(equals, done) {
        equals('noteoff',   toType(128));
        equals('noteoff',   toType(143));
        equals('noteon',    toType(144));
        equals('noteon',    toType(159));
        equals('polytouch', toType(161));
        done();
	});
});
