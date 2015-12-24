var sockets = {},
	sanitize = function(obj){
		var nobj = {};
		Object.getOwnPropertyNames(obj)
			.forEach(function(key){
				var v = obj[key];
				if(typeof v == 'object'){
					v = sanitize(v);
				}
				nobj[key] = v;
			});
		return nobj;
	},
	handle = function(e){
		if(e.data){
			var data = JSON.parse(e.data);
			if(['open','ping'].indexOf(data.action) == -1 && (!sockets[data.url] || !sockets[data.url].socket.readyState === 1)){
				throw new Error('Socket not open. '+e.data);
			}else{
				switch(data.action){
					case 'open':
						var socket = sockets[data.url]
						if(socket){
							socket = sockets[data.url];
							socket.ports.push(e.source);
							socket.property('extensions');
							socket.property('protocol');
							socket.property('readyState');
							socket.property('url');
							socket.event('open',[]);
						}else{
							var ws = new WebSocket(data.url,data.protocols);
							socket = {
								url: data.url,
								socket: ws,
								ports: [e.source],
								postMessage: function(data){
									data.url = socket.url;
									data = JSON.stringify(sanitize(data));
									if(socket.ports[0]){
										socket.ports.forEach(function(port){
											port.postMessage(data);
										});
									}else{
										postMessage(data);
									}
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
							ws.onmessage = function(e){
								socket.property('extensions');
								socket.property('readyState');
								var a = Array.prototype.slice.call(arguments);
								a[0] = Object.assign({},e);
								if(e.data instanceof Blob){
									var r = new FileReaderSync();
									a[0].data = r.readAsText(e.data);
									socket.event('message',a);
								}else{
									a[0].data = e.data+'';
									socket.event('message',a);
								}
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
							console.info('Socket connection created');
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
					case 'detach':
						if(!e.ports.length){
							handle({
								data: JSON.stringify({
									action: 'close',
									url: data.url
								})
							});
						}
					break;
				}
			}
		};
	};
self.addEventListener('message',handle);
onconnect = function(e){
	e.ports.forEach(function(port){
		port.onmessage = handle;
		port.start();
	});
};
if("clients" in self){
	clients.claim();
}