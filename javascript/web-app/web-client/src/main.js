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














WebSocket.init(audienceSource);
// Audio.init();
UI.init();
