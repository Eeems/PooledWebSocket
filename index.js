/* global PooledWebSocket */
(function(global, undefined){
    var ws = new PooledWebSocket('ws://localhost:8090/');
    ws.onopen = function(){
        ws.send('Hello world!');
    };
    ws.onmessage = function(e){
        console.log('Recieved Message: ' + e.data);
    };
    ws.onerror = function(e){
        console.error(e);
    };
    ws.onclose = function(){
        delete global.ws;
    };
    global.ws = ws;
})(window);
