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
// import StyleMap from 'ol/style/map'

// style for resizing audience
var audienceStyle = new CircleStyle({
  radius: 2
});

var audienceSource = new VectorSource({wrapX: false});
var audienceLayer = new VectorLayer ({source:audienceSource});

var circle = new Feature({
  geometry: new Circle(Proj.fromLonLat([-79,43]), 1.5e4),
  labelPoint: new Point(Proj.fromLonLat([-79,43])),
  name: 'Circle1'
});
audienceSource.addFeature(circle)


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


map.getView().on('change:resolution', function(evt) {
  var zoom = map.getView().getZoom();
  console.log('zoom: '+zoom)
  // zoomm is a number from 1-7
  var radius = 2e5/zoom;
  console.log(radius)

  audienceSource.forEachFeature(function(feature){
    var coords = feature.getGeometry().getCenter();
    feature.setGeometry(new Circle(coords, radius));
  });
});
