import { test } from '../../fn/module.js';
import {
    createMessage,
    isControl,
    isNote,
    isPitch,
    normalise
} from '../modules/message.js';

test('MIDI message functions', function(run, log, fixture) {
	run('createMessage()', function(equals, done) {
        equals([128, 69, 127],  createMessage(1, 'noteoff', 'A4', 1));
        equals([231, 0, 0],     createMessage(8, 'pitch', 2, -2));
        equals([231, 0, 64],    createMessage(8, 'pitch', 2, 0));
        equals([231, 127, 127], createMessage(8, 'pitch', 2, 2));
        done();
	});

    run('isControl()', function(equals, done) {
        equals(false, isControl([175, 0, 0]));
        equals(true,  isControl([176, 0, 0]));
        equals(true,  isControl([191, 0, 0]));
        equals(false, isControl([192, 0, 0]));
        done();
	});

    run('isNote()', function(equals, done) {
        equals(false, isNote([127, 64, 64]));
        equals(true,  isNote([128, 64, 64]));
        equals(true,  isNote([159, 64, 64]));
        equals(false, isNote([160, 64, 64]));
        done();
	});

    run('isPitch()', function(equals, done) {
        equals(false, isPitch([223, 64, 64]));
        equals(true,  isPitch([224, 64, 64]));
        equals(true,  isPitch([239, 64, 64]));
        equals(false, isPitch([240, 64, 64]));
        done();
	});

    run('normalise()', function(equals, done) {
        equals([128, 64, 0], normalise([128, 64, 0]));
        equals([128, 64, 1], normalise([128, 64, 1]));
        equals([128, 64, 0], normalise([144, 64, 0]));
        equals([144, 64, 1], normalise([144, 64, 1]));
        done();
	});
});
