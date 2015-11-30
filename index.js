(function(global,undefined){
	global.ws = new PooledWebSocket('ws://localhost:8080/');
	ws.onopen = function(){
		ws.send('Hello world!');
	};
})(window);