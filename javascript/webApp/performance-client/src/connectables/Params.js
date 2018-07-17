var Params = function(clarity, strength, loudness, turbidity, pitch, spectralCentroid){
  this.clarity = clarity?clarity:0;
  this.strength = strength?clarity:0;
  this.loudness = loudness?loudness:0;
  this.turbidity = turbidity?loudness:0;
  this.pitch = pitch?pitch:0;
  this.spectralCentroid = spectralCentroid?spectralCentroid:0;
}

Params.params = ["clarity","strength", "loudness", "turbidity", "pitch", "spectralCentroid"]

Params.prototype.getSetterHTML = function (){
  var container = document.createElement("table")
  var closure = this;
  var dom =[];
  for(var k=0; k<Params.params.length; k++){
    var row = document.createElement("tr")
    var leftCol = document.createElement("td")
    leftCol.appendChild(document.createTextNode(Params.params[k]+": "))
    // NOTE: const is necessary here or wacky things happen
    var rightCol = document.createElement("td");
    const numInput = document.createElement("input")
    const j = k;
    numInput.type = "number"
    numInput.value = this[Params.params[k]]?this[Params.params[k]]:0;
    numInput.step = 0.01;
    numInput.min = 0;
    numInput.max = 1;
    numInput.className = "params";
    numInput.onchange = function(){
      var val = parseFloat(numInput.value);
      var params = closure.getParams();
      params[Params.params[j]] = val;
      closure.setParams(params)
      // closure[Params.params[j]]=val;
    }
    rightCol.appendChild(numInput);
    row.appendChild(leftCol);
    row.appendChild(rightCol);
    container.appendChild(row)
    // dom.push(element);
  }
  // for (var i in dom){
  //   container.appendChild(dom[i])
  // };
  return container
}

Params.prototype.getParams = function(){
  var r = {
    clarity: this.clarity,
    strength: this.strength,
    loudness: this.loudness,
    turbidity: this.turbidity,
    pitch: this.pitch,
    spectralCentroid: this.spectralCentroid
  }
  return r;
}

Params.prototype.onParamsChange = function(){};

// This should always be used instead of setting theses parameters individually to comply with
// the hacky pseudo-event system
// TODO - make it so params can't be set without using this setter function
Params.prototype.setParams = function (obj){
  this.clarity = obj.clarity;
  this.turbidity = obj.turbidity;
  this.spectralCentroid = obj.spectralCentroid;
  this.loudness = obj.loudness;
  this.pitch = obj.pitch;
  this.strength = obj.strength;
  this.onParamsChange();
}

Params.prototype.getInfoHTML = function (){
  var container = document.createElement("table")
  container.className = "paramsInfo"

  for (var i in Params.params){
    var row = document.createElement("tr")
    var leftCol = document.createElement("td")
    leftCol.appendChild(document.createTextNode(Params.params[i]+": "));
    var rightCol = document.createElement("td")
    rightCol.appendChild(document.createTextNode(this[Params.params[i]]))
    row.appendChild(leftCol);
    row.appendChild(rightCol);
    container.appendChild(row);
  }
  return container;
}

Params.prototype.toString = function(){
  var str =""
  for (var i in Params.params){
    str = str+Params.params[i]+": "+this[Params.params[i]]+"  "
  }
  return str
}

export default Params
