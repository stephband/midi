
/*
<midi-graph>

The `<midi-graph>` element plots incoming note, control change and pitch bend
messages on a graph.

```html
<script type="module" src="//stephen.band/midi/components/midi-graph/midi-graph.js"></script>
<midi-graph>
```

<midi-graph></midi-graph>

This module has external dependencies.
*/

import { noop, overload, toInt } from '../../../fn/module.js';
import { element, now } from '../../../dom/module.js';
import { print } from '../../modules/print.js';
import { bytesToSignedFloat, toChannel, toNoteName, on, toType } from '../../module.js';

var defaults = {
		paddingLeft:  1 / 30,
		paddingRight: 1 / 30,
		paddingTop:   0.125,
		ease: 0.6667,
		fadeDuration: 6000,
		fadeLimit: 0.24,
		gridColor1: 'hsla(0, 0%, 60%, 0.24)',
		gridColor2: 'hsla(0, 0%, 40%, 0.12)'
	};

var colors = [
		[220, 56, 68, 1],
		[232, 57, 66, 1],
		[244, 58, 65, 1],
		[256, 60, 62, 1],
		[268, 60, 62, 1],
		[280, 61, 61, 1],
		[292, 62, 61, 1],
		[304, 58, 60, 1],
		[316, 62, 62, 1],
		[328, 64, 62, 1],
		[340, 66, 62, 1],
		[352, 68, 62, 1],
		[4,   71, 61, 1],
		[16,  74, 61, 1],
		[28,  77, 61, 1],
		[40,  80, 60, 1]
	];

var rhsl = /^(?:hsl\()?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?\)?$/;

function pitchToFloat(data, range) {
	return range * bytesToSignedFloat(data[1], data[2]) ;
}

function toHSL(h, s, l, a) {
	return ['hsla(', h, ',', s, '%,', l, '%,', a, ')'].join('');
}

function clearCanvas(ctx, set) {
	ctx.clearRect(0, 0, set.width, set.height);
}

function scaleCanvas(ctx, set) {
	ctx.setTransform(
		set.innerWidth / (128 * set.xblock),
		0,
		0,
		set.innerHeight / 127,
		set.paddingLeft,
		set.paddingTop
	);

	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
}

function drawGrid(ctx, set) {
	ctx.save();
	ctx.lineWidth = 2;
	ctx.strokeStyle = set.gridColor1;
	ctx.beginPath();
	ctx.moveTo(0, set.paddingTop + 1);
	ctx.lineTo(set.width, set.paddingTop + 1);
	ctx.stroke();
	ctx.closePath();
	ctx.lineWidth = 2;
	ctx.strokeStyle = set.gridColor2;
	ctx.beginPath();
	ctx.moveTo(0, set.paddingTop + set.innerHeight / 2);
	ctx.lineTo(set.width, set.paddingTop + set.innerHeight / 2);
	ctx.stroke();
	ctx.closePath();
	ctx.restore();
}

function drawChannel(ctx, set, c) {
	var hsla = toHSL.apply(this, set.colors[c]);
	ctx.fillStyle = hsla;
	ctx.strokeStyle = hsla;
}

function drawStraightNote(ctx, set, n, v) {
	ctx.lineWidth = set.xunit * 6;
	ctx.fillRect(set.xunit * 3 + n * set.xblock, 127 - v, 6 * set.xunit, v);
	ctx.strokeRect(set.xunit * 3 + n * set.xblock, 127 - v, 6 * set.xunit, v);
}

function drawBentNote(ctx, set, n, v, p) {
	var xl = set.xunit * 3 + n * set.xblock;
	var xr = set.xunit * 9 + n * set.xblock;

	ctx.lineWidth = set.xunit * 6;
	ctx.beginPath();
	ctx.moveTo(xl, 127);
	ctx.bezierCurveTo(xl, 127 - v * 0.12,
					  xl, 127 - v * 0.40,
					  set.xunit * 3 + (n + p) * set.xblock, 127 - v);

	// TODO: The angle of the bar top could be worked out better.
	ctx.lineTo(set.xunit * 9 + (n + p) * set.xblock, 127 - v + p / 6);
	ctx.bezierCurveTo(xr, 127 - v * 0.40,
					  xr, 127 - v * 0.12,
					  xr, 127);
	ctx.fill();
	ctx.stroke();
	ctx.closePath();
}

