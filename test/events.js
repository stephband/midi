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

	test('MIDI.on([1, "note"], fn)', function(equals, done) {
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
});

/*
group('MIDI streams', function(test, log) {
	test('MIDI([1,"note"])', function(equals, done) {
		var expects = [
			{ data: [144,60,1] },
			{ data: [128,60,0] },
			{ data: [144,90,1] },
			{ data: [128,90,0] }
		];

		function update(e) {
			equals(e.data, expects.shift().data);
		}

		MIDI.on([1,"note"], update)
		MIDI.trigger(null, [149,62,127]);
		MIDI.trigger(null, [146,60,0]);
		MIDI.trigger(null, [144,60,1]);
		MIDI.trigger(null, [128,60,0]);
		MIDI.trigger(null, [176,60,2]);
		MIDI.trigger(null, [176,60,2]);
		MIDI.trigger(null, [144,90,1]);
		MIDI.trigger(null, [128,90,0]);
		MIDI.trigger(null, [170,60,2]);
		MIDI.off([1, "note"], update);
		MIDI.trigger(null, [144,60,1]);

		done();
	}, 4);

	test('MIDI([144, 60, 2], fn)', function(equals, done) {
		var expects = [
			{ data: [144,60,2] }
		];

		function update(e) {
			equals(e.data, expects.shift().data);
		}

		MIDI.on([144,60,2], update);
		MIDI.trigger(null, [144,62,127]);
		MIDI.trigger(null, [146,60,0]);
		MIDI.trigger(null, [144,60,2]);
		MIDI.off([144,60,2], update);
		MIDI.trigger(null, [144,60,2]);

		done();
	}, 1);

	test('MIDI([144])', function(equals, done) {
		var stream = MIDI([144]);
		var i = -1;
		var expects = [
			{ data: [144,64,127] },
			{ data: [156,64,0] }
		];


		stream.each(function(message) {
			equals(message.data, expects[++i].data);
		});

		MIDI.trigger(null, [144,64,127]);
		MIDI.trigger(null, [156,64,0]);

		stream.stop();
		done();
	}, 1);

	test('MIDI([144, 60])', function(equals, done) {
		var stream = MIDI([144, 60]);
		var i = -1;
		var expects = [
			{ data: [144,60,2] }
		];


		stream.each(function(message) {
			equals(message.data, expects[++i].data);
		});

		MIDI.trigger(null, [144,62,127]);
		MIDI.trigger(null, [146,60,0]);
		MIDI.trigger(null, [144,60,2]);

		stream.stop();
		done();
	}, 1);

	test('MIDI([144, 60, 2])', function(equals, done) {
		var stream = MIDI([144,60,2]);
		var i = -1;
		var expects = [
			{ data: [144,60,2] }
		];


		stream.each(function(message) {
			equals(message.data, expects[++i].data);
		});

		MIDI.trigger(null, [144,62,127]);
		MIDI.trigger(null, [146,60,0]);
		MIDI.trigger(null, [144,60,2]);

		stream.stop();
		done();
	}, 1);

	test('MIDI([1,"note"])', function(equals, done) {
		var stream = MIDI([1,"note"]);
		var i = -1;
		var expects = [
			{ data: [144,60,1] },
			{ data: [128,60,0] },
			{ data: [144,60,1] },
			{ data: [128,60,0] }
		];

		stream.each(function(message) {
			equals(expects[++i].data, message.data);
		});

		MIDI.trigger(null, [149,62,127]);
		MIDI.trigger(null, [146,60,0]);
		MIDI.trigger(null, [144,60,1]);
		MIDI.trigger(null, [128,60,0]);
		MIDI.trigger(null, [176,60,2]);
		MIDI.trigger(null, [176,60,2]);
		MIDI.trigger(null, [144,60,1]);
		MIDI.trigger(null, [128,60,0]);
		MIDI.trigger(null, [176,60,2]);

		stream.stop();
		done();
	}, 4);
});
*/
