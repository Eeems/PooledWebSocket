var fs = require('fs'),
	WebSocketServer = require('ws').Server,
	wserver = new WebSocketServer({
		host: 'localhost',
		port: 8090
	}),
	hserver = require('http').createServer(function(req,res){
		console.log('Serving: %s',req.url);
		var rs = fs.createReadStream(__dirname+req.url,{
			flags: 'r',
			autoClose: true
		});
		rs.on('open',function(){
			rs.pipe(res);
		});
		rs.on('error',function(e){
			res.end(e+'');
		});
	}),
	clients = [];

wserver.on('connection', function(ws) {
	clients.push(ws);
	ws.on('message', function(data) {
		console.log('Received: %s', data);
		console.log('Sent: %s', data);
		ws.send(data);
	});
	ws.on('close',function(){
		clients.splice(clients.indexOf(ws),1);
	});
});
hserver.listen(8080);
process.stdin.on('data',function(data){
	clients.forEach(function(ws){
		console.log('Sent: %s', data);
		ws.send(data);
	});
});
process.on('uncaughtException',function(e){
	console.error(e);
	console.trace(e.stack);
});