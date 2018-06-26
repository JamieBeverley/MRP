var ac;
var globalGain;
var meydaAnalyzer;
// var secondaryMeydaAnalyzer; // for doing analysis of things from the first one (ex. finding centroid of rms)
var testOsc;
var buffers = {};
var fftSize = 512;
var features;
// var secondaryFeatures;

graphables = {
  "buffer":{min:0,max:1},
  "amplitudeSpectrum":{min:0,max:1},   // probably just use powerSpectrum instead
  "powerSpectrum":{min:0,max:1},      // FFT
  "loudness":{min:0,max:10},           // perceptual loudness at 24 critical bands according to Bark perceptual scale
  "mfcc":{min:0,max:100},               // a perceptual FFT basically (13 bands)
  "complexSpectrum":{min:0,max:1}     //
}

var longWindow = 200;
var mediumWindow = 50;
var shortWindow = 10;


var emptyMeanStdDev = {mean:undefined,stdDev:undefined}
var emptyWindowedValues = {long:emptyMeanStdDev,medium:emptyMeanStdDev,short:emptyMeanStdDev}

nonGraphables ={
  // "rms":{min:100,max:0.1,minVal:0,maxVal:0,vals:[],windowedValues:emptyWindowedValues},                // loudness
  "loudnessTotal":{min:0,max:100,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},
  "rms":{min:0,max:1,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},                // loudness

  "energy":{min:0,max:40,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},               // loudness again..
  "zcr":{min:0,max:100,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},                // zero crossing, maybe useful as secondary analysis
  "spectralCentroid":{min:0,max:fftSize/2,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},     // definitely useful..  [0 to bin size/2] -> around max w/ whitenoise.
  "spectralFlatness":{min:0,max:1,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},       // 'noiseyness' in db
  "spectralSlope":{min:0,max:0.000001,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},        //?? always very low...
  "spectralRolloff":{min:0,max:24000,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},   // 'Edge' of the spectrum- 99% below this freq val.
  "spectralSpread":{min:0,max:100,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},     //  deviation from centroid - noisey-> greater spread, tone -> smaller
  "spectralSkewness":{min:0,max:50,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},    // if things are skewed towards a fundamental... (how is different from spread?)
  "spectralKurtosis":{min:0,max:200000,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues,scale:function(v){v}},  // 'pointyness' of spectrum - is there one peak? - highest vals with a few sine's around one point in spectrum
  "perceptualSpread":{min:0,max:1,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues},    // 'fullness?'
  "perceptualSharpness":{min:0,max:4,minVal:undefined,maxVal:undefined,vals:[],windowedValues:emptyWindowedValues} // ... always around 0.6-0.5... (sine, harmonic, white, thunder...),
}

var featureList=[]
for (i in graphables){
  featureList.push(i)
}
for (i in nonGraphables){
  if (i!='loudnessTotal'){
    featureList.push(i)
  }
}

// Layer 3 mappings - values between 0 and 1
// var params = {
//   turbidity:{instant:0, short:0, medium:0, long:0},
//   pitch:{instant:0, short:0, medium:0, long:0},
//   strength:{instant:0, short:0, medium:0, long:0},
//   clarity:{instant:0, short:0, medium:0, long:0},
// }
var params = {
  turbidity:{vals:[],canvas:undefined,showDiv:undefined},
  pitch:{vals:[],canvas:undefined,showDiv:undefined},
  strength:{vals:[],canvas:undefined,showDiv:undefined},
  clarity:{vals:[],canvas:undefined,showDiv:undefined},
}


// Populate data visualization innerHTML
var appendString = ""
for (i in nonGraphables){
  appendString = appendString + "<div class='visualization'> <div>"+i+": </div><div class='canvasContainer'><canvas id='"+i+"Canvas' width='800px' height='200px'></canvas> <div class='canvasMaxOverlay'>"+nonGraphables[i].max+"</div>  <div class='canvasMinOverlay'>"+nonGraphables[i].min+"</div> </div> <div id = "+i+"> </div> </div>\n"
}

