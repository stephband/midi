
// Utilities

export function toArgsLength() {
    return arguments.length;
}

export function overload(fn, map) {
    return function overload() {
        const key     = fn.apply(null, arguments);
        const handler = (map[key] || map.default);
        //if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
        return handler.apply(this, arguments);
    };
}

export function remove(array, value) {
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
}