function drawNote(ctx, set, n, v, p) {
	return p ?
		drawBentNote(ctx, set, n, v, p) :
		drawStraightNote(ctx, set, n, v) ;
}

function drawControl(ctx, set, n, v, color) {
	var xc = set.xunit * 6 + n * set.xblock;

	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = set.xunit * 4;
	ctx.beginPath();
	ctx.moveTo(xc, 127);
	ctx.lineTo(xc, 127 + 3 - v);
	ctx.arc(xc, 127 - v, 3, 0.5 * Math.PI, 2.5 * Math.PI, false);
	ctx.stroke();
	ctx.closePath();
	ctx.restore();
}

function renderChannel(ctx, set, ch, state) {
	var array, n;

	drawChannel(ctx, set, ch);

	array = state.ccs;

	n = array.length;

	while(n--) {
		if (array[n] === undefined) { continue; }
		drawControl(ctx, set, n, array[n].data[2], array[n].color);
	}

	array = state.notesRender;
	n = array.length;

	while(n--) {
		if (!array[n]) { continue; }
		drawNote(ctx, set, n, array[n], state.pitch);
	}
}

function renderGraph(ctx, set, state) {
	var count = 16;

	ctx.save();
	clearCanvas(ctx, set);
	drawGrid(ctx, set);
	scaleCanvas(ctx, set);

	while (count--) {
		renderChannel(ctx, set, count, state[count]);
	}

	ctx.restore();
}

function renderNames(nodes, set, state) {
	var ch = 16,
		active = [],
		notes, n;

	while (ch--) {
		notes = state[ch].notes;
		n = notes.length;

		while (n--) {
			if (notes[n]) {
				active[n] = true;
			}
		}
	}

	n = 128;//active.length;

	while (n--) {
		if (active[n]) {
			nodes[n].classList.add('on');
		}
		else {
			nodes[n].classList.remove('on');
		}
	}
}

function hslToArray(hsl) {
	return rhsl.exec(hsl).splice(1, 3).map(toInt);
}

function createSettings(options, node) {
	var paddingLeft  = (options.paddingLeft || defaults.paddingLeft) * node.width;
	var paddingRight = (options.paddingRight || defaults.paddingRight) * node.width;
	var paddingTop   = (options.paddingTop || defaults.paddingTop) * node.height;
	var innerWidth   = node.width - paddingLeft - paddingRight;
	var innerHeight  = node.height - paddingTop;

	if (options.colors) {
		var col = options.colors.map(hslToArray);
		var l = col.length;

		// Populate missing fields with colors from default colors array.
		while (l--) {
			if (col[l] === undefined) {
				col[l] = colors[l];
			}
			else {
				col[l].push(1);
			}
		}
	}

	return {
		width:        node.width,
		height:       node.height,
		paddingLeft:  paddingLeft,
		paddingRight: paddingRight,
		paddingTop:   paddingTop,
		innerWidth:   innerWidth,
		innerHeight:  innerHeight,
		gridColor1:   options.gridColor1 || defaults.gridColor1,
		gridColor2:   options.gridColor2 || defaults.gridColor2,
		xblock:       innerWidth / innerHeight,
		xunit:        128 / innerHeight,
		colors:       col || colors
	};
}

function updateNoteRender(state, message) {
	var channel     = toChannel(message[0]) - 1;
	var notesRender = state[channel].notesRender;
	var notesActual = state[channel].notes;
	var render      = notesRender[message[1]] || 0;
	var actual      = notesActual[message[1]];

	// Render value has reached actual value
	if (render === actual) {
		return false;
	}

	// Render value requires further iteration
	notesRender[message[1]] = (actual - render < 2) ?
		actual :
		render + (actual - render) * defaults.ease ;

	return true;
}

