import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import OL from "ol"
import XYZ from 'ol/source/xyz';
import OSM from 'ol/source/osm'
import Draw from 'ol/interaction/draw'
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import Circle from 'ol/geom/circle'
import Feature from 'ol/feature'
import Point from 'ol/geom/point'
import Proj from 'ol/proj' // fromLonLat
import Style from 'ol/style/style' // for resizing
import CircleStyle from 'ol/style/circle'
import Select from 'ol/interaction/select'
import DragBox from 'ol/interaction/dragbox'
import Condition from 'ol/events/condition'

import Remote from './Remote.js'
// if you ever need to recreate meyda.js, remember to add var before the cosMap declaration.
// (clone meyda, build it and look in /dist/web for meyda.js)
import Meyda from "./meyda.js"


var audienceSource = new VectorSource({wrapX: false});
var audienceLayer = new VectorLayer ({source:audienceSource});

var map = new Map({
  target: 'map',
  layers: [
    new TileLayer({source: new OSM()}),
    audienceLayer
  ],
  view: new View({
    center: Proj.fromLonLat([-79,43]),
    zoom: 2,
    minResolution: 40075016.68557849 / 256 / Math.pow(2,7)
  })
});

// a normal select interaction to handle click
var select = new Select();
var selectedFeatures = select.getFeatures();

console.log(Condition.platformModifierKeyOnly);
var dragBox = new DragBox({condition: Condition.platformModifierKeyOnly});

dragBox.on('boxend', function() {
  // features that intersect the box are added to the collection
  // selected features
  var extent = dragBox.getGeometry().getExtent();
  console.log("boxended")
  console.log(extent);
  audienceSource.forEachFeatureIntersectingExtent(extent, function(feature) {
    selectedFeatures.push(feature);
    console.log('intersecting feature found: '+feature);
  });
});

// clear selection when drawing a new box and when clicking on the map
dragBox.on('boxstart', function() {
  selectedFeatures.clear();
});

var cmdBox = document.getElementById('cmdBox');


selectedFeatures.on(['add', 'remove'], function() {
  var remotes = selectedFeatures.getArray().map(function(feature) {
    return Remote.remotes[feature.uid];
  });


  if (remotes.length > 0) {
    var cmdBoxInnerHTML=""
    for(var i in remotes){
      cmdBoxInnerHTML += "<div>"+remotes[i].uid+"</div>"
    }

    if(remotes.length>1){
      cmdBoxInnerHTML+="<select>Combine with:<option>Mean</option><option>Difference</option></select>"
    }
    cmdBoxInnerHTML+="<div>Send to: <input type='number' style='width:30px'></input> </div>"
    cmdBoxInnerHTML+="<button>Confirm</button>"

    cmdBox.innerHTML = cmdBoxInnerHTML;
    cmdBox.style.zIndex = 2;
  } else {
    cmdBox.style.zIndex = 0;
    cmdBox.innerHTML = '';
  }
});


map.addInteraction(select);
map.addInteraction(dragBox);
map.getView().on('change:resolution', function(evt) {
  var zoom = map.getView().getZoom();
  // zoomm is a number from 1-7
  var radius = 2e5/zoom;
  audienceSource.forEachFeature(function(feature){
    var coords = feature.getGeometry().getCenter();
    feature.setGeometry(new Circle(coords, radius));
  });
});






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
    var coordinates = [pos.coords.latitude, pos.coords.longitude];
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
      var remote = new Remote(msg.uid, msg.coordinates)
      audienceSource.addFeature(remote.feature);

    } else if (msg.type == "removeRemote"){
      try {
        console.log('remove remote')
        audienceSource.removeFeature(Remote.remotes[msg.uid].feature);
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
