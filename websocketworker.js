var sockets = {};
onconnect = function(e){
	e.ports.forEach(function(port){
		port.onmessage = function(e){
			if(e.data){
				var data = JSON.parse(e.data);
				if(data.action != 'open' && !sockets[data.url]){
					throw new Error('Socket not open. '+data);
				}else{
					switch(data.action){
						case 'open':
							var socket = sockets[data.url]
							if(socket){
								socket = sockets[data.url];
								socket.ports.push(port);
							}else{
								var ws = new WebSocket(data.url,data.protocols);
								socket = {
									url: data.url,
									socket: ws,
									ports: [port],
									postMessage: function(data){
										data.url = socket.url;
										data = JSON.stringify(data);
										socket.ports.forEach(function(port){
											port.postMessage(data);
										});
									},
									event: function(name,args){
										socket.postMessage({
											action: 'event',
											event: name,
											arguments: Array.prototype.slice.call(args)
										});
									},
									property: function(name){
										socket.postMessage({
											action: 'property',
											name: name,
											value: ws[name]
										});
									}
								};
								ws.onopen = function(){
									socket.property('extensions');
									socket.property('protocol');
									socket.property('readyState');
									socket.property('url');
									socket.event('open',arguments);
								};
								ws.onmessage = function(){
									socket.property('extensions');
									socket.property('readyState');
									socket.event('message',arguments);
								};
								ws.onerror = function(){
									socket.property('extensions');
									socket.property('readyState');
									socket.event('error',arguments);
								};
								ws.onclose = function(){
									socket.property('extensions');
									socket.property('readyState');
									socket.event('close',arguments);
									delete sockets[data.url];
								};
								sockets[data.url] = socket;
							}
						break;
						case 'send':
							sockets[data.url].socket.send(data.data);
						break;
						case 'close':
							sockets[data.url].socket.close();
						break;
						case 'property':
							sockets[data.url].property(data.name);
						break;
					}
				}
			}
			// Handle sending to socket
		};
		port.start();
		// Handle recieving from socket
	});
};