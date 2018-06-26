import Circle from "ol/geom/circle"
import Feature from "ol/Feature"
import Proj from "ol/proj"
import Point from "ol/geom/point"
import Params from "./Params.js"
import Connectable from "./Connectable.js"

var Remote = function (uid, coordinate, source){
  this.uid = uid;

  // inherit from connectable
  var featureOpts = {
    geometry: new Circle(coordinate, 1.5e4),
    labelPoint: new Point(coordinate),
    name: this.uid
  }

  Connectable.call(this, "remote", coordinate, source, featureOpts);
  this.source.addFeature(this)

  this.subscribed = false;
  this.params = new Params(); // null constructor bc. not subscribed

  Remote.remotes = Remote.remotes?Remote.remotes:{};
  Remote.remotes[this.uid] = this
};

// Inherit functions other than constructor from connectable
Remote.prototype = Object.create(Connectable.prototype,{constructor: Remote});



Remote.prototype.subscribe = function(){this.subscribe = true};
Remote.prototype.getInfoHTML = function (){
    var container = document.createElement('div')
    container.className = "connectableInfoContainer";

    var txt = document.createElement("div")
    txt.appendChild(document.createTextNode("Remote: "+this.uid))
    container.appendChild(txt);
    var content = document.createElement('div')
    content.className = "connectableInfo"
    container.appendChild(content);

    // display params
    content.appendChild(this.params.getInfoHTML());

    // show connection info
    var connectionInfoContainer = document.createElement("div")
    connectionInfoContainer.className = "connectionInfoContainer"
    for (var i in this.connections){
      var con = this.connections[i];
      connectionInfoContainer.appendChild(con.getInfoHTML());
    }
    content.appendChild(connectionInfoContainer);

    txt.addEventListener("click", function(ev){
      content.style.display = content.style.display=="block"?"none":"block"
    });

    return container;
}


Remote.remotes = {}

export default Remote
