var uws = require('uws');
var os = require('os');
var WebSocket = uws;
var ab2str = require('arraybuffer-to-string');
var defaultPort = 8190;
var defaultIp = '192.168.1.50'; // Nothing special about this IP - just a random default one.
var connection = null;
var clientId = null;

var streamRef = 0;
var globalRequestId = 0;
var pendingRequests = [];
var mediaPackets = {};
var messageTypes = {};

/*
	A websocket service running on the Alfred server.
*/

module.exports = app => {
	
	if(app.client){
		// Running in client mode.
		startClient(app);
	}else{
		// Running in server mode.
		startServer(app);
	}
	
};

function startClient(app){
	
	// client info:
	var clientInfo = app.settings.client;
	
	// Server location etc (either just an IP/ DNS name, or a http:// or https:// URL):
	var serverUrl = (clientInfo.serverUrl || 'http://' + defaultIp + '/').trim();
	var clientName = clientInfo.name || os.hostname();
	var clientType = clientInfo.type || 'client'; // 'ui' (meaning a web UI), 'client' (meaning something that can perform more complex tasks etc).
	
	messageTypes = {
		"alfred/welcome": (message, ws) => {
			clientId = message.id;
		},
	};
	
	app.websocket = {
		messageTypes,
		send: msg => {
			connection && connection.send(msg);
		},
		
		start: () => connect()
	};
	
	function connect(){
		return new Promise((success, reject) => {
			
			// Support people typing in just a DNS address/ IP:
			if(serverUrl.startsWith("http")){
				serverUrl = serverUrl.replace("http", "ws");
			}else{
				serverUrl = (clientInfo.secure ? "ws" : "wss") + "://" + serverUrl + "/";
			}
			
			console.log('Attempting to connect to Alfred at ' + serverUrl);
			console.log('Previous Alfred location not correct? Don\'t forget the config in your config file. client: {serverUrl: "ip/dns/http url/https url"}');
			
			connection = new WebSocket(serverUrl + "live/");
			
			connection.__send = connection.send;
			
			connection.send = (message) => {
				if(message && message.type){
					
					connection.__send(JSON.stringify(message));
					
					
					if(message.requestId){
						return new Promise((success, reject) => {
							// Await the response.
							
							pendingRequests.push({requestId: message.requestId, success, reject, message});
							
						});
					}
					
				}else{
					connection.__send(message);
				}
			};
			
			connection.addEventListener("message", function(e){
				if(e.data[0] == '{'){
					var message = JSON.parse(e.data);
					console.log(e.data);
					if(!message || !message.type){
						return;
					}
					
					
					if(message.requestId){
						// response for a particular request.
						var request = pendingRequests.find(req => req.requestId == message.requestId);
						if(request){
							pendingRequests = pendingRequests.filter(req => req.requestId != message.requestId);
							
							// Run success handler:
							request.success(message);
						}
					}else{
						messageTypes[message.type] && messageTypes[message.type](message, connection);
					}
				}else{
					// AV frame data
					// console.log('AV frame', e.data);
				}
			});
			
			connection.addEventListener("error", function(e){
				console.log("Retry attempt occuring shortly. Websocket error: " + e);
				// Try again.
				connection = null;
				setTimeout(function(){
					connect();
				}, 2000);
			});
			
			connection.addEventListener("open", function(){
				connection.send({
					type: "alfred/hello",
					name: clientName,
					clientType:clientType
				});
				success();
			});
		});
	}
	
	return connect();
}

