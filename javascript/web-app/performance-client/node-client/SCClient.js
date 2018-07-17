var osc = require ('osc')
var WebSocket = require('ws')
var graph = [] // A list of edges

var ws = new WebSocket.Server({port:9000});

var scOSC = new osc.UDPPort({
	localAddress: "0.0.0.0",
	localPort: 10000,
	remoteAddress: "127.0.0.1",
	remotePort: 10001
})
scOSC.open();




ws.on('connection', function(r){
  console.log("Connected")
  r.addEventListener("message",(x)=>onMessage(x,r));

  r.addEventListener("error",(x)=>onError(x,r));
  r.addEventListener("close",(x)=>onClose(x,r));
})

ws.on('error', function (e){console.log(e)})

function onError(err,r){
  console.log("##### WS Error for client "+r.uid);
  console.log(err)
}

function onClose(x,r){
  console.log('Client disconnected')
}


function onMessage(message, r){
  var data = message.data; // unclear as to when this is necessary...
  var msg;



  try {
    msg = JSON.parse(data);
  } catch (e){
    console.log("WARNING - error parsing JSON message from client: ");
    console.log(e);
		console.log("data: "+data)
    return;
  }

	console.log("msg type: "+msg.type);
	if (msg.type == "updateConnections"){
    console.log("connections update: ");
    updateConnections(msg.value);
    printDAG(msg.value);
	} else if (msg.type == "updateConnectable") {
    var uid = msg.value.uid;
    var type = msg.value.type;
    console.log("Update for: " +type+": "+uid);
    updateConnectable(msg.value);

  } else if (msg.type == "newConnectable"){
		newConnectable(msg.value);
	} else if (msg.type == "removeConnectable"){
		deleteConnectable(msg.value);
	}else {
		console.log("WARNING unrecognized msg type recevied: "+msg.type)
	}
}

function deleteConnectable(connectable){
	var msg = {
		address:"/removeConnectable",
		args:[connectable.type, connectable.uid]
	};
	scTrySendNTimes(msg,3);
}

function newConnectable(connectable){
	var r = [connectable.type, connectable.uid]
  for (var i in connectable.value){
    r.push(i);
    if (typeof(connectable.value[i])== "object"){
      for(var j in connectable.value[i]){
        r.push(j)
        r.push(connectable.value[i][j])
      }
    } else {
      r.push(connectable.value[i])
    }
  }
  var msg = {address: "/newConnectable", args: r}
  scTrySendNTimes(msg,3)
}

function updateConnectable(connectable){
  // This is kind of ugly but graph probably won't get big enough for this to be a problem
  for (var i in graph){
    for (var j in graph[i]){
      if(graph[i][j].type == connectable.type && graph[i][j].uid == connectable.uid){
        graph[i][j] = connectable;
      }
    }
  }
  var r = [connectable.type, connectable.uid]
  for (var i in connectable.value){
    r.push(i);
    if (typeof(connectable.value[i])== "object"){
      for(var j in connectable.value[i]){
        r.push(j)
        r.push(connectable.value[i][j])
      }
    } else {
      r.push(connectable.value[i])
    }
  }
  var msg = {address: "/updateConnectable", args: r}
  scTrySendNTimes(msg,3)
}

function updateConnections (dag){
  var newConnections = [];
  var deletedConnections = [];
  var deleteIndexes = [];

  // Remove deleted edges
  for (var i in graph){
    var exists = false;
    for (var j in dag){
      // TODO - not sure why I made this switch to arrays instead of JSON objects here
      //       .from and .to is nicer than [0] and [1]
      if(graph[i][0].uid == dag[j][0].uid && graph[i][1].uid == dag[j][1].uid){
        exists = true;
      }
    }
    // connection in graph not in new dag - flag it for deletion
    if (!exists){
      deletedConnections.push(graph[i]);
      deleteIndexes.push(i)
    }
  }

  for (var i in deleteIndexes){
    graph.splice(deleteIndexes[i],1);
  }

  // Add new connections
  for (var i in dag){
    var exists = false;
    // TODO - maybe connections should have uids so we don't have to iterate through graph
    //        to find if connection exists
    for (var j in graph){
      if (graph[j][0].uid == dag[i][0].uid && graph[j][1].uid == dag[i][1].uid){
        exists = true;
        break;
      }
    }
    if (!exists){
      newConnections.push(dag[i]);
      graph.push(dag[i])
    }
  }

  // send new connections
  for (var i in newConnections){
		var from = [newConnections[i][0].type,newConnections[i][0].uid]
		var to = [newConnections[i][1].type,newConnections[i][1].uid]

    if (from != undefined && to != undefined){
      var msg = {
        address:"/newConnection",
        args: from.concat(to)
      }
      // a bit of redundancy for safety (would suck if dag's fall out of sync)
      scTrySendNTimes(msg,3);
    }
  }

  // send delete connections
  for (var i in deletedConnections){
    var from = [deletedConnections[i][0].type,deletedConnections[i][0].uid]
    var to = [deletedConnections[i][1].type, deletedConnections[i][1].uid]
    var msg = {
      address: "/removeConnection",
      args: from.concat(to)
    }
		console.log("sending removeConnection")
    scTrySendNTimes(msg,3);
  }

	console.log("new graph: "+graph);
}


// takes the json object, puts it into an array that can be added to an osc msg to SC
function connectableToOscArg (connectable){
  var r = [connectable.type, connectable.uid];
  if (connectable.type == "remote"){
    // connectable.value is a Params json object
    for (var i in connectable.value){
      r.push(i);
      r.push(connectable.value[i])
    }
  } else if (connectable.type == "computation") {
    r.push(connectable.value.type); //
    for (var i in connectable.value.value){
      r.push(i);
      r.push(connectable.value.value[i])
    }
  } else if (connectable.type == "speaker"){
    // don't need anymore info here...
  } else {
    console.log("WARNING unknown connectable type, unable to generate osc arg: "+ connectable.type);
    return undefined
  }
  return r
}

function scTrySendNTimes(msg,n){
  if (n>0){
    try{
      scOSC.send(msg)
    } catch (e){
      console.log("ERROR: could not send osc to sc - addr:"+msg.address);
      console.log(e)
      scTrySendNTimes(msg,n-1);
    }
  }
}

function printDAG(dag){
  console.log("_________________")
  for(var i in dag){
    var from = dag[i][0];
    var to = dag[i][1];
    console.log("From: "+from.type+":"+from.uid+"  To: "+to.type+":"+to.uid);
  }
  console.log("_________________")

}

function mean(arr){
  var r = 0;
  for (i in arr){
    r += arr[i]
  }
  return r/arr.length
}
