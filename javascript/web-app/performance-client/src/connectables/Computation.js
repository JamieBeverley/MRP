// Feature -> Connectable -> Computation -> Comp1,Comp2,Comp3....
import Connectable from './Connectable.js'
import Polygon from 'ol/geom/polygon'
import Circle from 'ol/geom/circle'
import Style from 'ol/style/style'
import Params from './Params.js'
import SCState from '../SCState.js'

var ComputationUID = 0;
var Computation = function (coordinate, source, initialRadius, computation){
  this.radius = initialRadius?initialRadius:1.5e5;
  this.uid = ComputationUID++;
  this.computation = computation?computation:{type:"undefined"};

  var radiusXYdist = Math.sqrt(this.radius*this.radius/2);

  var vertices = [[
    [coordinate[0],coordinate[1]+radiusXYdist],
    [coordinate[0]+radiusXYdist,coordinate[1]-radiusXYdist],
    [coordinate[0]-radiusXYdist, coordinate[1]-radiusXYdist],
    [coordinate[0],coordinate[1]+radiusXYdist]
  ]];

  var geom = new Polygon (vertices)
  var featureOpts = {geometry: geom}
  Connectable.call(this,"computation", coordinate, source, featureOpts, 1)
  this.source.addFeature(this);

  Computation.computations = Computation.computations?Computation.computations:[];
  Computation.computations.push(this);
}


Computation.prototype = Object.create(Connectable.prototype,{constructor: Computation});

// Pseudo event system - this will be called anytime this.computation is changed by
// 'setComputation'
Computation.prototype.onComputationChange = function(){
  console.log("changed:  "+this.toString());
}

Computation.prototype.setComputation = function (computation){
  this.computation = computation;
  this.onComputationChange();
}

Computation.prototype.setRadius = function (radius){
  this.radius = radius
  var radiusXYdist = Math.sqrt(this.radius*this.radius/2);
  var vertices = [[
    [this.coordinate[0], this.coordinate[1]+radiusXYdist],
    [this.coordinate[0]+radiusXYdist, this.coordinate[1]-radiusXYdist],
    [this.coordinate[0]-radiusXYdist, this.coordinate[1]-radiusXYdist],
    [this.coordinate[0], this.coordinate[1]+radiusXYdist]
  ]];
  this.getGeometry().setCoordinates(vertices);
}

Computation.computationTypes = ["undefined","reweight", "sample and hold", "grain randomness", "corpus"]

Computation.prototype.getInfoHTML = function (){
  var container = document.createElement("div");
  container.className = "connectableInfoContainer"
  var txt = document.createElement("div")
  txt.appendChild(document.createTextNode("Computation: "+this.uid))
  container.appendChild(txt);

  var content = document.createElement("div")
  content.className = "connectableInfo"

  container.appendChild(content);
  var functionDropDown = document.createElement("select")

  for (var i in Computation.computationTypes){
    var option = document.createElement('option');
    option.value = Computation.computationTypes[i];
    option.innerHTML = Computation.computationTypes[i];
    option.selected = this.computation.type == Computation.computationTypes[i]
    functionDropDown.appendChild(option)
  }
  content.appendChild(functionDropDown)
  var computationSpecificHTML = document.createElement('div');
  // var computationSpecHTML = this.getComputationSpecHTML();
  computationSpecificHTML.appendChild(this.getComputationSpecHTML());
  content.appendChild(computationSpecificHTML);
  var closure = this;
  functionDropDown.onchange =  function(ev){
    var val = functionDropDown.options[functionDropDown.selectedIndex].value;
    closure.computation = Computation.getEmptyComputationObj(val);
    var html = closure.getComputationSpecHTML();
    // var html = cl
    computationSpecificHTML.innerHTML = ""
    computationSpecificHTML.appendChild(html)
    // computationSpecHTML = html;
  }

  txt.addEventListener("click", function(ev){
    content.style.display = content.style.display=="block"?"none":"block"
  });

  return container
}