function startServer(app){
	
	var clientId = 1;
	
	// Create a WS server:
	app.websockets = {
		clients: [],
		server: new uws.Server({ port: app.settings.websockets ? (app.settings.websockets.port || defaultPort) : defaultPort }),
		messageTypes,
		find: (nameOrId, type) => {
			if(nameOrId && type){
				// Name and type:
				return app.websockets.clients.find(e => e.name == nameOrId && e.type==type);
			}
			// Just ID:
			return app.websockets.clients.find(e => e.id == nameOrId);
		}
	}
	
	/* Gets the JSON-friendly fields of a client. */
	function tidyClient(client){
		return {
			name: client.name,
			id: client.id,
			capabilities: client.capabilities,
			type: client.type,
			since: client.since
		};
	}
	
	/*
	* The special hello message. Must be sent before anything else.
	*/
	messageTypes["alfred/hello"] = (message, ws) => {
		// Client has started up. Message must contain type and name:
		if(!message.name || !message.clientType){
			console.log('Client name and clientType required. Got this message instead: ', message);
			ws.terminate();
			return;
		}
		
		var name = message.name.trim();
		var type = message.clientType.trim().toLowerCase();
		
		// Get client with same name:
		var client = app.websockets.find(name, type);
		
		if(client){
			// Client with this name/ type still cached - probably a broken disconnect (e.g. cable pulled out).
			// Just reclaim this client object.
			client.hello = message;
			client.socket = ws;
		}else{
			client = {
				name,
				type,
				capabilities: message.capabilities,
				hello: message,
				since: new Date(),
				id: clientId++,
				socket: ws
			};
			
			// Add the client:
			app.websockets.clients.push(client);
		}
		
		ws.client = client;
		
		// Let them know we're happy:
		ws.send({
			type:"alfred/welcome",
			id: client.id,
			requestId: message.requestId || undefined
		});
		
	};
	
	/* Client EP's - getting a list of available clients */
	messageTypes["client/list"] = (message, ws) => {
		
		// Send the response:
		ws.send({
			type: "client/list",
			clients: app.websockets.clients.map(tidyClient)
		});
		
	}
	
	/* Client EP's - forward a message to a particular client */
	messageTypes["client/forward"] = (message, ws) => {
		// Get the client by its ID:
		var target = app.websockets.find(message.id);
		
		if(!target){
			// The client with the ID targeted is not available.
			ws.send({
				type: "client/notfound",
				id: message.id
			});
			return;
		}
		
		if(!message.payload || !message.payload.type){
			ws.send({
				type: "client/forwardfail",
				message: "Forward must have a payload with a message type"
			});
			return;
		}
		
		// Send the message on now:
		message.payload.forwarded = {
			from: ws.client ? ws.client.id : undefined
		};
		
		target.socket.send(message.payload);
	}
	
	messageTypes["chat/message"] = (message, ws) => {
		
		// Message received is..
		var msgText = message.text;
		
		// Parse it:
		var words = app.speechTag(msgText).childNodes[0].words;
		
		// (Handle the textual command here)
		
	}
	
	/* Received a websocket message from the client */
	function onMessage(messageBuffer, ws) {
		var message;
		
		try{
			message = JSON.parse(ab2str(messageBuffer));
		}catch(e){
			console.log("Invalid WS message sent. It must be JSON: ", message, e);
			return;
		}
		
		if(!message.type){
			console.log('Message type required. Ignored: ',message);
			return;
		}
		
		if(!messageTypes[message.type]){
			console.log('Unknown message type. Ignored: ',message);
			return;
		}
		
		// Get the message handler:
		var messageHandler = messageTypes[message.type];
		
		// Must have started (and have ws.client set) if the type is not hello:
		if(!ws.client && message.type!="alfred/hello"){
			console.log('A message was received before "alfred/hello" was sent. Ignored: ',message);
			return;
		}
		
		// OK - run the handler now:
		messageHandler(message, ws);
	}
	
	// Client connected:
	app.websockets.server.on('connection', ws => {
		
		// Wrap send:
		ws._send = ws.send;
		ws.send = function(jsonData) {
			if(jsonData && jsonData.type) {
				// JSON encode:
				this._send(JSON.stringify(jsonData));
			}else{
				// As-is:
				this._send(jsonData);
			}
		};
		
		ws.on('message', message => onMessage(message, ws));
		
		// Client disconnected
		ws.on('close', e => {
			// Bye!
			if(ws.client){
				// Remove from the client list:
				app.websockets.clients = app.websockets.clients.filter(client => client!=ws.client);
			}
		});
		
	});
	
	// Add a broadcast function:
	app.websockets.server.broadcast = function(data, skip) {
		// Encode just the once:
		var jsonEncoded = JSON.stringify(data);
		app.websockets.server.clients.forEach(function(client) {
			if (client.readyState === uws.OPEN && client != skip) {
				client._send(jsonEncoded);
			}
		});
	};
	
}