for (i in graphables){
    appendString = appendString+"<div class='visualization'> <div>"+i+":</div> <div class='canvasContainer'><canvas id ='"+i+"' width='800px' height='200px'> </canvas> <div class='canvasMaxOverlay'>"+graphables[i].max+"</div>  <div class='canvasMinOverlay'>"+graphables[i].min+"</div></div>  </div>\n"
}

// for (i in featureList){
//   if (graphables[featureList[i]]){
//     // appendString = appendString+"<div class='visualization'> <label>"+featureList[i]+":</label> <canvas id ='"+featureList[i]+"' width='800px' height='200px'> <div class='canvasMaxOverlay' id='"+featureList[i]+"CanvasMax'></div>  <div class='canvasMinOverlay' id='"+featureList[i]+"CanvasMin'></div> </canvas> </div>\n"
//     appendString = appendString+"<div class='visualization'> <label>"+featureList[i]+":</label> <canvas id ='"+featureList[i]+"' width='800px' height='200px'> <div class='canvasMaxOverlay'>"+graphables[i].max+"</div>  <div class='canvasMinOverlay'>"+graphables[i].min+"</div> </canvas> </div>\n"
//   }
//   else {
//     appendString = appendString + "<div class='visualization'> <label>"+featureList[i]+": </label><div><canvas id='"+featureList[i]+"Canvas' width='800px' height='200px'> <div class='canvasMaxOverlay'>"+nonGraphables[featureList[i]].max+"</div>  <div class='canvasMinOverlay'>"+nonGraphables[i].min+"</div> </canvas></div> <div id = "+featureList[i]+"> </div> </div>\n"
//   }
// }
document.getElementById('dataVisualization').innerHTML = appendString
// loudness has both a graphed thing and a
// document.getElementById('loudness').parentNode.innerHTML = "<div class='visualization'> <label>loudness:</label> <canvas id ='loudness' width='800px' height='200px'> </canvas><div id='loudnessTotal'></div></div>\n"


appendString = ""
// Populate param visualizations innerHTML
for (i in params){
  appendString = appendString + "<div class='Visulization'> <div>"+i+": </div> <div class='canvasContainer'><canvas id='"+i+"Canvas' width='800px' height=200px'> </canvas> <div class='canvasMinOverlay'>0</div> <div class='canvasMaxOverlay'>1</div> </div> <div id='"+i+"'> </div> </div>\n"
}
document.getElementById('paramVisualization').innerHTML = appendString;

for (i in params){
  params[i].canvas = document.getElementById(i+"Canvas")
  params[i].showDiv = document.getElementById(i);
}

