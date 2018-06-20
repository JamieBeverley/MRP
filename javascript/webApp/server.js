var http = require('http');
var express = require('express');
var osc = require ('osc')
var WebSocket = require('ws')

var server = http.createServer();
var expressServer = express();

var password = "testing" // for performers

//http server using current directory on 8000
expressServer.use(express.static(__dirname));
server.on('request', expressServer)
server.listen(8000, function(){console.log("listening")})

var wsServer = new WebSocket.Server({server: server});

var scOSC = new osc.UDPPort({
	localAddress: "0.0.0.0",
	localPort: 9000,
	remoteAddress: "127.0.0.1",
	remotePort: 9001
})
scOSC.open();

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
	r.coordinates = [undefined,undefined];
	r.consented = false;

	// Tell the client who's connected
	for (i in clients){
		// TODO maybe handle this better so the participant is encouraged to reload their page when
		// 			this fails

		if (clients[i].consented){
			try{
				console.log('sending new remote: '+i);
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

	if (msg.type == "consented"){
		if (typeof(msg.coordinates[0])=='number' && typeof(msg.coordinates[1]) == "number"){
			r.consented = true;
			r.coordinates = msg.coordinates;
			var newMsg = {type:"newRemote", uid:r.uid, coordinates: msg.coordinates};
			wsServer.broadcast(JSON.stringify(newMsg));
		} else{
			console.log("WARNING invalid location coordinates received from <"+r.uid+">");
		}
	} else {
		console.log("WARNING unrecognized msg type recevied: "+msg.type)
	}

  // switch (msg.type){
	// 	case "newRemote":
	//
  //   case "authenticate":
  //     authenticate(msg.password, r);
  //     break;
  //   case "values":
  //     addValues(msg,r)
  //     break;
  //   default:
  //     console.log("###### WARNING - uncrecognized ws message from client "+r.uid+" with type: "+msg.type);
  //     break;
  // }
}





wsServer.broadcast = function(msg){
	var stringMsg = JSON.stringify(msg);
	for(i in clients){
		try{
			clients[i].send(stringMsg);
		}catch (e){
			console.log("ERROR: could not send msg <"+msg.type+"> to client: <"+i+">");
		}
	}
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




setInterval(function(){
  var pitch= [];
  var turbidity= [];
  var clarity= [];
  var strength= [];
  var spectralCentroid = [];
  var rms= [];

  for(i in clients){
    pitch.push(clients[i].pitch?clients[i].pitch:0);
    turbidity.push(clients[i].turbidity?clients[i].turbidity:0);
    clarity.push(clients[i].clarity?clients[i].clarity:0);
    strength.push(clients[i].strength?clients[i].strength:0);
    spectralCentroid.push(clients[i].spectralCentroid?clients[i].spectralCentroid:0);
    rms.push(clients[i].rms?clients[i].rms:0);
  }
  var oscMsg = {
    address: "/target",
    args:[mean(pitch),mean(turbidity),mean(strength),mean(clarity),mean(spectralCentroid),mean(rms)]
  }

  scOSC.send(oscMsg)

},200)

function mean(arr){
  var r = 0;
  for (i in arr){
    r += arr[i]
  }
  return r/arr.length
}
