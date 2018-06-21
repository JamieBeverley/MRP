import Connection from "./Connection.js"
import Feature from "ol/feature"
import Ol from 'ol'

var Connectable = function(type, source, featureOpts) {
    Feature.call(this, featureOpts);

    if (type=="remote"){
      this.isSink = false;
      this.isSource = true;
    } else if (type == "computation"){
      this.isSink = true;
      this.isSource = true;
    } else if (type == "speaker"){
      this.isSink = true;
      this.isSource = false;
    } else {
      throw "Connectable must be given an appropriate type"
    }
    this.type = type;
    this.source = source;
    this.connections = [];
    Connectable.connections = Connectable.connections?Connectable.connections:[];
};

// Inherit Feature.prototype
Connectable.prototype = Object.create(Feature.prototype, {cosntructor: Connectable})

Connectable.prototype.connect = function (other){
  if(!this.isSource){
    throw "Erorr: cannot make a connectionn from something that is not a source"
  }
  if(!other.isSink){
    throw "Error: cannot make a connection to something that is not a sink"
  }
  if(this.source != other.source){
    throw "Error: cannot connect objects that have different vector sources"
  }

  // Check if connection already exists
  for(var i in this.connections){
    var con = this.connections[i];
    if(con.from == this && this.to == other){
      console.log("Warning connection already exists!")
      return other
    }
  }
  var connection = new Connection (this, other);
  this.connections.push(connection);

  Connectable.connections.push(connection);

  return other;
}

Connectable.prototype.disconnect = function (other){
  if(this.source != other.source){
    throw "Error: cannot disconnect objects that have different vector sources"
  }

  var index;
  // Check if connection already exists
  for(var i=0; i<this.connections.length(); i++){
    var con = this.connections[i];
    if(con.to == other){
      index = i;
      break;
    }
  }
  if (index){
    this.connections.splice(index,1);
  } else {
    console.log("WARNING: tried to disconnect a non-existant connection");
  }

  var globalIndex;
  // Check if connection already exists
  for(var i=0; i<Connectable.connections.length(); i++){
    var con = Connectable.connections[i];
    if(con.to == other && con.from == this){
      globalIndex = i;
      break;
    }
  }
  if (globalIndex){
    Connectable.connections.splice(globalIndex,1);
  } else {
    console.log("WARNING: tried to disconnect a non-existant connection from globalConnections");
  }
}



export default Connectable;