function draw(){
  requestAnimationFrame(draw)
  if(features){
    for (i in graphables){
      var arr;
      if(features[i].specific){
        arr = features[i].specific;
      } else if (features[i].real){
        arr = features[i].real
      } else{
        arr = features[i]
      }
      var canvas = document.getElementById(i)
      if(arr && canvas){
        drawArrayOnCanvas(arr,canvas,graphables[i].min,graphables[i].max)
        drawWindowsOnCanvas(canvas);
      }
    }

    for (i in nonGraphables){
      var s = "<table>"
      s = s +"<tr> <td>long:</td> <td>mean: "+nonGraphables[i].windowedValues.long.mean+"</td> <td>stdDev: "+nonGraphables[i].windowedValues.long.stdDev+" </td></tr>"
      s = s + "<tr> <td>medium:</td> <td>mean: "+nonGraphables[i].windowedValues.medium.mean+"</td> <td>stdDev: "+nonGraphables[i].windowedValues.medium.stdDev+"</td> </tr>"
      s = s + "<tr><td>short:</td><td>mean: "+nonGraphables[i].windowedValues.short.mean+"</td><td>stdDev: "+nonGraphables[i].windowedValues.short.stdDev+"</td></tr>"
      s = s +"<tr> <td>Max/min:</td> <td>max: "+nonGraphables[i].maxVal+"</td> <td>min: "+nonGraphables[i].minVal+"</td> </tr>"
      s = s +"</table>"

      document.getElementById(i).innerHTML = s
      var canvas = document.getElementById(i+"Canvas")
      drawArrayOnCanvas(nonGraphables[i].vals, canvas,nonGraphables[i].min,nonGraphables[i].max)
      drawWindowsOnCanvas(canvas);
    }
  }

  // for (i in features){
  //   if (graphables[i]){
  //     var arr;
  //     if(features[i].specific){
  //       arr = features[i].specific;
  //     } else if (features[i].real){
  //       arr = features[i].real
  //     } else{
  //       arr = features[i]
  //     }
  //     var canvas = document.getElementById(i)
  //     if(arr && canvas){
  //       drawArrayOnCanvas(arr,canvas,graphables[i].min,graphables[i].max)
  //       drawWindowsOnCanvas(canvas);
  //     }
  //     // if(features[i].total){
  //     //   document.getElementById(i).parentNode
  //     // }
  //   } else {
  //
  //
  //     var s = "<table>"
  //     s = s +"<tr> <td>long:</td> <td>mean: "+nonGraphables[i].windowedValues.long.mean+"</td> <td>stdDev: "+nonGraphables[i].windowedValues.long.stdDev+" </td></tr>"
  //     s = s + "<tr> <td>medium:</td> <td>mean: "+nonGraphables[i].windowedValues.medium.mean+"</td> <td>stdDev: "+nonGraphables[i].windowedValues.medium.stdDev+"</td> </tr>"
  //
  //     s = s + "<tr><td>short:</td><td>mean: "+nonGraphables[i].windowedValues.short.mean+"</td><td>stdDev: "+nonGraphables[i].windowedValues.short.stdDev+"</td></tr>"
  //
  //     s = s +"<tr> <td>Max/min:</td> <td>max: "+nonGraphables[i].maxVal+"</td> <td>min: "+nonGraphables[i].minVal+"</td> </tr>"
  //
  //     s = s +"</table>"
  //
  //     //
  //     // var s = "<div class='realtimeValues'> <label>Long:</label>   <span>mean: "+nonGraphables[i].windowedValues.long.mean+"</span><span>  stdDev:"+nonGraphables[i].windowedValues.long.stdDev+"</span></div>\n";
  //     //
  //     // s = s +"<div>Medium   mean:"+nonGraphables[i].windowedValues.medium.mean+"  stdDev: "+nonGraphables[i].windowedValues.medium.stdDev+"</div>\n"
  //     //
  //     // s = s + "<div>Short   mean: "+nonGraphables[i].windowedValues.short.mean+"  stdDev: "+nonGraphables[i].windowedValues.short.stdDev+"</div>\n"
  //     //
  //     // s = s + "<div>min: "+nonGraphables[i].minVal+"  max: "+nonGraphables[i].maxVal+"</div>";
  //     document.getElementById(i).innerHTML = s
  //     var canvas = document.getElementById(i+"Canvas")
  //     drawArrayOnCanvas(nonGraphables[i].vals, canvas,nonGraphables[i].min,nonGraphables[i].max)
  //     drawWindowsOnCanvas(canvas);
  //   }
  // }
  for (i in params){
    drawArrayOnCanvas(params[i].vals,params[i].canvas)
  }
}



function calculateWindowedValues(arr,longWin,mediumWin,shortWin){
  var long=longStdDev=0;
  var medium=mediumStdDev=0;
  var short=shortStdDev=0;
  // Calc Means..
  for (var i = arr.length; i>0; i--){
    var windowPassed = arr.length-i;

    if (windowPassed<shortWin){
      short = short+arr[i-1]
      medium = medium+arr[i-1]
      long = long+arr[i-1]

    } else if (windowPassed < mediumWin) {
      medium = medium+arr[i-1]
      long = long+arr[i-1]
    } else if (windowPassed < longWin){
      long = long+arr[i-1]
    } else {
      break;
    }
  }
  var result = {long:{mean:long/longWin},medium:{mean:medium/mediumWin},short:{mean:short/shortWin}}
  // calc. stdDevs
  for (var i = arr.length; i>0; i--){
    var windowPassed = arr.length-i;
    if (windowPassed<shortWin){
      shortStdDev = shortStdDev +Math.pow((arr[i-1]-result.short.mean),2);
      mediumStdDev = mediumStdDev + Math.pow((arr[i-1]-result.medium.mean),2);
      longStdDev = longStdDev + Math.pow(arr[i-1]-result.long.mean,2)
    } else if (windowPassed < mediumWin) {
      mediumStdDev = mediumStdDev + Math.pow((arr[i-1]-result.medium.mean),2);
      longStdDev = longStdDev + Math.pow(arr[i-1]-result.long.mean,2)
    } else if(windowPassed < longWin){
      longStdDev = longStdDev + Math.pow(arr[i-1]-result.long.mean,2)
    } else {
      break;
    }
  }
  result.long.stdDev = Math.sqrt(longStdDev/(longWin-1))
  result.medium.stdDev = Math.sqrt(mediumStdDev/(mediumWin-1))
  result.short.stdDev = shortStdDev/(shortWin-1)?Math.sqrt(shortStdDev/(shortWin-1)):0; // in case short window = 1;
  return result;
}

