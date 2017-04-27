/* global require */
var test = require('tape'),
    lib = require('../pooledwebsocket'),
    Pool = lib.Pool;

test('Dummy', function(t){
    t.ok(true, 'Dummy test');
    t.end();
});

Pool.release();
