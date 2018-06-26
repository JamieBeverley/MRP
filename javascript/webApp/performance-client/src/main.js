import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import OL from "ol"
import OSM from 'ol/source/osm'
import Draw from 'ol/interaction/draw'
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import Circle from 'ol/geom/circle'
import LineString from 'ol/geom/linestring'
import Feature from 'ol/feature'
import Proj from 'ol/proj' // fromLonLat
import Style from 'ol/style/style' // for resizing
import Select from 'ol/interaction/select'
import DragBox from 'ol/interaction/dragbox'
import Condition from 'ol/events/condition'
import Extent from 'ol/extent'
import Interaction from 'ol/interaction'
import Snap from 'ol/interaction/snap'

import Modify from 'ol/interaction/modify'
// ol.interaction.defaults(opt_options)
import Remote from './Remote.js'
import Speaker from './Speaker.js'
import Computation from './Computation.js'
// NOTE - if you're getting an error like 'cosMap' undefined
//       you need to change the src of one of meyda's depends:
//       node_modules/dct/src/dct.js line:10, add 'var' before cosMap;
import Meyda from "meyda"


// del
import Point from 'ol/geom/point'
import Icon from 'ol/style/icon'

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
  console.log("features added/removed");
  // console.log(selectedFeatures.getArray())
  console.log("selected feats: ");
  console.log(select.getFeatures().getArray()[0]);

  var innerHTML = select.getFeatures().getArray().filter(function(x){
    console.log(x.type);
    return ["remote","computation"].includes(x.type)}).map(function(feature){
      var r;
      r = feature.getInfoHTML();
      console.log("adding html:"+r)
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

  // if (remotes.length > 0) {
  //   var cmdBoxInnerHTML=""
  //   for(var i in remotes){
  //     cmdBoxInnerHTML += "<div>"+remotes[i].uid+"</div>"
  //   }
  //
  //   if(remotes.length>1){
  //     cmdBoxInnerHTML+="<select>Combine with:<option>Mean</option><option>Difference</option></select>"
  //   }
  //   cmdBoxInnerHTML+="<div>Send to: <input type='number' style='width:30px'></input> </div>"
  //   cmdBoxInnerHTML+="<button>Confirm</button>"
  //
  //   cmdBox.innerHTML = cmdBoxInnerHTML;
  //   cmdBox.hidden = false;
  // } else {
  //   cmdBox.hidden = true;
  // }
});


map.addInteraction(dragBox);
map.addInteraction(select);



// Connection Interaction

// trying to exclude remotes and speakers from being modifiable...
// var computationFeatures = audienceSource.getFeatures().filter(function(feature){feature.isComputation});
// var modify = new Modify({source:audienceSource});
// map.addInteraction(modify);

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
// var connectionDraw = new Draw({type:"LineString", freehand:false,wrapX:true})

// var snap =  new Snap ({source:audienceSource, edge:false})
// snap.on('change',function(x){console.log('new snap change')});
// map.addInteraction(snap);
map.addInteraction(connectionDraw);





map.getView().on('change:resolution', resizeObjects);
// Find smoother way of doing this
map.getView().on('change',positionSpeakers);


function resizeObjects (){
  console.log("hmm...");
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
  new Computation(coordinate, audienceSource, radius)
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




// WS send things....
var ws;
try{
  console.log("connecting via ws to: "+location.hostname+":"+location.port);
	ws = new WebSocket("ws://"+location.hostname+":"+location.port, 'echo-protocol');
} catch (e){
	console.log("no WebSocket connection "+e)
}

if (ws){

  // Tell the server we're here and we've joined
  // TODO - add location scrambling and UI to ask for permission/
  //        suggest alternative ways to participate
  navigator.geolocation.getCurrentPosition(function(pos){
    // longitude first aligning with openlayers' conventions
    var coordinates = [pos.coords.longitude, pos.coords.latitude];
    var msg = {type:"consented", coordinates:coordinates};
    ws.send(JSON.stringify(msg))
  });

  ws.addEventListener('message', function(message){
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

    if (msg.type == "params"){

      updateRemoteParams(msg)

    } else if (msg.type == "newRemote"){
      console.log('new remote: '+msg.uid)
      var remote = new Remote(msg.uid, Proj.fromLonLat(msg.coordinates), audienceSource);
    } else if (msg.type == "removeRemote"){
      try {
        console.log('remove remote')
        audienceSource.removeFeature(Remote.remotes[msg.uid]);
        Remote.remotes[msg.uid] = undefined
      } catch (e){
        console.log("WARNING: Error deleting remote <"+msg.uid+"> :" +e)
      }
    } else {
        console.log("WARNING: WS message with unknown type <"+msg.type+"> received.")
    }
  })
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
