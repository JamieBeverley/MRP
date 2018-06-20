import Circle from "ol/geom/circle"
import Feature from "ol/Feature"
import Proj from "ol/proj"
import Point from "ol/geom/point"
import Params from "./Params.js"


var Remote = function (uid, coordinates){
  this.uid = uid;
  this.coordinates = coordinates

  var circle = new Feature({
    geometry: new Circle(Proj.fromLonLat(this.coordinates.reverse()), 1.5e4),
    labelPoint: new Point(Proj.fromLonLat(this.coordinates.reverse())),
    name: uid
  });
  circle.uid = this.uid
  this.feature = circle;
  this.subscribed = false;
  this.params = new Params(); // null constructor bc. not subscribed
  Remote.remotes = Remote.remotes?Remote.remotes:{};
  Remote.remotes[this.uid] = this
};

Remote.prototype.subscribe = function(){this.subscribe = true};
Remote.remotes = {}

export default Remote
