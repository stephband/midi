const noop = function() {};

export const print = window.console ?
    console.log.bind(console, '%cMIDI %c%s', 'color: #d8a012; font-weight: 600;', 'color: #c1a252; font-weight: 300;') :
    noop ;

export const printGroup = window.console ?
    console.groupCollapsed.bind(console, '%cMIDI %c%s', 'color: #d8a012; font-weight: 600;', 'color: #c1a252; font-weight: 300;') :
    noop ;

export const printGroupEnd = window.console ?
    console.groupEnd.bind(console) :
    noop ;
