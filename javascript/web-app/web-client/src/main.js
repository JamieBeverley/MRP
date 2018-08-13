// Dependencies
import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import OSM from 'ol/source/osm'
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import Proj from 'ol/proj' // fromLonLat
import Select from 'ol/interaction/select'
import Condition from "ol/events/condition"

import UI from "./UI.js"
import Audio from "./Audio.js"
import WebSocket from "./WebSocket.js"
import Remote from "./Remote.js"

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
  })
});


map.getView().on('change:resolution', resizeRemotes);

function resizeRemotes(){
  var resolution = map.getView().getResolution();
  var radius = 15*resolution;
  for (var i in Remote.remotes){
    //TODO some error here, seems like remotes gets out of sync somehow...
		// ^ think this got sorted somehow...
    Remote.remotes[i].getGeometry().setRadius(radius);
  }
}

// a normal select interaction to handle touch
var select = new Select({
  wrapX:false,
	condition: Condition.click
});

select.on('select', function (e){
	console.log(e);
	console.log(e.selected[0]);
	if(e.selected[0] && e.selected[0].uid){
		UI.popupListenMenu(e.selected[0].uid);
	} else {
		console.log("ERROR: couldn't find selected remote"+e);
	}
})

map.addInteraction(select);

var keydown = []

document.onkeydown = function (e){
  keydown.push(e.key);
  console.log(keydown);
  if(keydown.includes(" ")){
    if(keydown.includes("1")){
      // London
      simulateLocation([0.1278,51.5074])

    } else if (keydown.includes("2")){
      // Mexico city
      simulateLocation([19.4, 99])
    } else if (keydown.includes("3")){
      // Tokyo
      simulateLocation([139.6917,35.6895])
    }else if (keydown.includes("4")){
      // berlin
      simulateLocation([13.4050, 52.5200])
    }else if (keydown.includes("5")){
      //
      simulateLocation([5, 80.5200])
    } else if (keydown.includes("6")){
      //
      simulateLocation([Math.random()*-140,Math.random()*140])
    }
  }
}

document.onkeyup = function(e) {
  keydown = keydown.filter(function(x){return x!=e.key});
  // esc key
  if (e.key.toLowerCase() == "escape") { //

  }
}


function simulateLocation(coordinates){
  UI.sharing = true;
  var msg = {type:"consented",coordinates:coordinates};
  var sendRate = 100
  UI.begin()
  WebSocket.send(msg);
  // TODO Maybe this is redundant? should you be able to hit 'share' before having started the machine listening?
  // Audio.startMachineListening();
  setInterval(function(){
    var params = {}
    for (var i in Audio.params){
      params[i] = Audio.params[i].vals[0]
    }
    WebSocket.sendParams(params);
  }, sendRate)
  console.log("sharing")
}


WebSocket.init(audienceSource);
Audio.init();
UI.init();
