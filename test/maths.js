import { test } from '../../fn/fn.js';
import {
    bytesToInt14,
    bytesToSignedFloat,
    floatToInt7,
    floatToInt14,
    int7ToFloat,
    int7ToSignedFloat,
    int14ToFloat,
    int14ToSignedFloat,
    int14ToLSB,
    int14ToMSB,
    signedFloatToInt7,
    signedFloatToInt14
} from '../modules/maths.js';

test('MIDI maths functions', function(run, log, fixture) {
	run('bytesToInt14()', function(equals, done) {
        equals(bytesToInt14(0, 0), 0);
        equals(bytesToInt14(0, 64), 8192);
        equals(bytesToInt14(127, 127), 16383);
        done();
	});

    run('bytesToSignedFloat()', function(equals, done) {
        equals(bytesToSignedFloat(0, 0), -1);
        equals(bytesToSignedFloat(0, 64), 0);
        equals(bytesToSignedFloat(127, 127), 1);
        done();
	});

    run('floatToInt7()', function(equals, done) {
        equals(floatToInt7(0), 0);
        equals(floatToInt7(0.5), 64);
        equals(floatToInt7(1), 127);
        done();
	});

    run('floatToInt14()', function(equals, done) {
        equals(floatToInt14(0), 0);
        equals(floatToInt14(0.5), 8192);
        equals(floatToInt14(1), 16383);
        done();
	});

    run('int7ToFloat()', function(equals, done) {
        equals(int7ToFloat(0), 0);
        equals(int7ToFloat(127), 1);
        done();
	});

    run('int7ToSignedFloat()', function(equals, done) {
        equals(int7ToSignedFloat(0), -1);
        equals(int7ToSignedFloat(64), 0);
        equals(int7ToSignedFloat(127), 1);
        done();
	});

    run('int14ToFloat()', function(equals, done) {
        equals(int14ToFloat(0), 0);
        equals(int14ToFloat(16383), 1);
        done();
	});

    run('int14ToSignedFloat()', function(equals, done) {
        equals(int14ToSignedFloat(0), -1);
        equals(int14ToSignedFloat(8192), 0);
        equals(int14ToSignedFloat(16383), 1);
        done();
	});

    run('int14ToLSB()', function(equals, done) {
        equals(int14ToLSB(0), 0);
        equals(int14ToLSB(8192), 0);
        equals(int14ToLSB(16383), 127);
        done();
	});

    run('int14ToMSB()', function(equals, done) {
        equals(int14ToMSB(0), 0);
        equals(int14ToMSB(8192), 64);
        equals(int14ToMSB(16383), 127);
        done();
	});

    run('signedFloatToInt7()', function(equals, done) {
        equals(signedFloatToInt7(-2), 0);
        equals(signedFloatToInt7(-1), 0);
        equals(signedFloatToInt7(0), 64);
        equals(signedFloatToInt7(1), 127);
        equals(signedFloatToInt7(2), 127);
        done();
	});

    run('signedFloatToInt14()', function(equals, done) {
        equals(signedFloatToInt14(-2), 0);
        equals(signedFloatToInt14(-1), 0);
        equals(signedFloatToInt14(0), 8192);
        equals(signedFloatToInt14(1), 16383);
        equals(signedFloatToInt14(2), 16383);
        done();
	});
});
