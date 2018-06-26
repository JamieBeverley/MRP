import Connection from "./Connection.js"
import Feature from "ol/feature"
import Ol from 'ol'
import Style from 'ol/style/style'

// Coordinate should be in openlayers' x,y format, not longlat...
var Connectable = function(type, coordinate, source, featureOpts, maxInputs) {
  this.maxInputs = maxInputs
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
  this.coordinate = coordinate
  this.type = type;
  this.source = source;
  this.connections = [];
  Connectable.connections = Connectable.connections?Connectable.connections:[];
};

// Inherit Feature.prototype
Connectable.prototype = Object.create(Feature.prototype, {cosntructor: Connectable})

Connectable.prototype.connect = function (other){
  if(!this.isSource){
    console.log("Warning: cannot make a connectionn from something that is not a source")
    return false;
  }
  if(!other.isSink){
    console.log("Warning: cannot make a connection to something that is not a sink");
    return false;
  }
  if(this.source != other.source){
    console.log("Error: cannot connect objects that have different vector sources");
    return false
  }
  if(this == other){
    console.log("Cannot connect a thing to itself");
    return false;
  }

  // Check if connection already exists
  for(var i in this.connections){
    var con = this.connections[i];
    if(con.from == this && con.to == other){
      console.log("Warning connection already exists!")
      return other
    }
  }
  console.log("to maxInputs: "+other.maxInputs)
  console.log("to connections.len"+other.connections.length);

  var otherInputs = other.getInputConnections()
  while (other.maxInputs <= otherInputs.length){
    if(other.maxInputs<otherInputs.length){
      console.log("inputs exceeds max number allowed, this shouldn't have happened....")
    }
    for (var i in other.connections){
      if (other.connections[i].to == other){
        other.connections[i].delete();
        break;
      }
    }
    otherInputs = other.getInputConnections();
  }

  var connection = new Connection (this, other, this.source);
  this.connections.push(connection);
  other.connections.push(connection);

  Connectable.connections.push(connection);
  Connectable.printGlobalConnections();

  return true;
}

// Connection.prototype.delete handles removing the connection from the appropriate arrays (for 'from', 'to', and 'Connection.connections')
Connectable.prototype.disconnect = function (other){

  var connection;
  // Check if connection already exists
  for(var i=0; i<this.connections.length(); i++){
    var con = this.connections[i];
    if(con.to == other){
      connection = con;
      break;
    }
  }
  if (connection){
    connection.delete();
  } else {
    console.log("WARNING: connection not found, could not delete");
  }

  //
  //
  // // removes connection from
  // if(this.source != other.source){
  //   throw "Error: cannot disconnect objects that have different vector sources"
  // }
  //
  // var index;
  // // Check if connection already exists
  // for(var i=0; i<this.connections.length(); i++){
  //   var con = this.connections[i];
  //   if(con.to == other){
  //     index = i;
  //     break;
  //   }
  // }
  // if (index){
  //   this.connections.splice(index,1);
  // } else {
  //   console.log("WARNING: tried to disconnect a non-existant connection");
  // }
  //
  // var globalIndex;
  // // Check if connection already exists
  // for(var i=0; i<Connectable.connections.length(); i++){
  //   var con = Connectable.connections[i];
  //   if(con.to == other && con.from == this){
  //     globalIndex = i;
  //     break;
  //   }
  // }
  // if (globalIndex){
  //   Connectable.connections.splice(globalIndex,1);
  // } else {
  //   console.log("WARNING: tried to disconnect a non-existant connection from globalConnections");
  // }

}

Connectable.prototype.delete = function (){
  this.disconnectAll();
  this.setStyle(new Style({}));
  this.source.removeFeature(this);
  delete this;
  Connectable.printGlobalConnections();
}

Connectable.prototype.getInputConnections = function () {
  var r = []
  for(var i in this.connections){
    if (this.connections[i].to == this){
      r.push(this.connections[i])
    }
  }
  return r;
}

Connectable.prototype.getOutputConnections = function () {
  var r = []
  for(var i in this.connections){
    if (this.connections[i].from == this){
      r.push(this.connections[i])
    }
  }
  return r;
}

Connectable.prototype.disconnectAll = function (){
  var deleteList = []
  // need to pop 0th each iteration rather than for loop bc indexing gets screwed up
  // as things are deleted.
  while(this.connections.length>0){
    this.connections[0].delete()
  }
}

Connectable.prototype.print = function(){
  console.log(this.type+": "+this.uid);
}

Connectable.printGlobalConnections = function (){
  Connectable.connections = Connectable.connections?Connectable.connections:[];
  console.log ("______________")
  console.log ("Connections:")

  for (var i in Connectable.connections){
    var con = Connectable.connections[i];
    console.log("From: "+con.from.type+":"+con.from.uid+"  To: "+con.to.type+":"+con.to.uid);
  }
  console.log ("______________")
}

export default Connectable;
