// Dependencies
import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import OSM from 'ol/source/osm'
import Draw from 'ol/interaction/draw'
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import Proj from 'ol/proj' // fromLonLat
import Select from 'ol/interaction/select'
import DragBox from 'ol/interaction/dragbox'
import Condition from 'ol/events/condition'
import Interaction from 'ol/interaction'

import Meyda from "meyda"

// Local Imports
import Remote from './connectables/Remote.js'
import Speaker from './connectables/Speaker.js'
import Computation from './connectables/Computation.js'
import Connection from './connectables/Connection.js'
import SCClientWS from './web-socket/SCClientWS.js'
// NOTE - if you're getting an error like 'cosMap' undefined
//       you need to change the src of one of meyda's depends:
//       node_modules/dct/src/dct.js line:10, add 'var' before cosMap;



SCClientWS.initSCClientWS();

var audienceSource = new VectorSource({wrapX: false});
var audienceLayer = new VectorLayer ({source:audienceSource});
var map = new Map({
  target: 'map',
  layers: [
    new TileLayer({source: new OSM()}),
    audienceLayer
  ],
  view: new View({
    center: Proj.fromLonLat([0,0]),
    zoom: 2,
    minResolution: 40075016.68557849 / 256 / Math.pow(2,7),
    maxResolution: 40075016.68557849 / 256 / 4
  }),
  interactions: Interaction.defaults({shiftDragZoom:false})
});



var speakerCoordinateRatios = [[1/3,1],[2/3,1],[1,2/3],[1,1/3],[2/3,0],[1/3,0],[0,1/3],[0,2/3]];

for (var i in speakerCoordinateRatios){
  new Speaker([0,0],audienceSource)
}




positionSpeakers()

Connection.connections.on(['add','remove'],function(){
  var dag = Connection.getConnectionsDAG(); // [[from, to]] where from and to are from 'getGraphData'
  var msg = {
    type: "updateConnections",
    value: dag
  };
  try {
    SCClientWS.ws.send(JSON.stringify(msg));
  } catch (e){
    console.log("WARNING: could not send updateConnections message to SCClient: "+e)
  }
})



// a normal select interaction to handle click
var select = new Select({
  wrapX:false,
  condition:function (e){
    return (Condition.shiftKeyOnly(e) && Condition.singleClick(e))
  }
});
// var selectedFeatures = select.getFeatures();

var dragBox = new DragBox({condition: Condition.platformModifierKeyOnly});
dragBox.on('boxend', function() {
  // features that intersect the box are added to the collection
  // selected features
  var extent = dragBox.getGeometry().getExtent();
  audienceSource.forEachFeatureIntersectingExtent(extent, function(feature) {
    // selectedFeatures.push(feature);
    select.getFeatures().push(feature);
  });
});

// clear selection when drawing a new box and when clicking on the map
dragBox.on('boxstart', function() {
  select.getFeatures().clear();
  if (drawStart){
    connectionDraw.finishDrawing();
  };
  // selectedFeatures.clear();
});


var cmdBox = document.getElementById('cmdBox');

select.getFeatures().on(['add', 'remove'], function() {
  var innerHTML = select.getFeatures().getArray().filter(function(x){
    return ["remote","computation"].includes(x.type)}).map(function(feature){
      var r;
      r = feature.getInfoHTML();
      return r?r:document.createElement("div");
    }
  );

  if (innerHTML.length>0){
    cmdBox.hidden = false;
    cmdBox.innerHTML = "";
    for(var i in innerHTML){
      cmdBox.appendChild(innerHTML[i])
    }
  } else {
    console.log("no remote or computation elements")
    cmdBox.hidden = true;
    cmdBox.innerHTML = ""
  }
});


map.addInteraction(dragBox);
map.addInteraction(select);



// Connection Interaction
function onConnectable(coordinate){
  var features = audienceSource.getFeatures().map(function(f){return f.type})
  console.log("features: "+features)
  var a = audienceSource.getFeaturesAtCoordinate(coordinate)
  var isOnConnectable = a.length>0;
  console.log("clicked on connectable: "+isOnConnectable);
  return isOnConnectable;
}

