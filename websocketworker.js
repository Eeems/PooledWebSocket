/* eslint-env worker */
/* global clients */
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
    actions = {
        open: function(socket, data, source){
            if(socket){
                socket.ports.push(source);
                socket.property('extensions');
                socket.property('protocol');
                socket.property('readyState');
                socket.property('url');
                socket.event('open', []);
            }else{
                var ws = new WebSocket(data.url, data.protocols); // eslint-disable-line one-var
                socket = {
                    url: data.url,
                    socket: ws,
                    ports: [source],
                    postMessage: function(data){
                        data.url = socket.url;
                        data = JSON.stringify(sanitize(data));
                        if(socket.ports[0]){
                            socket.ports.forEach(function(port){
                                port.postMessage(data);
                            });
                        }else if('postMessage' in self){
                            postMessage(data);
                        }
                    },
                    event: function(name, args){
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
                    socket.event('open', arguments);
                };
                ws.onmessage = function(e){
                    socket.property('extensions');
                    socket.property('readyState');
                    var a = Array.prototype.slice.call(arguments);
                    a[0] = Object.assign({}, e);
                    if(e.data instanceof Blob){
                        var r = new FileReaderSync(); // eslint-disable-line one-var
                        a[0].data = r.readAsText(e.data);
                        socket.event('message', a);
                    }else{
                        a[0].data = e.data + '';
                        socket.event('message', a);
                    }
                };
                ws.onerror = function(){
                    socket.property('extensions');
                    socket.property('readyState');
                    socket.event('error', arguments);
                };
                ws.onclose = function(){
                    socket.property('extensions');
                    socket.property('readyState');
                    socket.event('close', arguments);
                    delete sockets[data.url];
                };
                sockets[data.url] = socket;
                console.info('Socket connection created');
            }
        },
        send: function(socket, data){
            socket.socket.send(data.data);
        },
        close: function(socket, data){
            socket.socket.close();
        },
        property: function(socket, data){
            socket.property(data.name);
        },
        detach: function(socket, data, source){
            if(socket.ports.indexOf(source) !== -1){
                socket.ports.splice(socket.ports.indexOf(source));
            }
            if(socket.ports.length === 0){
                socket.socket.close();
            }
            source.postMessage(JSON.stringify(sanitize({
                url: socket.url,
                action: 'event',
                event: 'close',
                arguments: []
            })));
        },
        release: function(socket, data){
            self.close();
        }
    },
    handle = function(e){
        if(e.data){
            var data = JSON.parse(e.data),
                source = e.source || e.target;
            if(['open', 'ping'].indexOf(data.action) === -1 && (!sockets[data.url] || !sockets[data.url].socket.readyState === 1)){
                throw new Error('Socket not open. ' + e.data);
            }else{
                var socket = sockets[data.url]; // eslint-disable-line one-var
                if(data.action in actions){
                    actions[data.action](socket, data, source);
                }
            }
        };
    };
self.addEventListener('message', handle);
onconnect = function(e){
    e.ports.forEach(function(port){
        port.onmessage = handle;
        port.start();
    });
};
if('clients' in self){
    clients.claim();
}
