import Remote from "./Remote.js"


var WS = {}
WS.ws = {readyState:0};

WS.init = function (){
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
    if (msg.type == "params"){
			// TODO - do something
    } else if (msg.type == "newRemote"){
      // TODO do something
    } else if ("removeRemote"){
      // TODO do something
    } else {
        console.log("WARNING: WS message with unknown type <"+msg.type+"> received.")
    }
  })

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
    msg = JSON.parse(message)
  } catch(e){
    console.log("could not parse message")
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

export default WS
