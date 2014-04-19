(function (window) {
    'use strict';

    var MIDI = window.MIDI = window.MIDI || {};

    // Node prototype

    var proto = {
        out: out1,
        send: send
    };

    function noop() {}

    function out1(fn) {
        // Override send with this listener function. Because we want this
        // thing to be fast in the most common case, where exactly one
        // listener function is specified.
        this.send = fn;
        this.out = out2;
        return this;
    }

    function out2(fn) {
        var listeners = [this.send, fn];

        Object.defineProperty(this, 'listeners', {
            value: listeners
        });

        this.out = out3;

        // Fall back to prototype send
        delete this.send;
        return this;
    }

    function out3(fn) {
        this.listeners.push(fn);
        return this;
    }

    function send(message) {
        if (!this.listeners) { return; }

        var length = this.listeners.length,
            l = -1;

        while (++l < length) {
            this.listeners[l](message);
        }
        
        return this;
    }
    
    function passThru(e, send) {
        this.send.apply(this, arguments);
    }
    
    function Node(fn) {
        return Object.create(proto, {
            in: {
                value: fn || passThru,
                enumerable: true
            }
        });
    }

    function Source(fn) {
        var node = Node(noop);
        return node;
    }

    function Destination(fn) {
        var node = Node(fn);
        node.send = noop;
        return node;
    }

    MIDI.Node = Node;
    MIDI.Source = Source;
    MIDI.Destination = Destination;
})(window);
