import Connection from "./Connection.js"
import SCClientWS from "../web-socket/SCClientWS.js"
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
  Connectable.connectables = Connectable.connectables?Connectable.connectables:[];
  Connectable.connectables.push(this);
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
}

// Deletes connections and the implicit object. 3 connections arrays are updated via connections.prototype.delete
// NOTE - any connectable that overwrites delete should make sure it still does the stuff below:
//        ie. like delete that object from the Connectable.connectables list, disconnecting things, etc...
Connectable.prototype.delete = function (){
  this.disconnectAll();
  this.setStyle(new Style({}));
  this.source.removeFeature(this);
  for(var i in Connectable.connectables){
    var c = Connectable.connectables[i];
    if (c.uid == this.uid && c.type == this.type){
      Connectable.connectables.splice(i,1);
    }
  }
  delete this;
  Connectable.printGlobalConnections();
}

// Returns list of input connections
Connectable.prototype.getInputConnections = function () {
  var r = []
  for(var i in this.connections){
    if (this.connections[i].to == this){
      r.push(this.connections[i])
    }
  }
  return r;
}

// Returns list of output connections
Connectable.prototype.getOutputConnections = function () {
  var r = []
  for(var i in this.connections){
    if (this.connections[i].from == this){
      r.push(this.connections[i])
    }
  }
  return r;
}

// Disconnect all connections from implicit Connectable
// connection.prototype.delete takes care of handling Conneciton.connections, this.connections, and other.connections
Connectable.prototype.disconnectAll = function (){
  var deleteList = []
  // need to pop 0th each iteration rather than for loop bc indexing gets screwed up
  // as things are deleted.
  while(this.connections.length>0){
    this.connections[0].delete()
  }
}

Connectable.prototype.toString = function (){
  return (this.type+": "+this.uid)
}


Connectable.onChange = function(){
  if(this.type!="speaker"){
    console.log('probably shouldnt be reaching this condition');
  }
  SCClientWS.send({type:"updateConnectable", value:this.getGraphData()});
}

// Convenience for printing
Connectable.prototype.print = function(){
  console.log(this.toString());
}

// Convenience for printing
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
