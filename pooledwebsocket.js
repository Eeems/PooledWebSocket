(function(global,undefined){
	var events = {},
		pmh = null,
		pool = {
			postMessage: function(){
				var args = Array.prototype.slice.call(arguments);
				args.forEach(function(v,i){
					args[i] = JSON.stringify(v);
				});
				console.info('postMessage: '+JSON.stringify(args));
				pmh.call(pool,args);
			},
			open: function(url,protocols){
				pool.postMessage({
					action: 'open',
					url: url,
					protocols: protocols
				});
			},
			on: function(url,event,fn){
				events[event] || (events[event] = []);
				events[event].push(fn);
			}
		},
		revert = function(e){
			pmh = function(){
				return window.postMessage.apply(window,arguments);
			};
			window.addEventListener('message',function(e){
				pool.onmessage(e);
			});
			e && console.error(e);
			console.info('Reverting to non-pooled');
		};
	if('SharedWorker' in window){
		console.info('Using shared worker for pool');
		var worker = new SharedWorker('websocketworker.js');
		pmh = function(){
			return worker.port.postMessage.apply(worker.port,arguments);
		};
		worker.port.onmessage = function(e){
			pool.onmessage(e);
		};
		worker.onerror = function(e){
			console.error(e);
		};
		worker.port.start();
	}else if('serviceWorker' in navigator){
		console.info('Using service worker for pool');
		navigator.serviceWorker
			.register('websocketworker.js')
			.then(function(reg){
				pmh = function(){
					var c = navigator.serviceWorker.controller;
					return c.postMessage.apply(c,arguments);
				};
			})
			.catch(revert)
	}else{
		revert();
	}
	pool.onmessage = function(e){
		if(e.data){
			var data = JSON.parse(e.data);
			switch(data.action){
				case 'event':
					console.info('Event: '+data.event+' '+JSON.stringify(data.arguments));
					events[data.event] && events[data.event].forEach(function(fn){
						fn(data.arguments);
					});
				break;
				case 'property':
					pool.onmessage({
						action: 'event',
						name: 'property',
						arguments: [data.name,data.value]
					});
				break;
			}
		}
	};
	global.PooledWebSocket = function(url,protocols){
		var self = {},
			properties = {},
			onevents = {},
			events = {
				open: [],
				message: [],
				error: [],
				close: []
			},
			opened = false,
			errored = false;
		Object.defineProperties(self,{
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
					!onevents.onopen && opened && fn.apply(self,opened);
					onevents.onopen = fn;
				}
			},
			onmessage: {
				get: function(){
					return onevents.onmessage;
				},
				set: function(fn){
					onevents.onmessage = fn;
				}
			},
			onerror: {
				get: function(){
					return onevents.onerror;
				},
				set: function(fn){
					!onevents.onopen && errored && fn.apply(self,errored);
					onevents.onerror = fn;
				}
			},
			onclose: {
				get: function(){
					return onevents.onclose;
				},
				set: function(fn){
					onevents.onclose = fn;
				}
			},
			events: {
				get: function(){
					return events;
				}
			}
		});
		self.on = function(event,fn){
			events[event] || (events[event] = []);
			events[event].push(fn);
			return this;
		};
		self.send = function(data){
			pool.postMessage({
				action: 'send',
				url: url,
				data: data
			});
		};
		pool.open(url,protocols);
		pool.on(url,'open',function(){
			opened = arguments;
			events.open.forEach(function(fn){
				fn.apply(self,arguments);
			});
		});
		pool.on(url,'message',function(){
			events.message.forEach(function(fn){
				fn.apply(self,arguments);
			});
		});
		pool.on(url,'property',function(name,value){
			properties[name] = value;
		});
		pool.on(url,'error',function(){
			events.error.forEach(function(fn){
				fn.apply(self,arguments);
			});
		});
		pool.on(url,'close',function(){
			events.close.forEach(function(fn){
				fn.apply(self,arguments);
			});
		});
		return self;
	};
})(window);