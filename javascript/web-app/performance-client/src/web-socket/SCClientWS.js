window.WebSocket = window.WebSocket || window.MozWebSocket;

var SCClientWS = {}
SCClientWS.ws = {readyState:0};

SCClientWS.initSCClientWS = function (){

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
    msg = JSON.parse(message.data);
  } catch (e){
    console.log("could not parse ws message from sc client"+e)
    console.log(message)
    return
  }

  console.log("SCWS: "+msg.type);
  if(msg.type =="levels"){
    handlLevels(msg.value);
  }
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


function handlLevels(levels){
  for (var i =0; i<8; i++){
    var speakerDiv = document.getElementById("s"+i);
    var meter = speakerDiv.childNodes[1].childNodes[0];
    var percent = Math.max(2,Math.min(levels[i]+80,80))*100/80
    if ([0,1,4,5].includes(i)){
      meter.style.width = percent+"%";
    } else{
      meter.style.height = percent+"%";
    }



    if(percent>=100){
      meter.style.backgroundColor = "rgb(130,0,0)"
    } else if (percent >= 95){
      meter.style.backgroundColor = "rgb(130,130,0)"
    } else {
      meter.style.backgroundColor = "rgb(0,130,0)"
    }
  }
}

export default SCClientWS
