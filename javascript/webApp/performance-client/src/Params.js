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
      closure[Params.params[j]]=val;
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
