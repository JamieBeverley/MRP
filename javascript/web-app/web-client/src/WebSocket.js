import Remote from "./Remote.js"
import Proj from 'ol/proj'

var WS = {}
WS.ws = {readyState:0};

WS.init = function (source){
  try{
    window.WebSocket = window.WebSocket || window.MozWebSocket;
  } catch (e){
    alert("Could not initialize WebSocket - please make sure you are using a modern browser or try refreshing the page.")
    console.log(e);
    return
  }

  try{
  	WS.ws = new WebSocket ("ws://"+location.hostname+":"+location.port, 'echo-protocol');
  } catch (e){
    alert("Could not connect to server, please try refreshing the page.")
    console.log("Couldn't connect to ws: "+e)
    return
  }

  WS.ws.addEventListener('message', function(message){
    var msg = parseMessage(message);
    console.log("message: "+msg.type)
    if (msg.type == "params"){
			// TODO - do something
      sonifyParams(msg);
    } else if (msg.type == "newRemote"){
      // TODO do something
      console.log("adding new remote");
      new Remote(msg.uid, Proj.fromLonLat(msg.coordinates), source)
    } else if ("removeRemote"){
      // TODO do something
      console.log("deleting remote: "+Remote.remotes[msg.uid]);
      Remote.remotes[msg.uid].delete();
    } else {
        console.log("WARNING: WS message with unknown type <"+msg.type+"> received.")
    }
  })
  console.log("WebSocket initialized")
}

WS.sendParams = function(params){
  var msg = {}
  for (var i in params){
    if(isNaN(params[i])){
      console.log("WARNING value for " + i + " is undefined.")
      return // don't send anything if one of the values is undefined
    }
    msg[i] = params[i]
  }
  msg.type = "params"
  WS.send(msg)
}

function parseMessage(message){
  var msg;
  try {
    if(message.data){
      msg = JSON.parse(message.data)
    } else {
      msg = JSON.parse(message)
    }

  } catch(e){
    console.log("could not parse message")
    console.log(message);
    console.log(e)
    return undefined;
  }
  return msg
}


WS.send = function (msg) {
  try {
    if(typeof(msg) != "string"){
      msg = JSON.stringify(msg);
    }
    WS.ws.send(msg);
  } catch (e){
    console.log("ERROR: could not send sc ws message: "+e)
  }
}

function sonifyParams(params){
  console.log("sonify..."+params)
}


export default WS
