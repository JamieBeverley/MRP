var osc = require ('osc')
var WebSocket = require('ws')

var connectables = {
	'edges':[],
	'items':[]
}

var performanceClient = {};

var scIsSynchronized = false;
var isGraphDump = false; // TODO this is hacky af, do something better

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
	} else if (oscMsg.address == "/requestGraph"){
		scIsSynchronized = false; // if it's requesting a graph dump, chances are it isn't synchronized
		sendGraphDump();
	} else if (oscMsg.address == "/confirmGraphDump"){
		scIsSynchronized = true;
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
	connectables.items = [];
	connectables.edges = [];
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
	if (msg.type!="updateConnectable"){
		console.log("msg type: "+msg.type);
	}
	if (msg.type == "updateConnections"){
    console.log("connections update: ");
    updateConnections(msg.value);
	} else if (msg.type == "updateConnectable") {
    var uid = msg.value.uid;
    var type = msg.value.type;
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
	for(var i in connectables.items){
		var j = connectables.items[i];
		if(equals(connectable, j)){
			connectables.items.splice(i,1);
		}
	}
}

function newConnectable(connectable){
	connectables.items.push(connectable);

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
  scSafeSend(msg,3)
}

function updateConnectable(connectable){
	if(connectable.type!="remote"){
		console.log("msg type: updateConnectable - " +connectable.type);
	}
	for (var i in connectables.items){
		var c = connectables.items[i]
		if(equals(connectable,c)){
			connectables.items[i] = connectable
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
  for (var i in connectables.edges){
    var exists = false;
    for (var j in dag){
			if(connectionEquals(connectables.edges[i], dag[j])){
				exists = true;
			}
    }
    // connection in graph not in new dag - flag it for deletion
    if (!exists){
      deletedConnections.push(connectables.edges[i]);
      deleteIndexes.push(i)
    }
  }

  for (var i in deleteIndexes){
    connectables.edges.splice(deleteIndexes[i],1);
  }

  // Add new connections
  for (var i in dag){
    var exists = false;
    // TODO - maybe connections should have uids so we don't have to iterate through graph
    //        to find if connection exists
    for (var j in connectables.edges){
			if(connectionEquals(connectables.edges[j], dag[i])){
        exists = true;
        break;
      }
    }
    if (!exists){
      newConnections.push(dag[i]);
      connectables.edges.push(dag[i])
    }// new edge
  }

  // send new connections
  for (var i in newConnections){
		var from = newConnections[i].from;
		var to = newConnections[i].to;
    if (from != undefined && to != undefined){
      var msg = {
        address:"/newConnection",
        args: [from.type,from.uid, to.type, to.uid]
      }
      scSafeSend(msg,3);
    } else{
			console.log("warning: to or from was undefined, did not send connection update...")
		}
  }

  // send delete connections
  for (var i in deletedConnections){
		var from = deletedConnections[i].from;
		var to = deletedConnections[i].to;
    var msg = {
      address: "/removeConnection",
      args: [from.type, from.uid, to.type, to.uid]
    }
		console.log("sending removeConnection")
    scSafeSend(msg,3);
  }
	printDAG(connectables.edges);
}


function sendGraphDump(){
	isGraphDump = true;
	for (var i in connectables.items){
		newConnectable(connectables.items[i]);
	}
	// Clear 'graph' and re-generate it, sending SC all the appropriate connections
	var graphTmp = connectables.edges;
	connectables.edges = [];
	updateConnections(graphTmp);
	scSafeSend({address:"/confirmGraphDump",args:[]},3);
	isGraphDump = false;
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


function scSafeSend(msg, n=1){
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



function equals(c1,c2){
	return (c1.uid==c2.uid) && (c1.type == c2.type)
}

function connectionEquals(c1, c2){
	return equals(c1.from,c2.from) && equals(c1.to,c2.to)
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


function printDAG(dag){
  console.log("_________________")
  for(var i in dag){
    var from = dag[i].from;
    var to = dag[i].to;
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


process.on('SIGINT', function() {
    console.log("Closing, SC will be instructed to purge its connections");
		scSafeSend({address:"/purge"},3);
		setTimeout(()=>{process.exit()},2000);
});
