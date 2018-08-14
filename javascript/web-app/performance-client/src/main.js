// Dependencies
import Map from 'ol/map';
import View from 'ol/view';
import TileLayer from 'ol/layer/tile';
import OSM from 'ol/source/osm'
import Draw from 'ol/interaction/draw'
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import ImageLayer from 'ol/layer/image'
import Proj from 'ol/proj' // fromLonLat
import Projection from 'ol/proj/projection'
import Select from 'ol/interaction/select'
import DragBox from 'ol/interaction/dragbox'
import Condition from 'ol/events/condition'
import Static from 'ol/source/imagestatic.js';
import Interaction from 'ol/interaction'

import Meyda from "meyda"


import ImageArcGISRest from 'ol/source/ImageArcGISRest';
import TileWMS from 'ol/source/TileWMS';
import TileArcGISRest from 'ol/source/tilearcgisrest'

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


var osm =  new TileLayer({source: new OSM()})

var geo =  new TileLayer({
  source: new TileWMS({
    url: 'https://ahocevar.com/geoserver/wms',
    params: {
      'LAYERS': 'ne:NE1_HR_LC_SR_W_DR',
      'TILED': true
    }
  })
})

var highways = new ImageLayer({
   source: new ImageArcGISRest({
     ratio: 1,
     params: {},
     url: 'https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StateCityHighway_USA/MapServer'
   })
})


var none = new ImageLayer({
  source: new Static({
    attributions: '© <a href="http://xkcd.com/license.html">xkcd</a>',
    url: location.hostname+":"+location.port+'/performance-client/build/hyper-cloud.jpg',
    projection: new Projection({
      code: 'xkcd-image',
      units: 'pixels',
      extent: [0, 0, 2268, 4032]
    }),
    imageExtent: [0, 0, 2268, 4032]
  })
})

var population  = new TileLayer({
  source: new TileArcGISRest({
    url: 'https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Population_World/MapServer'
  })
})

var layers = {
  none: none,
  osm: osm,
  population: population,
  highways: highways,
  audience: audienceLayer
};

var map = new Map({
  target: 'map',
  layers: [none, audienceLayer],
  view: new View({
    center: Proj.fromLonLat([0,0]),
    zoom: 2,
    minResolution: 40075016.68557849 / 256 / Math.pow(2,7),
    maxResolution: 40075016.68557849 / 256 / 4
  })
});





var speakerCoordinateRatios = [[1/3,1],[2/3,1],[1,2/3],[1,1/3],[2/3,0],[1/3,0],[0,1/3],[0,2/3]];

for (var i in speakerCoordinateRatios){
  new Speaker([0,0],audienceSource)
}
positionSpeakers()

Connection.connections.on(['add','remove'],function(){
  var dag = Connection.getConnectionsDAG(); // [{from:..., to:...}] where from and to are from 'getGraphData'
  var msg = {
    type: "updateConnections",
    value: dag
  };
  SCClientWS.send(msg);

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


//   MASTER controls
var master = document.getElementById('master');

var layerSelect = document.getElementById('layer-select')

for (var i in layers){
  var option = document.createElement("option");
  option.value = i;
  option.innerHTML = i;
  if(i == 'none'){option.selected = true}
  layerSelect.appendChild(option);
}

layerSelect.onchange = function(){

  var l = layers[layerSelect.value]
  if (!l){console.log("Error: no layer named: "+layerSelect.value); return} else {
    var b = map.getLayers().clear();
    map.addLayer(layers["audience"])
    map.addLayer(l)
    l.setZIndex(0);
    audienceLayer.setZIndex(1)
  }
}

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
    cmdBox.hidden = true;
    cmdBox.innerHTML = ""
  }
});


map.addInteraction(dragBox);
map.addInteraction(select);



// Connection Interaction
function onConnectable(coordinate){
  var features = audienceSource.getFeatures().map(function(f){return f.type})
  var a = audienceSource.getFeaturesAtCoordinate(coordinate)
  var isOnConnectable = a.length>0;
  return isOnConnectable;
}

var connectionDraw = new Draw({
  type:"LineString",
  condition: function(browserEvent){
    var shift = Condition.shiftKeyOnly(browserEvent);
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
  var coord = ev.target.sketchCoords_[1];
  var atCoord = audienceSource.getFeaturesAtCoordinate(coord);
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
  } else {
    return;
  }
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
  var radius = 15*resolution;
  var c = new Computation(coordinate, audienceSource, radius)
  SCClientWS.send({type:"newConnectable",value:c.getGraphData()});
  // c.onComputationChange = function (){
  c.onChange = function (){
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


var nodeServerWS;

try{
  console.log("connecting via ws to: "+location.hostname+":"+location.port);
  nodeServerWS = new WebSocket("ws://"+location.hostname+":"+location.port, 'echo-protocol');
} catch (e){
  console.log("no WebSocket connection "+e)
}

if (nodeServerWS){

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
      // remote.onRemoteChange = function (){
      remote.onChange = function (){

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
  // TODO - @@@***%%% DANGER CHANGE THIS BACKs
  msg.loudness = msg.rms;
  Remote.remotes[msg.uid].setParams(msg);
}
