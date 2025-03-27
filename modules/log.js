const noop = function() {};

const DEBUG = window.DEBUG && window.DEBUG.MIDI !== false;

export const log = DEBUG && window.console ?
    console.log.bind(console, '%cMIDI %c%s', 'color: #d8a012; font-weight: 600;', 'color: #c1a252; font-weight: 300;') :
    noop ;

export const logGroup = DEBUG && window.console ?
    console.groupCollapsed.bind(console, '%cMIDI %c%s', 'color: #d8a012; font-weight: 600;', 'color: #c1a252; font-weight: 300;') :
    noop ;

export const logGroupEnd = DEBUG && window.console ?
    console.groupEnd.bind(console) :
    noop ;