function roundTo(x,n){
  var a = Math.pow(10,n)
  return Math.round(x*a)/a
}

function analyze (f){
  everyXPrintY(20,f);
  features = f

  for (i in nonGraphables){
    if(i=='loudnessTotal'){
      val = features['loudness'].total;
    } else {
      var val = features[i]
    }

    if (val>nonGraphables[i].maxVal || nonGraphables[i].maxVal==undefined && !isNaN(val)){nonGraphables[i].maxVal=val}
    if (val<nonGraphables[i].minVal || nonGraphables[i].minVal==undefined && !isNaN(val)){nonGraphables[i].minVal=val}
    nonGraphables[i].vals.push(val)

    // 3 Windows
    //TODO at some point switch this back so it only discards of parts of the array every now and then instead of every analyze event
    // if (nonGraphables[i].vals.length>longWindow){
      // nonGraphables[i].vals = nonGraphables[i].vals.slice((-1)*longWindow);
    // }
    nonGraphables[i].vals = nonGraphables[i].vals.slice((-1)*longWindow);
    nonGraphables[i].windowedValues = calculateWindowedValues(nonGraphables[i].vals,longWindow,mediumWindow,shortWindow);
  }



  params.pitch.vals.push(calculatePitch(features, nonGraphables));
  params.pitch.vals = params.pitch.vals.slice(-1*longWindow);


  params.strength.vals.push(calculateStrength(features, nonGraphables))
  params.strength.vals = params.strength.vals.slice(-1*longWindow)

  params.turbidity.vals.push(calculateTurbidity(features, nonGraphables));
  params.turbidity.vals = params.turbidity.vals.slice(-1*longWindow);

  params.clarity.vals.push(calculateClarity(features,nonGraphables))
  params.clarity.vals = params.clarity.vals.slice(-1*(longWindow));
}





function updateGain(){
  var val =dbamp(document.getElementById('globalGain').value)
  // console.log('setting to: '+val)
  globalGain.gain.setValueAtTime(val, ac.currentTime);
}

function mean (a){
  return meanUpTo(a,-1)
}

var counter =0;
function everyXPrintY(x,y){
  counter++;
  if (counter>x){
    console.log(y)
    counter=0;
  }
}

function meanUpTo(list,n=-1){
  if (n==-1){
    n = list.length
  }
  var x = 0
  for (var i =list.length; i>(list.length-n); i--){
    x = x+list[i-1]
  }
  return x/n
}

//(sample)
function standardDeviation(l){
  var m = mean(l)
  var r =0;
  for (i in l){
    r = r+ Math.pow(l[i]-m,2);
  }
  return Math.sqrt(r/(l.length-1))
}

function testDrawOnCanvas(){
  drawArrayOnCanvas(new Float32Array([0.1,0.2,0.3,0.4,1,0.5,0.6,0.7,0.8,0.9]), document.getElementById('loudness'))
}

