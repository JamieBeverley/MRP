import Style from 'ol/style/style'
import Icon from 'ol/style/icon'
import Circle from 'ol/geom/circle'
import Point from 'ol/geom/point'

import Connectable from "./Connectable.js"

var SpeakerUID = 0;
// // coordinates::[num,num]  source: vector source to add to;
var Speaker = function (coordinate, source, initialRadius){
  this.uid = SpeakerUID++;
  initialRadius = initialRadius?initialRadius:1e5;
  var featureOpts = {geometry: new Circle (coordinate, initialRadius)} // need a geometry for a 'hit box' for connections
  Connectable.call(this, "speaker", coordinate, source, featureOpts);
  // TODO - Icon only appears if the feature's geometry is a point, but current implementation for finding
  //        if something has clicked a speaker depends on a circle geometry - might need to find out what
  //        part of the circle spec is used to determine source.getFeaturesAtCoordinate
  // this.setStyle(new Style({image: new Icon({src: 'speaker.png', scale:0.05})}));

  // TODO - This really makes more sense to be in 'Connectable' - connectables have a source and feature and should
  // add the feature to the source... but get error #30 when I do this
  this.source.addFeature(this)

  Speaker.speakers = Speaker.speakers?Speaker.speakers:[];
  Speaker.speakers.push(this);
}

Speaker.eightChannelSpeakerCoordinateRatios = [[1/3,1],[2/3,1],[1,2/3],[1,1/3],[2/3,0],[1/3,0],[0,1/3],[0,2/3]];
Speaker.prototype = Object.create(Connectable.prototype,{constructor:Speaker});

Speaker.prototype.delete = function (){
  console.log("WARNING: speakers should probably not be deleted...")
}

export default Speaker
