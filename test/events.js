import { test as group } from '../../fn/module.js';
import * as MIDI from '../modules/events.js';

group('MIDI listeners', function(test, log) {

	// MIDI message status bytes
	//
	// noteoff         128 - 143
	// noteon          144 - 159
	// polytouch       160 - 175
	// control         176 - 191
	// pc              192 - 207
	// channeltouch    208 - 223
	// pitch           224 - 240

	test('MIDI.on([144], fn)', function(equals, done) {
		var expects = [
			[144,64,127]
		];

		function update(e) {
			equals(e.data, expects.shift());
		}

		MIDI.on([144], update);
		MIDI.trigger(null, [144,64,127]);
		MIDI.trigger(null, [156,64,0]);
		MIDI.off([144], update);
		MIDI.trigger(null, [144,64,127]);

		done();
	}, 1);

	test('MIDI.on([144, 60], fn)', function(equals, done) {
		var expects = [
			[144,60,2]
		];

		function update(e) {
			equals(e.data, expects.shift());
		}

		MIDI.on([144, 60], update);
		MIDI.trigger(null, [144,62,127]);
		MIDI.trigger(null, [146,60,0]);
		MIDI.trigger(null, [144,60,2]);
		MIDI.off([144, 60], update);
		MIDI.trigger(null, [144,60,2]);

		done();
	}, 1);

	test('MIDI.on({ port: "test-id", 0: 144, 1: 60 }, fn)', function(equals, done) {
		var expects = [
			[144,60,2]
		];

		function update(e) {
			equals(e.data, expects.shift());
		}

		MIDI.on({
			'port': "test-id",
			'0': 144,
			'1': 60
		}, update);

		MIDI.trigger({ id: 'test-id' }, [144,62,127]);
		MIDI.trigger({ id: 'test-id' }, [146,60,0]);
		MIDI.trigger({ id: 'test-id' }, [144,60,2]);
		MIDI.trigger(null, [144,60,2]);
		MIDI.trigger({ id: 'test-id-2' }, [144,60,2]);

		MIDI.off({
			'port': "test-id",
			'0': 144,
			'1': 60
		}, update);

		MIDI.trigger({ id: 'test-id' }, [144,60,2]);

		done();
	}, 1);

	test('MIDI.on({ channel: 1, type: "note" }, fn)', function(equals, done) {
		var expects = [
			[144,62,127],
			[144,60,2],
			[128,62,0]
		];

		function update(e) {
			equals(expects.shift(), e.data);
		}

		MIDI.on({ channel: 1, type: "note" }, update);
		MIDI.trigger(null, [144,62,127]);
		MIDI.trigger(null, [146,60,0]);
		MIDI.trigger(null, [144,60,2]);
		MIDI.trigger(null, [128,62,0]);
		MIDI.off({ channel: 1, type: "note" }, update);
		MIDI.trigger(null, [144,60,2]);

		done();
	}, 3);

	test('MIDI.on({ channel: 2 }, fn)', function(equals, done) {
		var expects = [
			[129,1,20],
			[145,64,30],
			[177,64,20]
		];

		function update(e) {
			equals(expects.shift(), e.data);
		}

		MIDI.on({ channel: 2 }, update);
		MIDI.trigger(null, [183,64,127]);
		MIDI.trigger(null, [183,1,0]);
		MIDI.trigger(null, [183,1,20]);
		MIDI.trigger(null, [129,1,20]);
		MIDI.trigger(null, [144,64,0]);
		MIDI.trigger(null, [145,64,30]);
		MIDI.trigger(null, [146,64,0]);
		MIDI.trigger(null, [177,64,20]);
		MIDI.off({ channel: 2 }, update);
		MIDI.trigger(null, [177,60,2]);

		done();
	}, 3);

	test('MIDI.on({ channel: 6, type: "control", name: 1 }, fn)', function(equals, done) {
		var expects = [
			[181,1,0],
			[181,1,20]
		];

		function update(e) {
			equals(expects.shift(), e.data);
		}

		MIDI.on({ channel: 6, type: "control", name: 1 }, update);
		MIDI.trigger(null, [181,64,127]);
		MIDI.trigger(null, [181,1,0]);
		MIDI.trigger(null, [181,1,20]);
		MIDI.trigger(null, [182,1,20]);
		MIDI.trigger(null, [181,64,0]);
		MIDI.off({ channel: 6, type: "control", name: 1 }, update);
		MIDI.trigger(null, [181,60,2]);

		done();
	}, 2);

	test('MIDI.on({ channel: 8, type: "control", name: "modulation" }, fn)', function(equals, done) {
		var expects = [
			[183,1,0],
			[183,1,20]
		];

		function update(e) {
			equals(expects.shift(), e.data);
		}

		MIDI.on({ channel: 8, type: "control", name: "modulation" }, update);
		MIDI.trigger(null, [183,64,127]);
		MIDI.trigger(null, [183,1,0]);
		MIDI.trigger(null, [183,1,20]);
		MIDI.trigger(null, [184,1,20]);
		MIDI.trigger(null, [183,64,0]);
		MIDI.off({ channel: 8, type: "control", name: "modulation" }, update);
		MIDI.trigger(null, [183,60,2]);

		done();
	}, 2);

	test('MIDI.on({ channel: 8, type: "control", name: "modulation", value: 0 }, fn)', function(equals, done) {
		var expects = [
			[183,1,0]
		];

		function update(e) {
			equals(expects.shift(), e.data);
		}

		MIDI.on({ channel: 8, type: "control", name: "modulation", value: 0 }, update);
		MIDI.trigger(null, [183,64,127]);
		MIDI.trigger(null, [183,1,0]);
		MIDI.trigger(null, [183,1,20]);
		MIDI.trigger(null, [184,1,20]);
		MIDI.trigger(null, [183,64,0]);
		MIDI.off({ channel: 8, type: "control", name: "modulation", value: 0 }, update);
		MIDI.trigger(null, [183,60,2]);

		done();
	}, 1);
});
