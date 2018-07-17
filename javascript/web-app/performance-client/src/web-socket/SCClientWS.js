window.WebSocket = window.WebSocket || window.MozWebSocket;

var SCClientWS = {}
SCClientWS.ws = {readyState:0};

SCClientWS.initSCClientWS = function (){

  // try{
  //   console.log("connecting via ws to: ws://localhost:8000");
  //   SCClientWS.ws = new WebSocket("ws://localhost:8000", 'echo-protocol');
  // } catch (e){
  // 	console.log("no WebSocket connection "+e)
  // }

  var connectToNodeSCClientWS = function(){
      if(SCClientWS.ws.readyState!= 1){
        console.log("connecting to sc client ws")
        try{
          SCClientWS.ws = new WebSocket("ws://"+location.hostname+":9000", 'echo-protocol')
        } catch (e){
          console.log("error connecting to sc client")
        }
        setTimeout(connectToNodeSCClientWS,5000)
      }
  };
  connectToNodeSCClientWS();

  SCClientWS.ws.onopen = function (){
    console.log("SC connection opened");
  }
  // Try to reconnect if error or close
  SCClientWS.ws.onclose = connectToNodeSCClientWS;
  SCClientWS.ws.onerror = connectToNodeSCClientWS;
  SCClientWS.ws.addEventListener("message", SCClientWS.onMessage);
}

SCClientWS.onMessage = function(message){
  var msg;
  try{
    msg = JSON.parse(msg);
  } catch (e){
    console.log("could not parse ws message from sc client")
    return
  }
  console.log(msg);
}



SCClientWS.send = function (msg) {
  try {
    if(typeof(msg) != "string"){
      msg = JSON.stringify(msg);
    }
    SCClientWS.ws.send(msg);
  } catch (e){
    console.log("ERROR: could not send sc ws message: "+e)
  }
}

export default SCClientWS
