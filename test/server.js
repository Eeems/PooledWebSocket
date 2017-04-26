var test = require('tape'),
	lib = require('../pooledwebsocket'),
	PooledWebSocket = lib.PooledWebSocket,
	Pool = lib.Pool;

test('Dummy', function(t){
	t.ok(true, 'Dummy test');
	t.end();
});

Pool.release();