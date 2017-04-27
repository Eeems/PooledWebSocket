/* global module global require */
(function(global, undefined){
    var Worker = typeof window === 'undefined' ? require('webworker-threads').Worker : 'Worker' in window ? window.Worker : null,
        exports = typeof window === 'undefined' ? module.exports : window,
        pool = {
            handler: null,
            worker: null,
            queue: [],
            events: {},
            postMessage: function(msg, origin){
                var args = [
                    JSON.stringify(msg),
                    origin
                ];
                console.info('postMessage: ' + JSON.stringify(args));
                pool.queue.push(args);
                if(pool.handler){
                    pool.queue.forEach(function(args){
                        pool.handler.apply(pool, args);
                    });
                    pool.queue = [];
                }
            },
            open: function(url, protocols){
                pool.postMessage({
                    action: 'open',
                    url: url,
                    protocols: protocols
                });
            },
            release: function(){
                pool.postMessage({
                    action: 'release'
                });
            },
            on: function(url, event, fn){
                pool.events[event] || (pool.events[event] = []);
                pool.events[event].push(fn);
            }
        },
        revert = function(e){
            if(typeof window !== 'undefined'){
                pool.handler = function(msg){
                    return window.postMessage(msg, location.origin);
                };
                window.addEventListener('message', function(e){
                    if(e.origin == location.origin){ // eslint-disable-line eqeqeq
                        pool.onmessage(e);
                    }
                });
            }
            pool.detach = function(url){
                // TODO - handle web socket in window
            };
            pool.release = function(){
                pool.postMessage({
                    action: 'release'
                });
            };
            e && console.error(e);
            console.info('Reverting to non-pooled');
        };
    if(typeof window !== 'undefined' && 'SharedWorker' in window){
        (function(){
            console.info('Using shared worker for pool');
            var worker = new SharedWorker('websocketworker.js');
            pool.worker = worker;
            pool.handler = function(){
                return worker.port.postMessage.apply(worker.port, arguments);
            };
            pool.detach = function(url){
                pool.postMessage({
                    action: 'detach',
                    url: url
                });
            };
            worker.port.onmessage = function(e){
                pool.onmessage(e);
            };
            worker.onerror = function(e){
                console.error(e);
            };
            worker.port.start();
        })();
    }else if(typeof window !== 'undefined' && 'serviceWorker' in navigator){
        console.info('Using service worker for pool');
        (function(){
            var sw = {
                    postMessage: function(){
                        queue.push(arguments);
                    }
                },
                queue = [],
                registration;
            pool.worker = sw;
            pool.handler = function(){
                return sw.postMessage.apply(sw, arguments);
            };
            pool.detach = function(url){
                // Do nothing. Service workers don't care
            };
            navigator.serviceWorker.oncontrollerchange = function(e){
                var reg = registration;
                sw = reg.active || reg.waiting || reg.installing || navigator.serviceWorker;
            };
            navigator.serviceWorker.onmessage = function(e){
                pool.onmessage(e);
            };
            navigator.serviceWorker
                .register('websocketworker.js', {
                    // scope: './pooledwebsocket'
                })
                .then(function(reg){
                    console.info('Service worker registered');
                    registration = reg;
                    sw = reg.active || reg.waiting || reg.installing || navigator.serviceWorker.controller;
                    pool.worker = sw;
                    while(queue.length){
                        sw.postMessage.apply(sw, queue.shift());
                    }
                    sw.onstatechange = function(e){
                        if(e.target.state !== 'activated'){
                            console.info('Using new service worker');
                            sw = e.target;
                        }
                    };
                })
                .catch(revert);
        })();
    }else if(Worker){
        (function(){
            console.info('Using worker for pool');
            var worker = new Worker('websocketworker.js');
            pool.worker = worker;
            pool.handler = function(){
                return worker.postMessage.apply(worker, arguments);
            };
            pool.detach = function(url){
                // Handle detaching from worker
            };
            worker.onmessage = function(e){
                pool.onmessage(e);
            };
            worker.onerror = function(e){
                console.error(e);
            };
            if(typeof window === 'undefined'){
                pool.release = function(){
                    worker.terminate();
                };
            }
        })();
    }else{
        revert();
    }
    pool.onmessage = function(e){
        if(e.data){
            var data = JSON.parse(e.data);
            switch(data.action){
                case'event':
                    console.info('Event: ' + data.event + ' ' + JSON.stringify(data.arguments));
                    pool.events[data.event] && pool.events[data.event].forEach(function(fn){
                        fn.apply({}, data.arguments);
                    });
                    break;
                case'property':
                    pool.onmessage({
                        data: JSON.stringify({
                            action: 'event',
                            event: 'property',
                            arguments: [data.name, data.value]
                        })
                    });
                    break;
                case'release':break;
            }
        }
    };
    exports.PooledWebSocket = function(url, protocols){
        var self = {},
            properties = {},
            onevents = {},
            events = {
                open: [],
                message: [],
                error: [],
                close: []
            },
            queue = {
                open: [],
                message: [],
                error: [],
                close: []
            };
        Object.defineProperties(self, {
            readyState: {
                get: function(){
                    return properties['readyState'];
                }
            },
            extensions: {
                get: function(){
                    return properties['extensions'];
                }
            },
            protocol: {
                get: function(){
                    return properties['protocol'];
                }
            },
            url: {
                get: function(){
                    return properties['url'];
                }
            },
            onopen: {
                get: function(){
                    return onevents.onopen;
                },
                set: function(fn){
                    onevents.onopen = fn;
                    self.runQueue('open');
                }
            },
            onmessage: {
                get: function(){
                    return onevents.onmessage;
                },
                set: function(fn){
                    onevents.onmessage = fn;
                    self.runQueue('message');
                }
            },
            onerror: {
                get: function(){
                    return onevents.onerror;
                },
                set: function(fn){
                    onevents.onerror = fn;
                    self.runQueue('error');
                }
            },
            onclose: {
                get: function(){
                    return onevents.onclose;
                },
                set: function(fn){
                    onevents.onclose = fn;
                    self.runQueue('close');
                }
            },
            events: {
                get: function(){
                    return events;
                }
            },
            pool: {
                get: function(){
                    return pool;
                }
            }
        });
        self.runQueue = function(name){
            if(queue[name]){
                queue[name].forEach(function(args){
                    events[name].forEach(function(fn){
                        fn.apply(self, args);
                    });
                    onevents['on' + name] && onevents['on' + name].apply(self, args);
                });
                if(events[name].length > 0 || onevents['on' + name]){
                    queue[name] = [];
                }
            }
            return self;
        };
        self.fire = function(name, args){
            queue[name].push(args);
            self.runQueue(name);
        };
        self.on = function(event, fn){
            events[event] || (events[event] = []);
            events[event].push(fn);
            self.runQueue(event);
            return self;
        };
        self.off = function(event, fn){
            if(events[event] && events[event].indexOf(fn) !== -1){
                events[event].splice(events[event].indexOf(fn), 1);
            }
            return self;
        };
        self.addEventListener = self.on;
        self.send = function(data){
            pool.postMessage({
                action: 'send',
                url: url,
                data: data
            });
        };
        self.detach = function(){
            pool.detach(url);
        };
        self.close = function(){
            pool.postMessage({
                action: 'close',
                url: url
            });
        };
        self.reconnect = function(){
            self.close();
            pool.open(url, protocols);
        };
        self.open = function(){
            if(self.readyState === 3){
                pool.open(url, protocols);
            }else{
                throw new Error('PooledWebSocket is already open');
            }
        };
        pool.open(url, protocols);
        pool.on(url, 'open', function(){
            self.fire('open', arguments);
        });
        pool.on(url, 'message', function(){
            self.fire('message', arguments);
        });
        pool.on(url, 'property', function(name, value){
            properties[name] = value;
        });
        pool.on(url, 'error', function(){
            self.fire('error', arguments);
        });
        pool.on(url, 'close', function(){
            self.fire('close', arguments);
        });
        return self;
    };
    exports.Pool = pool;
})(typeof window === 'undefined' ? global : window);
