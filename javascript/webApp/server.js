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

var id =0;
var numClients=0;
var clients = {};
wsServer.on('connection', function(r){
  id++;
  numClients++;
  console.log("__________ Connection, ID:  "+id)
  console.log("    "+(new Date()));
  console.log("__________")

  r.identifier = id;
  r.performer = false;
  r.pitch = 0;
  r.clarity = 0;
  r.turbidity = 0;
  r.strength = 0;
  r.spectralCentroid = 0;
  r.rms = 0;
  clients[r.identifier] = r;
  r.on('message', (x)=>onMessage(x,r));
  r.on('error', (x)=>onError(x,r));
  r.on('close', (x)=>onClose(x,r));
})

function onError(err,r){
  console.log("##### WS Error for client "+r.identifier);
  console.log(err)
}

function onClose(x,r){
  // TODO Note: things could go wrong here if in some other thread clients[r.idnetifier] is being accessed.. maybe need a lock on clients or something
  console.log('Client left: '+r.identifier)
  delete clients[r.identifier];
}


function onMessage(message, r){
  var msg;
  try{
    msg = JSON.parse(message);
  } catch (e){
    console.log("###### WARNING - error parsing JSON message from client: ");
    console.log(e);
    return;
  }
  switch (msg.type){
    case "authenticate":
      authenticate(msg.password, r);
      break;

    case "values":
      addValues(msg,r)
      break;
    default:
      console.log("###### WARNING - uncrecognized ws message from client "+r.identifier+" with type: "+msg.type);
      break;
  }
}

function addValues(values, r){
  clients[r.identifier].pitch = values.pitch;
  clients[r.identifier].clarity = values.clarity;
  clients[r.identifier].turbidity = values.turbidity;
  clients[r.identifier].strength = values.strength;
  clients[r.identifier].spectralCentroid = values.spectralCentroid;
  clients[r.identifier].rms = values.rms;
}

function authenticate (pwd, r){
  if(msg.password == password){
    clients[r.identifier].performer = true;
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
