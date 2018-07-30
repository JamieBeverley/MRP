var http = require('http');
var express = require('express');
var osc = require ('osc')
var WebSocket = require('ws')

var server = http.createServer();
var expressServer = express();

var password = "testing" // for performers
var dir = __dirname+"\\..\\"
expressServer.use(express.static(dir));
console.log("serving: "+dir)
server.on('request', expressServer)
server.listen(8000, function(){console.log("listening")})

var wsServer = new WebSocket.Server({server: server});

var uid =0;
var numClients=0;
var clients = {};
wsServer.on('connection', function(r){
  uid++;
  numClients++;
  console.log("__ Connection, ID:  "+uid+"  time:"+(new Date()));

  r.uid = uid;
  r.performer = false;
  r.pitch = 0;
  r.clarity = 0;
  r.turbidity = 0;
  r.strength = 0;
  r.spectralCentroid = 0;
  r.rms = 0;
	r.subscriptions = [];
	r.coordinates = [undefined,undefined];
	r.consented = false;

	console.log('sending existing remotes to new client: ');
	// Tell the client who's connected
	for (var i in clients){
		// TODO maybe handle this better so the participant is encouraged to reload their page when
		// 			this fails

		if (clients[i].consented){
			try{

				var msg = {type:"newRemote",coordinates:clients[i].coordinates,uid:clients[i].uid};
				r.send(JSON.stringify(msg))
			} catch (e){
				console.log("WARNING: error sending 'newRemote' to <"+r.uid+">")
				console.log(e)
			}
		}
	}

	// important that clients dictionary is updated after the above
	// so that this client isn't added twice
	clients[r.uid] = r;
  r.on('message', (x)=>onMessage(x,r));
  r.on('error', (x)=>onError(x,r));
  r.on('close', (x)=>onClose(x,r));
})

function onError(err,r){
  console.log("##### WS Error for client "+r.uid);
  console.log(err)
}

function onClose(x,r){
  // TODO Note: things could go wrong here if in some other thread clients[r.idnetifier] is being accessed.. maybe need a lock on clients or something
  console.log('Client left: '+r.uid)
	for(var i in clients){
		var index = clients[i].subscriptions.indexOf(r.uid)
		if (index > -1){
			clients[i].subscriptions.splice(index,1);
		}
	}
	if(r.consented){
    // [r.uid] - 'exclusionlist - don't send to itself
		wsServer.broadcast({type:"removeRemote",uid:r.uid}, [r.uid]);
	}
  delete clients[r.uid];
}


function onMessage(message, r){
  var msg;

  try{
    msg = JSON.parse(message);
  } catch (e){
    console.log("WARNING - error parsing JSON message from client: ");
    console.log(e);
		console.log("msg: "+msg)
    return;
  }
	if (msg.type == "params"){
		addValues(msg,r);
	} else if (msg.type == "consented"){
		if (typeof(msg.coordinates[0])=='number' && typeof(msg.coordinates[1]) == "number"){
			console.log("consent received from: "+r.uid);
			r.consented = true;
			r.coordinates = msg.coordinates;
			var newMsg = {type:"newRemote", uid:r.uid, coordinates: msg.coordinates};
			wsServer.broadcast(newMsg);
		} else{
			console.log("WARNING invalid location coordinates received from <"+r.uid+"> on consent");
		}
	} else if (msg.type == "subscribe"){
		r.subscriptions.push(msg.uid);
	} else if (msg.type == "unsubscribe"){
		var index = r.subscriptions.indexOf(msg.uid);
		if (index > -1) {
			r.subscriptions.splice(index, 1);
		}
	}else if (msg.type =="unconsented"){
		r.consented = false;
		var newMsg = {type:"removeRemote",uid:r.uid};
		wsServer.broadcast(JSON.stringify(newMsg),[r.uid])
	} else {
		console.log("WARNING unrecognized msg type recevied: "+msg.type)
	}
}


setInterval(function(){
	for (var i in clients){
		for (var j in clients[i].subscriptions){
			var val = getParams(clients[clients[i].subscriptions[j]]);
			var msg = {
				type:"params",
				value: val
			}
			send(clients[i],msg);
		}
	}
},210)

function send(c, msg){
	try{
		c.send(JSON.stringify(msg))
	} catch (e){
		console.log("!!!ERROR: could not send: "+msg.type)
		console.log(e)
	}
}

wsServer.broadcast = function(msg, exclusionList=[]){
  if(typeof(msg) == "string"){
    msg = JSON.parse(msg);
  }
	var uid = msg.uid;
	var stringMsg = JSON.stringify(msg);
	for(var i in clients){
    if(!exclusionList.includes(clients[i].uid)){
      try{
        console.log("sending "+msg.type+" to client: "+clients[i].uid)
        clients[i].send(stringMsg);
      }catch (e){
        console.log("!!!!!!!ERROR: could not send msg <"+msg.type+"> to client: <"+i+">");
        console.log(e);
      }
    }
	}
}



function getParams(c){
	var obj = {
		uid: c.uid,
		pitch: c.pitch,
		clarity: c.clarity,
		turbidity: c.turbidity,
		strength: c.strength,
	  spectralCentroid: c.spectralCentroid,
	  rms: c.rms
	}
	return obj
}

function addValues(values, r){
  clients[r.uid].pitch = values.pitch;
  clients[r.uid].clarity = values.clarity;
  clients[r.uid].turbidity = values.turbidity;
  clients[r.uid].strength = values.strength;
  clients[r.uid].spectralCentroid = values.spectralCentroid;
  clients[r.uid].rms = values.rms;
}

function authenticate (pwd, r){
  if(msg.password == password){
    clients[r.uid].performer = true;
    console.log('____ Client '+r+" authenticated")
  } else{
    console.log('#### Unsuccessful authentication: '+msg.password);
  }
}

function mean(arr){
  var r = 0;
  for (var i in arr){
    r += arr[i]
  }
  return r/arr.length
}