function updateCcColor(state, set, cc, now) {
	var channel = toChannel(cc.data[0]) - 1;
	var color = set.colors[channel];
	var fade = (defaults.fadeDuration - now + cc.time) / defaults.fadeDuration;

	if (fade < 0) {
		return false;
	}

	cc.color = toHSL(color[0], color[1] * fade, color[2], color[3] * (defaults.fadeLimit + (1 - defaults.fadeLimit) * fade));
	return true;
}

function updateNote(state, message) {
	state[toChannel(message[0]) - 1].notes[message[1]] = message[0] < 144 ? 0 : message[2] ;
}

function updateControl(state, data) {
	var obj = state[toChannel(data[0]) - 1].ccs[data[1]];

	if (!obj) {
		obj = {};
		state[toChannel(data[0]) - 1].ccs[data[1]] = obj;
	}

	obj.data = data;
	obj.time = now();
}

const lis = Array
	.from({length: 128})
	.map(function(n, i) {
		return '<li>' + toNoteName(i) + '</li>';
	})
	.join('');

// define(name, setup, attributes, shadow)
element('midi-graph', {
	shadow: `<!-- We have to use absolute paths for CSS inside the shadow DOM because we do
		not know where the root document is. -->
		<link rel="stylesheet" href="//stephen.band/midi/components/midi-graph/midi-graph.css"/>
		<canvas class="midi-graph-canvas" width="1920" height="320"></canvas>
		<ul class="midi-graph-ul">${lis}</ul>
		`,

	construct: function setup(root) {
		// Todo: get options from attributes?
		var options = {};

		const canvasNode = this.shadowRoot.querySelector('canvas');
		const notesNode  = this.shadowRoot.querySelector('ul');
		const noteNodes  = notesNode.querySelectorAll('li');
		const context    = canvasNode.getContext('2d');
		const settings   = createSettings(options, canvasNode);
		const state      = [];
		const notes      = [];

		let count = 16;
		let frame;

		function requestRender() {
			if (frame) { return; }
			frame = window.requestAnimationFrame(render);
		}

		function render(now) {
			frame = null;

			let c = 16, i, cc;

			i = notes.length;

			// Look through updated notes to determine which ones need to
			// continue being animated.
			while (i--) {
				if (updateNoteRender(state, notes[i])) {
					requestRender();
				}
				else {
					notes.splice(i, 1);
				}
			}

			// Look through each channel's ccs to determine what still needs to
			// be animated.
			while (c--) {
				i = state[c].ccs.length;

				while (i--) {
					cc = state[c].ccs[i];

					if (!cc) { continue; }

					if (updateCcColor(state, settings, cc, now)) {
						requestRender();
					}
				}
			}

			renderGraph(context, settings, state);
			renderNames(noteNodes, settings, state);
		}

		while (count--) {
			state[count] = {
				notesRender: [],
				notes: [],
				ccs: [],
				pitch: 0
			};
		}

		this.input = overload((message) => toType(message[0]), {
			'noteon': function(message) {
				notes.push(message);
				updateNote(state, message, requestRender);
				requestRender(render);
			},

			'noteoff': function(message) {
				notes.push(message);
				updateNote(state, message, requestRender);
				requestRender(render);
			},

			'control': function(message) {
				updateControl(state, message);
				requestRender(render);
			},

			'pitch': function(message) {
				state[toChannel(message[0]) - 1].pitch = pitchToFloat(message, options.range || 2);
				requestRender(render);
				return;
			},

			'default': noop
		});

		var sourceAttr = this.getAttribute('source');

		if (!sourceAttr || sourceAttr === 'all') {
			on([], (e) => {
				// Ignore internally .trigger()ed events
				if (!e.target || !e.target.onmidimessage) { return; }
				this.input(e.data);
			});
		}

		print('<midi-graph> initialised', this);
	}
});
