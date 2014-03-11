// requires
var express = require('express');
var app = express();
var io = require('socket.io');
var port = process.argv[2] || 8888;
var server = require('http').createServer(app);
var socket = io.listen(server);
socket.set('transports', ['websocket']);
socket.set('browser client cache', false);

// setup static files directory
app.use(express.static(__dirname + '/public'));

// start server listening
server.listen(port);

// state
var buffer = {};
var count = {};


socket.of('/drawing').on('connection', function(client) {
	console.log("client connected");
	client.on('join', function(data){
		var room = data.room;
		if(count[room] == undefined){
			count[room]=0;
		}
		count[room]++;
		console.log("user joined: " + room);
		if(buffer[room] == undefined){
			buffer[room] = [];
		}
		client.join(room);
		client.room = room;
		client.broadcast.to(client.room).emit('message', {count: count, sessionId: client.sessionId})
	});
			
	// message
	client.on('paint', function(data) {
		
		var msg = {
			circle: data,
			session_id: data.sessionId
		}
		var roomBuffer = buffer[client.room];
		roomBuffer.push(msg)

		if (roomBuffer.length > 1024) roomBuffer.shift();

		client.broadcast.to(client.room).emit('paint', msg);

	});

    client.on('reset', function() {
        client.broadcast.emit('reset');
    });

    client.on('clear', function() {
        buffer[client.room] = [];
        client.broadcast.to(client.room).emit('clear');
    });

    client.on('leave', function(){
    	leaveHandler(client);
    });
	
	client.on('disconnect', function(){
		leaveHandler(client);
    });

    function leaveHandler(client){
    	count[client.room]--;
        client.broadcast.to(client.room).emit('message', {count: count, sessionId: client.sessionId});
        client.leave(client.room);
        if(count[client.room] == 0) {
			delete count[client.room];
			delete buffer[client.room];
		}	
    }
    
});
