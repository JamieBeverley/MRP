var ws;
try{
	ws = new WebSocket("ws://"+location.hostname+":"+location.port, 'echo-protocol');
} catch (e){
	console.log("no WebSocket connection")
}

ws.addEventListener('message', function(message){
  var msg;
  try {
    msg = JSON.parse(message)
  } catch (e){
    console.log("WARNING: could not parse ws JSON message")
  }

  if (msg.type == "addRemote"){
    addRemote(msg.uid, msg.coordinates);
  } else if ("removeRemote"){
    removeRemote(msg.uid);
  } else {
      console.log("WARNING: WS message with unknown type <"+msg.type+"> received.")
  }
})


function addRemote (uid, coordinates){
  var remote = new Remote(uid, coordinates);
  // TODO - add to some dictionary of connected remotes
}

function removeRemote (uid){
  // TODO - look through that dictionary and remove the uid
}

function addCorpus (corpusID){
  // TODO - add corpus to a dropdown that is selectable
}
