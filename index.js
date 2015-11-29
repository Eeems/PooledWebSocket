(function(global,undefined){
	global.ws = new PooledWebSocket('ws://localhost:8080/');
	ws.on('open',function(){
		ws.send('Hello world!');
	});
})(window);