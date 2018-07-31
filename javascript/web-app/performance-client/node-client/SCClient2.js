var osc = require ('osc')
var WebSocket = require('ws')

var connectables = {
	'graph':[],
	'unconnected':[]
}

var performanceClient = {};

var scIsSynchronized = false;

var ws = new WebSocket.Server({port:9000});

// var ws = new WebSocket("ws://127.0.0.1:9000");

var scOSC = new osc.UDPPort({
	localAddress: "0.0.0.0",
	localPort: 10000,
	remoteAddress: "127.0.0.1",
	remotePort: 10001
})
scOSC.open();




scOSC.on('message',function(oscMsg){
	if (oscMsg.address =="/levels"){
		var vals = {}
		for(var i in oscMsg.args){
			vals[i] = oscMsg.args[i]
		}
		var msg = {
			type:"levels",
			value:vals
		}
		safeSend(msg);
	} else if (oscMsg.address = "/requestGraph"){
		scIsSynchronized = false; // if it's requesting a graph dump, chances are it isn't synchronized
		sendGraphDump();
	}else {
		console.log("********WARNING: OSC received from SC with no recognized address")
	}
})





function safeSend (msg){
	try {
    if(typeof(msg) != "string"){
      msg = JSON.stringify(msg);
    }
		console.log(msg)
    performanceClient.send(msg);
  } catch (e){
    console.log("ERROR: could not send ws message: "+e)
  }
}


ws.on('connection', function(r){
  console.log("Connected")
	performanceClient = r;
  performanceClient.addEventListener("message",(x)=>onMessage(x,r));
  performanceClient.addEventListener("error",(x)=>onError(x,r));
  performanceClient.addEventListener("close",(x)=>onClose(x,r));
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
	scSafeSend(msg,3);

	// Remove from unconnecteds if it's in there...
	// NOTE - don't have to do this for the graph since the
	// 				graph gets updated immediately when the browser sends an 'updateConnections
	for(var i in connectables.unconnected){
		var j = connectables.unconnected[i];
		if(j.uid == connectable.uid && j.type == connectable.type){
			connectables.unconnected.splice(i,1);
		}
	}
}

function newConnectable(connectable){
	var r = [connectable.type, connectable.uid]
	connectables.unconnected.push(connectable);
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
  scSafeSend(msg,3)
}

function updateConnectable(connectable){
	var isInGraph = false;
  // This is kind of ugly but graph probably won't get big enough for this to be a problem
  for (var i in connectables.graph){
    for (var j in connectables.graph[i]){
      if(connectables.graph[i][j].type == connectable.type && connectables.graph[i][j].uid == connectable.uid){
        connectables.graph[i][j] = connectable;
				isInGraph = true;
      }
    }
  }
	if (!isInGraph){
		for (var i in connectables.unconnected){
			if (connectables.unconnected[i].uid==connectable.uid && connectables.unconnected.type == connectable.type){
				connectables.unconnected[i] = connectable;
			} else{
				console.log("WARNING CONNECTABLE NOT FOUND IN GRAPH OR UNCONNECTEDS")
				return;
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
  scSafeSend(msg,3)
}

function updateConnections (dag){
  var newConnections = [];
  var deletedConnections = [];
  var deleteIndexes = [];

  // Remove deleted edges
  for (var i in connectables.graph){
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
		var from = dag[i][0];
		var to = dag[i][1]
    // TODO - maybe connections should have uids so we don't have to iterate through graph
    //        to find if connection exists
    for (var j in connectables.graph){
			if(equals(connectables.graph[j][0], from) && equals(connectables.graph[j][1], to)){
        exists = true;
        break;
      }
    }
    if (!exists){
      newConnections.push(dag[i]);
			for(var j in connectables.unconnected){
				var c = connectables.unconnected[c];
				if(equals(connectables.unconnected[j], dag[i][0])){
					connectables.unconnected.splice(j,1)
				} else if( equals(connectables.unconnected[j], dag[i][1]) ){
					connectables.unconnected.splice(j,1)
				}
			}
      connectables.graph.push(dag[i])
    }// new edge
  }

  // send new connections
  for (var i in newConnections){
		var from = [newConnections[i][0].type,newConnections[i][0].uid]
		var to = [newConnections[i][1].type,newConnections[i][1].uid]

    if (from != undefined && to != undefined){

			// remove connectables involved in newConnection from the list of
			// unconnected connectables.
			for(var j in connectables.unconnected){
				var c = connectables.unconnected[c];
				if(c.uid == from[1] && c.type == from[0]){
					connectables.unconnected.splice(j,1)
				}	else if (c.uid == to[1] && c.type == to[0]){
					connectables.unconnected.splice(j,1)
				}
			}

      var msg = {
        address:"/newConnection",
        args: from.concat(to)
      }
      scSafeSend(msg,3);
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
    scSafeSend(msg,3);
  }

	console.log("new graph: "+connectables.graph);
}


function equals(c1,c2){
	return (c1.uid==c2.uid) && (c1.type == c2.type)
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


function sendGraphDump(){
	var alreadyUpdated = [];
	// Send all new connections
	for (var i in connectables.graph){
		var connection = connectables.graph[i];
		if (!includesConnectable(alreadyUpdated,connection[0])){
			newConnectable(connection[0]);
			alreadyUpdated.push(connection[0])
		}
		if(!includesConnectable(alreadyUpdated, connection[1])){
			newConnectable(connection[1]);
			alreadyUpdated.push(connection[1])
		}
	}

	// Clear 'graph' and re-generate it, sending SC all the appropriate connections
	var graphTmp = connectables.graph;
	connectables.graph = [];
	updateConnections(graphTmp);
}

function includesConnectable(list, connectable){
	var r = false;
	for (var i in list){
		if(list[i].uid == connectable.uid && list[i].type == connectable.type){
			r = true;
		}
	}
	return r;
}


function scSafeSend(msg, n=1, isGraphDump=false){
	if ((isGraphDump || scIsSynchronized) && n>0 ){
    try{
      scOSC.send(msg)
    } catch (e){
      console.log("ERROR: could not send osc to sc - addr:"+msg.address);
      console.log(e)
      scSafeSend(msg,n-1);
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
