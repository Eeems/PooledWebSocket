var WebSocketServer = require('ws').Server,
	server = new WebSocketServer({
		host: 'localhost',
		port: 8080
	});

server.on('connection', function(ws) {
	ws.on('message', function(data) {
		console.log('Received: %s', data);
	});
	ws.send('something');
});