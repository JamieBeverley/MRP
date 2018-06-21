import Circle from "ol/geom/circle"
import Feature from "ol/Feature"
import Proj from "ol/proj"
import Point from "ol/geom/point"
import Params from "./Params.js"
import Connectable from "./Connectable.js"

var Remote = function (uid, coordinates, source){
  this.uid = uid;
  this.coordinates = coordinates

  // inherit from connectable
  var featureOpts = {
    geometry: new Circle(Proj.fromLonLat(this.coordinates.reverse()), 1.5e4),
    labelPoint: new Point(Proj.fromLonLat(this.coordinates.reverse())),
    name: this.uid
  }

  Connectable.call(this, "remote", source, featureOpts);

  this.subscribed = false;
  this.params = new Params(); // null constructor bc. not subscribed

  this.source.addFeature(this);
  Remote.remotes = Remote.remotes?Remote.remotes:{};
  Remote.remotes[this.uid] = this
};

// Inherit functions other than constructor from connectable
Remote.prototype = Object.create(Connectable.prototype,{constructor: Remote});

Remote.prototype.subscribe = function(){this.subscribe = true};
Remote.remotes = {}

export default Remote