var connectionDraw = new Draw({
  type:"LineString",
  condition: function(browserEvent){
    console.log("___________________")
    console.log(browserEvent.coordinate);
    var shift = Condition.shiftKeyOnly(browserEvent);
    console.log("shift: "+shift);
    var ctrl = Condition.platformModifierKeyOnly(browserEvent);
    return !ctrl && !shift && onConnectable(browserEvent.coordinate)},
  wrapX: false,
  freehandCondition: function(x){return false},
  freehand:false,
  maxPoints:2
});

var from;
var drawStart = false;
connectionDraw.on('drawstart', function(ev){
  drawStart = true;
  console.log('drawstart...')
  var coord = ev.target.sketchCoords_[1];
  var atCoord = audienceSource.getFeaturesAtCoordinate(coord);
  console.log(atCoord)
  if(atCoord){
    from = atCoord[0];
  } else {
    console.log("this condition should not have been activated, find this print message plz...")
    // if nothing was found where the click happened, drawstart shouldn't have occurred
    // (see connectionDraw's 'condition' function)
    from = undefined;
    connectionDraw.finishDrawing();
  }

  // TODO - multiple selection and connection?
  // currentSelected = selectedFeatures.getArray();
  // if(currentSelected.length<1){
  //   connectionDraw.finishDrawing();
  // }
})

connectionDraw.on('drawend',function(ev){
  drawStart = false;
  var lineFeature = ev.feature;
  var finalCoord = ev.target.sketchCoords_[1];
  var to = audienceSource.getFeaturesAtCoordinate(finalCoord);
  if(to){
    to = to[0];
    console.log("found to: "+to);
  } else {
    console.log('No feature at destination');
    return;
  }
  console.log("from in draw end: "+from)
  if(from){
    var success = from.connect(to);

    if(!success){
      console.log("...")
    }

  } else {
    console.log("this condition shouldn't have been reached ...")
  }
  from = undefined;
})
map.addInteraction(connectionDraw);

// TODO - find smoother way of doing this
map.getView().on('change:resolution', resizeObjects);
map.getView().on('change',positionSpeakers);


function resizeObjects (){
  resizeRemotes();
  resizeComputations();
}

function resizeComputations(){
  var resolution = map.getView().getResolution();
  var radius = 15*resolution;
  for (var i in Computation.computations){
    Computation.computations[i].setRadius(radius);
  }
}

function resizeRemotes(){
  var resolution = map.getView().getResolution();
  var radius = 15*resolution;
  for (var i in Remote.remotes){
    //TODO some error here, seems like remotes gets out of sync somehow...
    Remote.remotes[i].getGeometry().setRadius(radius);
  }
}

function positionSpeakers(){
  var extent = map.getView().calculateExtent();
  var resolution = map.getView().getResolution();
  var radius = 40*resolution;
  console.log('reposition')
  for (var i in Speaker.eightChannelSpeakerCoordinateRatios){
    var x = speakerCoordinateRatios[i][0];
    var y = speakerCoordinateRatios[i][1];
    var coord = [(extent[2]-extent[0])*x+extent[0], (extent[3]-extent[1])*y+extent[1]];
    // TODO - put these two into a speaker or Connectable method.
    Speaker.speakers[i].coordinate = coord;
    Speaker.speakers[i].getGeometry().setCenterAndRadius(coord, radius);

    for (var j in Speaker.speakers[i].connections){
      Speaker.speakers[i].connections[j].redraw();
    }

  }
}


map.getViewport().addEventListener('contextmenu', function (evt) {
  evt.preventDefault();
  var coordinate = map.getEventCoordinate(evt);
  var resolution = map.getView().getResolution();
  console.log(coordinate)
  var radius = 15*resolution;
  var c = new Computation(coordinate, audienceSource, radius)
  SCClientWS.send({type:"newConnectable",value:c.getGraphData()});
  c.onComputationChange = function (){
    SCClientWS.send({type:"updateConnectable", value:this.getGraphData()});
  }
})

