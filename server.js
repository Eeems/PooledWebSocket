var WebSocketServer = require('ws').Server,
	server = new WebSocketServer({
		host: 'localhost',
		port: 8080
	})
	clients = [];

server.on('connection', function(ws) {
	clients.push(ws);
	ws.on('message', function(data) {
		console.log('Received: %s', data);
		ws.send(data);
	});
	ws.on('close',function(){
		clients.splice(clients.indexOf(ws),1);
	});
});
process.stdin.on('data',function(data){
	clients.forEach(function(ws){
		ws.send(data);
	});
});