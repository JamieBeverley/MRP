import Connection from "../connectables/Connection.js"
import Connectable from "../connectables/Connectable.js"

window.WebSocket = window.WebSocket || window.MozWebSocket;

var SCClientWS = {}
SCClientWS.connected = false

SCClientWS.initSCClientWS = function (){

  var connectToNodeSCClientWS = function(){
      if(!SCClientWS.connected){
        console.log("connecting to sc client ws")
        try{
          SCClientWS.ws = new WebSocket("ws://"+location.hostname+":9000", 'echo-protocol')
          SCClientWS.ws.onopen = onopen
          // Try to reconnect if error or close
          SCClientWS.ws.onclose = function(){SCClientWS.connected = false; connectToNodeSCClientWS()}
          SCClientWS.ws.onerror = function(){SCClientWS.connected = false; console.log("ws error.. refresh?")};
          SCClientWS.ws.addEventListener("message", SCClientWS.onMessage);
        } catch (e){
          console.log("error connecting to sc client")
        }
        setTimeout(connectToNodeSCClientWS,5000)
      }
  };
  connectToNodeSCClientWS();
}

function onopen (){
  SCClientWS.connected = true;
  console.log("SC ws connection established")
  for (var i in Connectable.connectables){
    SCClientWS.send({type:"newConnectable", value:Connectable.connectables[i].getGraphData()});
  }

  var dag = Connection.getConnectionsDAG(); // [{from:..., to:...}] where from and to are from 'getGraphData'
  var msg = {
    type: "updateConnections",
    value: dag
  };
  SCClientWS.send(msg);
}

SCClientWS.onMessage = function(message){
  var msg;
  try{
    msg = JSON.parse(message.data);
  } catch (e){
    console.log("could not parse ws message from sc client"+e)
    console.log(message)
    return
  }

  if(msg.type =="levels"){
    handleLevels(msg.value);
  } else if (msg.type =="corpus"){
    var corpusSelect = document.getElementById('corpus-select')
    var option = document.createElement('option')
    option.innerHTML = msg.value.slice(-15)==msg.value?msg.value:".."+msg.value.slice(-13);
    option.value = msg.value;
    corpusSelect.appendChild(option);


  } else {
    console.log("warning: unrecognized message from sc node program")
  }
}

SCClientWS.send = function (m) {
  if(SCClientWS.connected){
    try {
      var msg = typeof(m)=="string"?m:JSON.stringify(m);
      SCClientWS.ws.send(msg);
    } catch (e){
      var m = typeof(msg)=='string'?msg:msg.type
      console.log("ERROR: could not send sc ws message: "+m);
      console.log(e);
    }
  } else{
    console.log("warning: sc ws not connected")
  }
}


function handleLevels(levels){
  for (var i =0; i<8; i++){
    var speakerDiv = document.getElementById("s"+i);
    var meter = speakerDiv.childNodes[1].childNodes[0];
    var percent = (Math.max(Math.min(levels[i]==null?-80:levels[i],0),-80)+80)*100/80

    if ([0,1,4,5].includes(i)){
      meter.style.width = percent+"%";
    } else{
      meter.style.height = percent+"%";
    }

    if(percent>=100){
      meter.style.backgroundColor = "rgb(130,0,0)"
      console.log(levels)
    } else if (percent >= 95){
      meter.style.backgroundColor = "rgb(130,130,0)"
    } else {
      meter.style.backgroundColor = "rgb(0,130,0)"
    }
  }
}

export default SCClientWS