// global key mappings (hopefully these don't overwrite anything...)
var closureKeyUp = document.onkeyup;
document.onkeyup = function(e) {
  // JIC something in openlayers sets something to document onkeyup
  if(closureKeyUp){
    closureKeyUp(e)
  }
  // esc key
  if (e.key.toLowerCase() == "escape") { // escape key maps to keycode `27`
    select.getFeatures().clear();
    if(drawStart){
      connectionDraw.finishDrawing()
    };
  } else if (e.key.toLowerCase() =="delete"){
    var deletes = select.getFeatures().getArray();
    // var deletes = selectedFeatures.getArray();
    var deletedConnections = []
    for (var i in deletes){
      if (deletes[i].type =="computation"){
        deletedConnections = deletedConnections.concat(deletes[i].connections);
        var msg = {
          type: "removeConnectable",
          value: {uid: deletes[i].uid,type: deletes[i].type}
        }
        //Tell SC that computation is deleted
        SCClientWS.send(msg);
        deletes[i].delete();
        // select.getFeatures().remove(deletes[i]);
      } else if (deletes[i].type =="connection" && !deletedConnections.includes(deletes[i])){
        deletes[i].delete();
      }
    }
    select.getFeatures().clear();
  }
}



// Tool modifier widget div on bottom left
//   - selection tool - tapping objects selects them, dragging in empty space makes a selection box
//   - hand tool (moving around) - default
//   - zoom tool - meh...
//   - draw tool - dragging from object


// right click to make a 'mapping' object (a triangle)
// shift click and drag to connect 'selectedFeatures' to speaker


// either listening to yourself, or someone else...
// you open the site:
//  - nothing happens until 'begin'/'start listening' is checked
//  - click begin
//    - 'newRemote' message is sent to server
//    - server sends 'newRemote' message to all connected clients
//    - all remotes draw that remote on their map and keep reference of it
//  - a remote clicks on a remote on their map
//    - 'subscribe' message is sent to server with uid of remote to be subscribed to
//    - server adds the remote to the subscribee's list of subscriptions
//    - a timeout function on the server iterates through each remote/client and sends
//      the 'params' of the subscribed to remotes
//  - the clients receive params from their subscribed to remotes, which are re-sonified with web-audio

//  - on another port the same thing is happening except that client is trying to establish a ws connection to a locally run node program that
//    forwards messages to synthesize sounds in supercollider;




// // SC Client Websocket:
// window.WebSocket = window.WebSocket || window.MozWebSocket;
// var nodeSCClientWS= {readyState:0};
//
// try{
//   console.log("connecting via ws to: ws://localhost:8000");
// 	nodeServerWS = new WebSocket("ws://localhost:8000", 'echo-protocol');
// } catch (e){
// 	console.log("no WebSocket connection "+e)
// }
//
// var connectToNodeSCClient = function(){
//     if(nodeSCClientWS.readyState!= 1){
//       console.log("connecting to sc client ws")
//       try{
//         nodeSCClientWS = new WebSocket("ws://"+location.hostname+":9000", 'echo-protocol')
//       } catch (e){
//         console.log("error connecting to sc client")
//       }
//       setTimeout(connectToNodeSCClient,5000)
//     }
// };
// connectToNodeSCClient();
//
// nodeSCClientWS.onopen = function (){
//   console.log("SC connection opened");
// }
// nodeSCClientWS.onclose = function(){
//   connectToNodeSCClient();
// }
//
// nodeSCClientWS.addEventListener("message", function(message){
//   var msg;
//   try{
//     msg = JSON.parse(msg);
//   } catch (e){
//     console.log("could not parse ws message from sc client")
//     return
//   }
//   console.log(msg);
// })

var nodeServerWS;

try{
  console.log("connecting via ws to: "+location.hostname+":"+location.port);
  nodeServerWS = new WebSocket("ws://"+location.hostname+":"+location.port, 'echo-protocol');
} catch (e){
  console.log("no WebSocket connection "+e)
}

