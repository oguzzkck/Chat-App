var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');
var users = {};
connections=[];
var offline =[];

server.listen(process.env.PORT || 3000);
console.log('Server running');

mongoose.connect('mongodb://oguzzkck:assa1212@ds149865.mlab.com:49865/chat', function(err){
	if(err){
		console.log(err);
	}else{
		console.log("connected to mongodb");
	}
});

var Schema = mongoose.Schema;
var chatPrivate = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type : Date, default: Date.now}
});

var signup = new Schema({
	username: String,
	userimg: String,
	password: String
});

var Chat2 = mongoose.model('Message2',chatPrivate);
var login = mongoose.model('signup', signup);
module.exports= login;

app.get('/', function(req,res){
	res.sendFile(__dirname + '/index.html')
});
app.get('/signup.html', function(req,res){
	res.sendFile(__dirname + '/signup.html')
});

var query5 = login.find({});
query5.exec(function(err,docs){
	if(err) throw err;
	for (var i = 0; i < docs.length; i++) {
		offline.push(docs[i].username);
	}
});

io.sockets.on('connection',function(socket){
	connections.push(socket);
	console.log('connected: %s sockets connected', connections.length);

	var query2 = Chat2.find({});
	var query4 = login.find({});

	query4.exec(function(err,docs){
		if(err) throw err;
		socket.emit('alluser',docs);
		socket.emit('login page',docs);
		socket.emit('kullanıcı',docs);
	});

	socket.on('channelfixer', function(mychannel){
		socket.join(mychannel);

	// Disconnect
	socket.on('disconnect', function(data){
		delete users[socket.username];
		offline.push(socket.username);
		console.log(offline);
		io.sockets.emit('disconnect user', socket.username);
		connections.splice(connections.indexOf(socket),1);
		console.log('Discconected: %s sockets connected', connections.length)
	});

	var signup ;
	socket.on('sign up', function(name,img,pass){
		socket.username = name;
		socket.userimg = img;
		socket.password = pass;
		signup = new login({username:name ,userimg:img, password: pass});
		signup.save();
	});

	//Send message
	socket.on('send message', function(data,callback){
		var msg = data.trim();
		if(msg.substr(0,3)=== '/w '){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name= msg.substring(0,ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					var ozelmsg = new Chat2({msg:msg , nick: socket.username});
					ozelmsg.save(function(err){
						users[name].emit('whisper', {msg: msg , user:socket.username});
					});
				}else{
					callback('Error');
				}
			}else{
				callback('Error');
			}
		}else if(msg.substr(0,3)=== '/y '){
			var name= msg.substring(3);
			if(name in users){
				query2.sort('-created').limit(1).exec(function(err,docs){
					if(err) throw err;
					socket.emit('load private msg',docs);
				});
			}else{
				callback('Error');
			}
		}else if(msg.substr(0,3)=== '/n '){
			var name= msg.substring(3);
			if(name in users){
				users[name].emit('privatemsg', {user:socket.username});
			}else{
				callback('Error');
			}
		}else{
				io.to(mychannel).emit('new message', {msg: msg , user:socket.username});
		}
	});

	//New User
	socket.on('new user', function(data,callback){
		if(data in users){
			callback(false);
		}else{
			callback(true);
			var konum = offline.indexOf(data);
			offline.splice(konum,1);
			io.sockets.emit('offline',offline);
			socket.username = data;
			users[socket.username]=socket;
		}
	});
	function offlineFunction(){
		io.sockets.emit('offline',offline);
	}
});
});
