import Feature from 'ol/feature'
import LineString from 'ol/geom/linestring'
import Proj from 'ol/proj' // fromLonLat
import Connectable from './Connectable.js'
import Style from 'ol/style/style'


var Connection = function (from, to, source){

  if (from.coordinate==undefined || to.coordinate == undefined){
    throw "Both 'from' and 'to' must have a center coordinate to be connected from and to"
  };

  var featureOpts = {geometry: new LineString ([from.coordinate, to.coordinate],'XY')};
  Feature.call(this, featureOpts)
  this.source = source;
  this.source.addFeature(this);
  this.type = "connection"
  this.from = from;
  this.to = to;
}

Connection.prototype = Object.create(Feature.prototype, {constructor:Connection});

Connection.prototype.redraw = function (){
  this.getGeometry().setCoordinates([this.from.coordinate,this.to.coordinate],'XY');
}

// Removes connection from the 'from' and 'to' connections lists, and from global 'connections' array
// then removes connection feature from the source.
Connection.prototype.delete = function(){
  var indexOfThisFrom = this.from.connections.indexOf(this);
  if(indexOfThisFrom == -1){
    console.log("WARNING:  mismatch in connection list of 'from' - did not contain the connection being deleted");
  } else{
    this.from.connections.splice(indexOfThisFrom,1);
  }

  var indexOfThisTo = this.to.connections.indexOf(this);
  if(indexOfThisTo == -1){
    console.log("WARNING:  mismatch in connection list of 'to' - did not contain the connection being deleted");
  } else {
    this.to.connections.splice(indexOfThisTo,1);
  }

  var indexOfThisConnectable = Connectable.connections.indexOf(this)
  if(indexOfThisConnectable == -1){
    console.log("WARNING:  mismatch in connection list of 'Connectable.connections' - did not contain the connection being deleted");
  } else {
    Connectable.connections.splice(indexOfThisConnectable,1);
  }
  this.setStyle(new Style({fill: [255,255,255,0]}));
  this.source.removeFeature(this);
  delete this;
}

Connection.prototype.getInfoHTML = function (){
  var div = document.createElement("div");
  div.className = "connectionInfo";
  div.appendChild(document.createTextNode("From: "+this.from.type+":"+this.from.uid+"  To: "+this.to.type+":"+this.to.uid));

  return div;
}

export default Connection