if (nodeServerWS){

  // Tell the server we're here and we've joined
  // TODO - add location scrambling and UI to ask for permission/
  //        suggest alternative ways to participate


  // navigator.geolocation.getCurrentPosition(function(pos){
  //   // longitude first aligning with openlayers' conventions
  //   var coordinates = [pos.coords.longitude, pos.coords.latitude];
  //   var msg = {type:"consented", coordinates:coordinates};
  //   nodeServerWS.send(JSON.stringify(msg))
  // });



  nodeServerWS.addEventListener('message', function(message){
    var msg;

    try {
      // For some reason a single parse is leaving it as a string...
      var msg = JSON.parse(message.data);
      if (typeof(msg)== "string"){
        msg = JSON.parse(msg);
      }
    } catch (e){
      console.log("WARNING: could not parse ws JSON message")
      console.log(msg);
    }
    console.log("msg type: "+msg.type)
    if (msg.type == "params"){
      updateRemoteParams(msg.value)
    } else if (msg.type == "newRemote"){
      console.log('new remote: '+msg.uid)
      var remote = new Remote(msg.uid, Proj.fromLonLat(msg.coordinates), audienceSource);

      var msg = {type:"subscribe", uid:msg.uid};
      try{
        nodeServerWS.send(JSON.stringify(msg))
      } catch (e){
        console.log("!!!!!ERROR couldn't sned subscribe request")
        console.log(e);
      }
      // Tell SC a new remote
      SCClientWS.send({type:"newConnectable",value:remote.getGraphData()})

      // set onChange to tell SC when this remote changes
      remote.onRemoteChange = function (){
        // TODO @@@@ CONFIRM: I think 'this' refers to the remote here? if not need to change this
        SCClientWS.send({type:"updateConnectable",value:this.getGraphData()})
      }
    } else if (msg.type == "removeRemote"){
      try {
        console.log('remove remote')
        Remote.remotes[msg.uid].delete();
        // audienceSource.removeFeature(Remote.remotes[msg.uid]);
        SCClientWS.send({type:"removeConnectable",value:{type:"remote",uid:msg.uid}})
        // delete Remote.remotes[msg.uid]
      } catch (e){
        console.log("WARNING: Error deleting remote <"+msg.uid+"> :" +e)
      }
    } else {
        console.log("WARNING: WS message with unknown type <"+msg.type+"> received.")
    }
  })
}




// var things = [[51.5074, -0.1278], [19.4326, -99.1332], [35.6895, 139.6917],[43,-79]]
//
// for (var i in things){
//   var coordinate = things[i];
//   console.log(coordinate)
//   var featureOpts = {
//     geometry: new Circle(coordinate, 587036.3772301537),
//     labelPoint: new Point(coordinate),
//     name: i
//   }
//   var feature = new Feature(featureOpts);
//   audienceSource.addFeature(feature)
// }



// setTimeout(function(){
// // for making figures:
// var aa =new Remote(11, Proj.fromLonLat([43,-79]), audienceSource);
// var bb = new Remote(22, Proj.fromLonLat([50,-109]), audienceSource);
// var cc = new Remote(33, Proj.fromLonLat([60,43]), audienceSource);
// var dd = new Remote(44, Proj.fromLonLat([67,94]), audienceSource);
//
// aa.onRemoteChange = function (){}
// bb.onRemoteChange = function (){}
// cc.onRemoteChange = function (){}
// dd.onRemoteChange = function (){}
// },4000)



function updateRemoteParams(msg){
  // @@@***%%% DANGER CHANGE THIS BACKs
  msg.loudness= msg.rms;
  Remote.remotes[msg.uid].setParams(msg);
}


//
//
//
//
// // Called when receiving ws 'params' message
// function updateRemoteParams(msg){
//   for (i in msg.remotes){
//     // msg.remotes[i]: {uid:3, params: {clarity:_, turbidity
//     // TODO - msg.remotes[i] should probably be a proper 'Remote' object
//     if (Remote.remotes[msg.remotes[i].uid] == undefined){
//       console.log("WARNING client remotes out of sync with server remotes");
//       // TODO - probably want to instantiate some Remote on the client here once msg contains remotes with coordinates and such
//     } else {
//       if (Remote.remotes[msg.remotes[i].uid].subscribed){
//         Remote.remotes[msg.remotes[i].uid].params = msg.params
//       } else {
//         console.log('WARNING: received params from an unsubscribed remote, serverside uid: <'+msg.remotes[i].uid+">");
//       }
//     }
//   }
// }
