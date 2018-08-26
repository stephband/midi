
/*
<midi-monitor>

Import the custom element:

```
import '//stephen.band/midi/components/midi-monitor/midi-monitor.js';
```

The `<midi-monitor>` element plots incoming messages in a rolling list.

```html
<midi-monitor>
```

<midi-monitor>

*/

import { define } from '../../../dom/dom.js';
import { numberToNote, on, toChannel, toType } from '../../midi.js';
import { print } from '../../modules/print.js';

var DEBUG = true;

const maxEntriesDefault = 80;

function digits2(n) {
	return n < 10 ? '0' + n : n ;
}

function digits3(n) {
	return n < 100 ? '0' + digits2(n) : n ;
}

function msToTime(ms) {
	var h, m, s;

	h = Math.floor(ms / 3600000);
	ms = ms - h * 3600000;
	m = Math.floor(ms / 60000);
	ms = ms - m * 60000;
	s = Math.floor(ms / 1000);
	ms = ms - s * 1000;

	return digits2(h) + ':' +
		digits2(m) + ':' +
		digits2(s) + ':' +
		digits3(Math.floor(ms))
}


// Track state

const state = {};

function setState(chan, type, byte, value) {
	const chanState = state[chan]     || (state[chan] = {});
	const typeState = chanState[type] || (chanState[type] = {});
	typeState[byte] = value;
	return value;
}

function getState(chan, type, byte) {
	const chanState = state[chan];
	if (!chanState) { return; }
	const typeState = chanState[type];
	return typeState && typeState[byte];
}

function removeState(chan, type, byte) {
	const chanState = state[chan];
	if (!chanState) { return; }
	const typeState = chanState[type];
	if (!typeState) { return; }
	const byteState = typeState[byte];
	typeState[byte] = undefined;
	return byteState;
}


// Render

function renderBlank(trTemplate, tdNodes, tbody, nodes) {
	// Fill template with spaces
	tdNodes[0].textContent = '\xa0';
	tdNodes[1].textContent = '\xa0';
	tdNodes[2].textContent = '\xa0';
	tdNodes[3].textContent = '\xa0';
	tdNodes[4].textContent = '\xa0';
	tdNodes[5].textContent = '\xa0';
	tdNodes[6].textContent = '\xa0';

	const trNode = trTemplate.cloneNode(true);

	// Put the new node in the table
	tbody.insertBefore(trNode, tbody.firstChild);

	// Keep a nodes of nodes so we can throw them away when the table
	// gets too big.
	nodes.push(trNode);
}

function renderEntry(trTemplate, tdNodes, tbody, nodes, maxEntries, time, port, message) {
	// For some reason, Chrome is dropping the MIDI connection unless we
	// explicitly log midi event objects.
	//console.log(time, message);

	const type = toType(message);
	const chan = toChannel(message);

	// Populate the table cells
	tdNodes[0].textContent = msToTime(time);
	tdNodes[1].textContent = port && port.name;
	tdNodes[2].textContent = type;
	tdNodes[3].textContent = chan;
	tdNodes[4].textContent = message[1];
	tdNodes[5].textContent = (type === 'noteon' || type === 'noteoff' || type === 'polytouch') ?
		numberToNote(message[1]) :
		'' ;
	tdNodes[6].textContent = message[2];

	const trNode = trTemplate.cloneNode(true);

	// Put the new node in the table
	//node.appendChild(trNode);
	tbody.insertBefore(trNode, tbody.firstChild);

	if (type === 'noteon') {
		if (message[2]) {
			trNode.setAttribute('class', 'on');
			setState(chan, 'note', message[1], {
				node: trNode
			});
		}
		// Support noteon val 0
		else {
			let data = removeState(chan, 'note', message[1]);
			console.log(data);
			if (data) {
				data.node.removeAttribute('class');
			}
		}
	}
	// Support noteoff
	else if (type === 'noteoff') {
		let data = removeState(chan, 'note', message[1]);
		if (data) {
			data.node.removeAttribute('class');
		}
	}

	nodes.push(trNode);

	// Throw away nodes when the table gets too big.
	if (nodes.length > maxEntries) {
		nodes.shift().remove();
	}

	//rootNode.scrollTop = 10000000000;
}


// Define custom element

define('midi-monitor', function setup(node) {
	const template   = node.shadowRoot.querySelector('template').content;
	const trTemplate = template.querySelector('tr');
	const tdNodes    = trTemplate.querySelectorAll('td');
	const tbody      = node.shadowRoot.querySelector('#tbody');
	const maxEntries = node.getAttribute('max-entries') ?
		parseInt(node.getAttribute('max-entries'), 10) :
		maxEntriesDefault ;

	// A queue of entries yet to be rendered
	const entries = [];

	// A list of rendered nodes
	const nodes   = [];

	let frame;

	function requestRender() {
		if (frame) { return; }
		frame = window.requestAnimationFrame(renderEntries);
	}

	function renderEntries() {
		frame = null;
		let n = -1;
		let entry;

		// Render each entry in entries
		while (++n < entries.length) {
			entry = entries[n];
			renderEntry(trTemplate, tdNodes, tbody, nodes, maxEntries, entry[0], entry[1], entry[2]);
		}

		// Clear out the entries queue
		entries.length = 0;
	}

	// Populate monitor with a list of blank entries
	let n = 20;

	while (n--) {
		renderBlank(trTemplate, tdNodes, tbody, nodes);
	}

	// Listen to incoming MIDI
	on([], function(time, port, message) {
		if (!port) { return; }

		entries.push(arguments);

		// Render asynchronously
		requestRender();
	});

	print('<midi-monitor> initialised', node);
}, {}, `
<!-- We have to use absolute paths for CSS inside the shadow DOM because we do
not know where the root document is. -->
<link rel="stylesheet" href="http://stephen.band/components/midi-monitor/midi-monitor.css"/>

<div class="head-block block">
	<table class="console-table">
		<thead>
			<tr>
				<th class="time-th">Time</th>
				<th class="port-th">Port</th>
				<th class="type-th">Message</th>
				<th class="chan-th">Ch</th>
				<th class="num-th">No</th>
				<th class="note-th">Note</th>
				<th class="val-th">Value</th>
			</tr>
		</thead>
	</table>
</div>

<div class="body-block block">
	<table class="console-table">
		<tbody id="tbody"></tbody>
	</table>
</div>

<template>
	<tr>
		<td class="time-td"></td>
		<td class="port-td"></td>
		<td class="type-td"></td>
		<td class="chan-td"></td>
		<td class="num-td"></td>
		<td class="note-td"></td>
		<td class="val-td"></td>
	</tr>
</template>`);
