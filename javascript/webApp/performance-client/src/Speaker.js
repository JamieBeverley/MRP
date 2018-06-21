import Style from 'ol/style/style'
import Icon from 'ol/style/icon'
import Point from 'ol/geom/point'
import Connectable from "./Connectable.js"

// // coordinates::[num,num]  source: vector source to add to;
var Speaker = function (coordinates, source){
  var featureOpts = {geometry:new Point (coordinates)}
  Connectable.call(this, "speaker", source, featureOpts);
  this.setStyle(new Style({image: new Icon({src: 'speaker.png', scale:0.05})}));

  this.source.addFeature(this);
  Speaker.speakers = Speaker.speakers?Speaker.speakers:[];
  Speaker.speakers.push(this);
}

Speaker.eightChannelSpeakerCoordinateRatios = [[1/3,1],[2/3,1],[1,2/3],[1,1/3],[2/3,0],[1/3,0],[0,1/3],[0,2/3]];
Speaker.prototype = Object.create(Connectable.prototype,{constructor:Speaker});


export default Speaker