Computation.prototype.getComputationSpecHTML = function(){
  var container = document.createElement("div");
  if (this.computation.type == "reweight"){
    var txt = document.createTextNode("Weights: ")
    var initialVal = this.computation.value instanceof Params?this.computation.value:new Params(1,1,1,1,1,1);
    // Bubble up event
    var closure = this
    initialVal.onParamsChange = function(){
      closure.onComputationChange();
    }
    this.setComputation({type:this.computation.type,value:initialVal})
    var html = this.computation.value.getSetterHTML();
    container.appendChild(txt);
    container.appendChild(html);
  } else if (this.computation.type =="sample and hold"){
    var txt = document.createTextNode("Grains: ")
    var initialVal = this.computation.value?this.computation.value:1;
    this.setComputation({type:this.computation.type, value: initialVal});
    var numInput = this.createNumInput(this.computation.type, 1, 1, Infinity, initialVal);
    container.appendChild(txt);
    container.appendChild(numInput);
  } else if (this.computation.type == "grain randomness"){
    var txt = document.createTextNode("randomness: ")
    var initialVal = this.computation.value?this.computation.value:0;
    this.setComputation({type:this.computation.type, value: initialVal});
    var numInput = this.createNumInput(this.computation.type, 0.01, 0, 1, initialVal);
    container.appendChild(txt);
    container.appendChild(numInput);
  } else if (this.computation.type == "corpus"){
    var dd = document.createElement('select');
    var initialIndex = SCState.corpuses.indexOf(this.computation.value);
    initialIndex = initialIndex==(-1)?0:initialIndex;
    for (var i in SCState.corpuses){
      const option = document.createElement('option');
      option.value = SCState.corpuses[i];
      option.innerHTML = SCState.corpuses[i];
      option.selected = i==initialIndex;
      // if(i==initialIndex){option.selected=true;}
      dd.appendChild(option);
    }
    // if it just switched to 'corpus' type, make sure event is fired
    this.setComputation({type:this.computation.type, value:SCState.corpuses[initialIndex]});
    var closure = this;
    dd.onchange = function(){
      var val = dd.options[dd.selectedIndex].value;
      console.log(closure.setComputation);
      // whenever dd changes, pseudo event fires;
      closure.setComputation({type:"corpus",value:val})
    }
    container.appendChild(dd)
  }

  return container;
}



Computation.prototype.createNumInput = function(computationType, stepsize, min, max, initial){
  const numInput = document.createElement("input");
  numInput.type = "number";
  numInput.step = stepsize;
  numInput.min = min;
  numInput.max = max;
  numInput.className = "computation"
  numInput.value = initial
  var closure = this;
  numInput.onchange = function (){
    var val = numInput.value;
    // closure.computation.value = val;
    closure.setComputation({type:computationType, value:val})
    // closure.computation[computationType].value = val;
  }
  return numInput
}

Computation.getEmptyComputationObj = function(type){
  var r = {type:type}
  if (type == "reweight"){
    r.value = new Params(1,1,1,1,1,1);
    // Bubble up change events
    r.value.onParamsChange = function(){this.onComputationChange();}
  } else if (type =="sample and hold"){
    r.value = 0;
  } else if (type == "grain randomness"){
    r.value = 0;
  } else if (type == "corpus"){
    r.value = SCState.corpuses[0]?SCState.corpuses[0]:"<none>";
  } else{
    r = {type:"undefined"}
  }
  return r;
}

Computation.prototype.getGraphData = function (){
  var r = {
    type: this.type,
    uid: this.uid,
    value: this.getComputationGraphData(),
  }
  return r
}

Computation.prototype.getComputationGraphData = function(){
  var r = {type:this.computation.type}
  if (this.computation.type == "reweight"){
    r.value = this.computation.value.getParams();
  } else {
    // maybe a bit awkward, but by keeping this an object, a computation's graph data is of consistent format
    // (meaning in other places you don't have to treat 'reweight' differently from other computations)
    r.value = {"value": this.computation.value}
  }
  return r;
}

export default Computation

// [
//   [
//     [-2e6, 6e6],
//     [-2e6, 8e6],
//     [0, 8e6],
//     [0, 6e6],
//     [-2e6, 6e6]
//   ]
// ]