function startMeyda(){
  if (ac){
    var options = {
      "audioContext":ac, // required
      "source":globalGain, // required
      "bufferSize": fftSize, // required
      "featureExtractors": featureList, // optional - A string, or an array of strings containing the names of features you wish to extract.
      "callback": analyze // optional callback in which to receive the features for each buffer
    }
    meydaAnalyzer = Meyda.createMeydaAnalyzer(options);

    // var secondaryOptions = {
    //   "audioContext":ac, // required
    //   "source":globalGain, // required
    //   "bufferSize": 512, // required
    //   "featureExtractors": ['spectralCentroid'], // optional - A string, or an array of strings containing the names of features you wish to extract.
    //   "callback": function(f){secondaryFeatures=f} // optional callback in which to receive the features for each buffer
    // }
    //
    // secondaryMeydaAnalyzer = Meyda.createMeydaAnalyzer(secondaryOptions)

    console.log("Meyda Initialized")
    meydaAnalyzer.start()
    draw()
  } else{
    start(startMeyda);
  }
}

function clip(val,min,max){
  min = min?min:0;
  max = max?max:1;
  return Math.max(min, Math.min(max,val))
}

function drawArrayOnCanvas (array, canvas,expectedMin=0,expectedMax=1){
  var ctx = canvas.getContext('2d')
  var height = canvas.height;
  var rectWidth = canvas.width/array.length;
  var center = Math.abs(expectedMin)*height
  ctx.clearRect(0,0,canvas.width, height);


  var clipped = false;
  ctx.fillStyle = "rgb(0,0,0)"
  for (i in array){
    // ctx.moveTo(i,height);
    // ctx.lineTo(i,array[i]*height/2);
    // ctx.stroke()
    // ctx.fillRect(i*rectWidth,height,rectWidth,(-1)*clip(array[i],expectedMin,expectedMax)*height/2);
    ctx.fillRect(i*rectWidth,height,rectWidth,(-1)*array[i]*height/expectedMax);
    if(array[i]>expectedMax){
      clipped = true;
    }
    // ctx.fillRect(i*rectWidth,array[i]*height/2,rectWidth,height);
    // ctx.fillRect(i,0,40,40);
    // ctx.fillRect(20,20,20,20);
  }
  if(clipped){
    ctx.fillStyle="rgb(255,0,0)"
    ctx.fillRect(0,0,canvas.width,10)
  }
}

function drawWindowsOnCanvas(canvas){
  var ctx = canvas.getContext('2d')
  //short
  ctx.fillStyle = "rgb(0,0,255)"
  ctx.fillRect(canvas.width*(1-shortWindow/longWindow),0,1,canvas.height)

  // medium
  ctx.fillStyle = "rgb(0,255,0)"
  ctx.fillRect(canvas.width*(1-mediumWindow/longWindow),0,1,canvas.height)

  // long
  ctx.fillStyle = "rgb(255,0,0)"
  ctx.fillRect(canvas.width*(1-longWindow/longWindow),0,1,canvas.height)
}

// var c=document.getElementById("myCanvas");
// var ctx=c.getContext("2d");
// ctx.beginPath();
// ctx.moveTo(0,0);
// ctx.lineTo(300,150);
// ctx.stroke();


function createMicrophoneNode(){
  navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(function(stream){
      microphoneNode = ac.createMediaStreamSource(stream);
  })
}

var playingBuffers =[]
function playBuffer(url){
 var source = ac. createBufferSource()
 source.connect(globalGain)
 if (buffers[url]==undefined){
   var request = new XMLHttpRequest();
   request.open('GET', url, true);
   request.responseType = 'arraybuffer';
   request.onload = function() {
     var audioData = request.response;
     console.log(audioData)
     ac.decodeAudioData(audioData, function(buffer) {
         source.buffer = buffer;
         buffers[url] = buffer;
         source.start();
       },
       function(e){ console.log("Error with decoding audio data:\n  " + e); });
   } //request onload
   request.send();
 } else {
   source.buffer = buffers[url];
   source.start();
 }
 source.loop= document.getElementById('loopCheckbox').checked
 playingBuffers.push(source)
 source.onended = function(){
   var newPlayingBuffers =[]
   for (i in playingBuffers){
     if (playingBuffers[i] != source){
       newPlayingBuffers.push(playingBuffers[i])
     }
   }
   playingBuffers = newPlayingBuffers
 }
}

