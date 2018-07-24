// Dependencies
import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import OSM from 'ol/source/osm'
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import Proj from 'ol/proj' // fromLonLat
import Select from 'ol/interaction/select'

import Listen from "./Listen.js"
import WebSocket from "./WebSocket.js"
import Remote from "./Remote.js"


WebSocket.init();






// View selector interaction
var mapDiv = document.getElementById('map');
var instructionsDiv = document.getElementById('instructions');
var visualizationDiv = document.getElementById('visualizations')

var viewInstructions = document.getElementById('view-instructions');
var viewMap = document.getElementById('view-map');
var viewVisualization = document.getElementById('view-visualization')
var view = "instructions"

function switchView(v){
	viewMap.className = "view-selector"
	viewInstructions.className = "view-selector"
	viewVisualization.className = "view-selector"

	mapDiv.style.display = "none";
	instructionsDiv.style.display = "none";
	visualizationDiv.style.display = "none";

	if (v=="instructions"){
		view = v;
		viewInstructions.className = "view-selector-selected"
		instructionsDiv.style.display = "inline-block"
	} else if (v == "visualization"){
		view = v
		viewVisualization.className = "view-selector-selected"
		visualizationDiv.style.display = "inline-block"
	} else{
		view = v
		viewMap.className = "view-selector-selected"
		mapDiv.style.display = "inline-block"
	}
}

viewInstructions.addEventListener('click',function(){switchView("instructions")})
viewMap.addEventListener('click', function(){switchView("map")})
viewVisualization.addEventListener('click', function(){switchView('visualization')})


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


// a normal select interaction to handle touch
var select = new Select({
  wrapX:false
});

map.addInteraction(select);
