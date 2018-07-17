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

  Connectable.call(this, "remote", coordinate,  source, featureOpts);
  this.source.addFeature(this)

  this.subscribed = false;
  this.params = new Params(); // null constructor bc. not subscribed
  var closure = this;
  var f = this.params.onParamsChange;
  this.params.onParamsChange = function (){
    // Call whatever params would regularly have called
    f();
    // call the remote's onchange func
    closure.onRemoteChange();
  }
  Remote.remotes = Remote.remotes?Remote.remotes:{};
  Remote.remotes[this.uid] = this
};

// Inherit functions other than constructor from connectable
Remote.prototype = Object.create(Connectable.prototype,{constructor: Remote});

//Overwrite inherited delete func (... that delete func should probably just be dispoed of)
Remote.prototype.delete = function (){
  delete Remote.remotes[this.uid]
  this.disconnectAll();
  this.source.removeFeature(this);
  delete this;
}

Remote.prototype.setParams = function (params){
  this.params.setParams(params);
  // NOTE: Remote.prototype.onRemoteChange is not called here because it already gets called
  //       by this.params.onParamsChange (see constructor above)
};

Remote.prototype.onRemoteChange= function(){
  console.log("changed: "+this.toString());
}

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

// Returns a JSON object that contains essential info for constructing audio synthesis graph
// (ie. it discards of all the info that isn't needed to construct the audio so that we're not sending
//  ws messages that are larger than they should be)
Remote.prototype.getGraphData = function (){
  var r = {
    uid: this.uid,
    type: this.type,
    value: this.params.getParams()
  }
  return r;
}

Remote.remotes = {}

export default Remote