function stopBuffers(){
  for (var i =0; i<playingBuffers.length; i++){
    // try
      playingBuffers[i].stop()
    // } catch (e){}
  }
  playingBuffers = [];
}

function playMicrophone(){
  microphoneNode.connect(globalGain)
  // microphoneNode.play();
}


function stopMicrophone(){
  microphoneNode.disconnect();
}

var whitenoiseBuffer



function start (callback,error){
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    ac = new AudioContext
    globalGain = ac.createGain();
    globalGain.gain.value = 1;
    globalGain.connect(ac.destination)
    whitenoiseBuffer = ac.createBuffer(2, ac.sampleRate * 7 , ac.sampleRate);
    // Fill the buffer with white noise;
    // just random values between -1.0 and 1.0
    for (var channel = 0; channel < whitenoiseBuffer.numberOfChannels; channel++) {
      // This gives us the actual array that contains the data
      var nowBuffering = whitenoiseBuffer.getChannelData(channel);
      for (var i = 0; i < whitenoiseBuffer.length; i++) {
        // Math.random() is in [0; 1.0]
        // audio needs to be in [-1.0; 1.0]
        nowBuffering[i] = Math.random() * 2 - 1;
      }
    }
    if (callback){callback()};
  } catch(e){
    console.log('Could not create audio context: '+e)
  }
  if(ac){
    console.log("Web Audio Context initialized")
  } else {
    console.log("Error initializing Web Audio Context")
    if (error){error()}
  }
}

function dbamp(db){
  return Math.pow(10,db/20)
}
function ampdb(amp){
  return 20*Math.log10(amp)
}

var sine;
function startSine(){
  var freq = document.getElementById('sineFreq').value;
  // for testing:
  sine = ac.createOscillator();
  sine.type = "sine"
  var preGain = ac.createGain()
  preGain.gain.value = dbamp(document.getElementById("sineDb").value);

  sine.connect(preGain).connect(globalGain);
  sine.frequency.value = freq;
  sine.start();
}


function range(start, end) {
  return Array(end - start + 1).fill().map((_, idx) => start + idx)
}

var timbral=[];
function startTimbral(){
  for (i in timbral){
    timbral[i].stop();
  }
  timbral = []
  var freq = document.getElementById('timbreFundamental').value;
  // for testing:
  for (var i =0; i<20;i++){
    if(i*freq<ac.sampleRate/2){
      var node = ac.createOscillator();
      node.type = "sine"
      var preGain = ac.createGain()
      preGain.gain.value = dbamp(-20+(-3*i));
      node.connect(preGain).connect(globalGain);
      node.frequency.value = i*freq
      timbral.push(node)
    } else{
      break;
    }
  }

  for (i in timbral){
    timbral[i].start();
  }
}

function stopTimbral(){
  for (i in timbral){
    timbral[i].stop();
  }
  timbral =[];
}

function stopSine(){
  sine.stop();
}

var whitenoise;
function startWhitenoise (){
  if(whitenoise){whitenoise.stop()}
  whitenoise = ac.createBufferSource();
  whitenoise.buffer = whitenoiseBuffer
  whitenoise.loop = true;

  var filter = ac.createBiquadFilter();
  filter.type = "bandpass"
  filter.Q.value = document.getElementById('filterQ').value;
  filter.frequency.value = document.getElementById('filterFreq').value;
  filter.gain.value = document.getElementById('filterGain').value;

  whitenoise.connect(filter).connect(globalGain);
  whitenoise.start();
}

function stopWhitenoise(){
  whitenoise.stop()
}

function max(arr){
  var m = arr[0]
  for (i in arr){
    if (m<arr[i]){m=arr[i]}
  }
  return m
}
function min(arr){
  var min = arr[0]
  for (i in arr){
    if (min>arr[i]){min=arr[i]}
  }
  return min
}

function soundTest (){
  if(ac==undefined){
    start();//.then(soundTest());
  }
  var osc = ac.createOscillator();
  var gain = ac.createGain();
  osc.type ="sine";
  osc.frequency.value = 440;
  gain.gain.value = 0.2;
  osc.connect(gain).connect(globalGain)
  osc.start()
  setTimeout(function(){osc.stop();osc.disconnect()},1000)
}
