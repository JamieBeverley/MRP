import Meyda from "meyda"
import Utilities from "./Utilities.js"

var Listen = {}

var emptyMeanStdDev = {mean:undefined,stdDev:undefined}
var emptyWindowedValues = {long:emptyMeanStdDev,medium:emptyMeanStdDev,short:emptyMeanStdDev}


Listen.ac = undefined
Listen.meydaAnalyzer = undefined
Listen.microphoneNode = undefined
Listen.meydaGain = undefined
Listen.config = {
  fftSize:512,
  longWindow:200,
  mediumWindow:50,
  shortWindow:10
}

Listen.features = {
  'amplitudeSpectrum':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1},
  'spectralCentroid':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:Listen.config.fftSize/2},
  'rms':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1},
  'loudness':{total:{vals:[],windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:100}},
  'spectralFlatness':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1}
}

Listen.params = {
  turbidity:{vals:[],canvas:undefined,showDiv:undefined},
  pitch:{vals:[],canvas:undefined,showDiv:undefined},
  strength:{vals:[],canvas:undefined,showDiv:undefined},
  clarity:{vals:[],canvas:undefined,showDiv:undefined},
  spectralCentroid:{vals:[],canvas:undefined,showDiv:undefined},
  rms:{vals:[],canvas:undefined,showDiv:undefined}
}

for (var i in Listen.params){
  Listen.params[i].canvas = document.getElementById(i+"Canvas")
}

Listen.machineListening = false;

Listen.start = function (){
  // Try to init web audio things
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    Listen.ac = new AudioContext
    Listen.meydaGain = Listen.ac.createGain();
    Listen.meydaGain.gain.value = 1;
    Listen.meydaGain.connect(Listen.ac.destination)
    Listen.machineListening = true;
  } catch(e){
    console.log('Could not create audio context: '+e)
    return
  }

  // Meyda Options
  var options = {
    "audioContext":Listen.ac,
    "source":Listen.meydaGain,
    "bufferSize": Listen.config.fftSize,
    "featureExtractors": Object.keys(Listen.features),
    "callback": Listen.analyze
  }
  Listen.meydaAnalyzer = Meyda.createMeydaAnalyzer(options);
  console.log("Meyda Initialized")

  // Start listening
	Listen.microphoneNode = Listen.ac.createMediaStreamSource(stream);
	Listen.microphoneNode.connect(Listen.meydaGain);
	Listen.meydaAnalyzer.start()
  Listen.draw();
}

Listen.stop = function(){
  Listen.meydaAnalyzer.stop();
  Listen.microphoneNode.disconnect(Listen.meydaGain)
  Listen.machineListening = false;
}

Listen.analyze = function(data){

  for(i in Listen.features){
    if (i =="loudness"){
      Listen.features['loudness'].total.vals.push(data['loudness'].total)
      Listen.features['loudness'].total.vals = Listen.features['loudness'].total.vals.slice((-1)*longWindow);
      Listen.features['loudness'].total.windowedValues = Utilities.calculateWindowedValues(Listen.features['loudness'].total.vals,Listen.config.longWindow,Listen.config.mediumWindow,Listen.config.shortWindow)
    } else if (i == "amplitudeSpectrum"){
      Listen.features['amplitudeSpectrum'].vals = data['amplitudeSpectrum'];
    } else {
      Listen.features[i].vals.push(data[i])
      Listen.features [i].vals = Listen.features[i].vals.slice((-1)*longWindow)
      Listen.features[i].windowedValues = Utilities.calculateWindowedValues(Listen.features[i].vals,Listen.config.longWindow,Listen.config.mediumWindow,Listen.config.shortWindow)
    }
  }

  Listen.params.pitch.vals.push(calculatePitch(data, Listen.features));
  Listen.params.pitch.vals = Listen.params.pitch.vals.slice(-1*Listen.config.longWindow);

  Listen.params.strength.vals.push(calculateStrength(data, Listen.features))
  Listen.params.strength.vals = Listen.params.strength.vals.slice(-1*Listen.config.longWindow)

  Listen.params.turbidity.vals.push(calculateTurbidity(data, Listen.features));
  Listen.params.turbidity.vals = Listen.params.turbidity.vals.slice(-1*Listen.config.longWindow);

  Listen.params.clarity.vals.push(calculateClarity(data, Listen.features))
  Listen.params.clarity.vals = Listen.params.clarity.vals.slice(-1*(Listen.config.longWindow));

  Listen.params.spectralCentroid.vals.push(data['spectralCentroid']/Listen.config.fftSize);
  Listen.params.spectralCentroid.vals = Listen.params.spectralCentroid.vals.slice(-1*(Listen.config.longWindow))

  Listen.params.rms.vals.push(data['rms']*8000);
  Listen.params.rms.vals = Listen.params.rms.vals.slice(-1*(Listen.config.longWindow))
}

// Visualizations/drawing
Listen.draw = function(){
  window.requestAnimationFrame(draw);
  for(i in Listen.params){
    drawArrayOnCanvas(Listen.params[i].vals, Listen.params[i].canvas, 0, 1)
  }
}


Listen.calculatePitch = function (features, nonGraphables){
  // var m = mean(features['loudness'].specific)
  // var maximum = max(features['loudness'].specific)
  var m = mean(features['amplitudeSpectrum'])
  var maximum = max(features['amplitudeSpectrum'])
  // TODO - factor in spectral flatness

  var r = clip((maximum/m)/128)
  return r
}


// TODO - peak/gust detections
Listen.calculateTurbidity = function (features, nonGraphables){
  // var centroid = nonGraphables['spectralCentroid']
  // var centroidComponent = centroid.long.variance
  var spectralTurbidity, powerTurbidity;

  var centroid, rms;

  if(nonGraphables==undefined){
      var cMean = mean(features['spectralCentroid'])
      var cStdDev = Utilities.standardDeviationdDev(features['spectralCentroid'])
      centroid = createUniformWindowedObj(cMean,cStdDev)
      var rMean = mean(features['rms'])
      var rStdDev = Utilities.standardDeviation(features['rms'])
      rms = createUniformWindowedObj(rMean,rStdDev)
  } else{
    centroid = nonGraphables['spectralCentroid'].windowedValues;
    rms = nonGraphables['rms'].windowedValues;
  }

  spectralTurbidity = clip(scaleSpectralTurbidity((centroid.long.stdDev/3+centroid.medium.stdDev/3+centroid.short.stdDev/3)/20),0,1);
  powerTurbidity = Math.sqrt((rms.long.stdDev/rms.long.mean/3+rms.medium.stdDev/rms.medium.mean/3+rms.short.stdDev/rms.short.mean/3)/1.05);
  // powerTurbidity = rms.long.stdDev/rms.long.mean/0.7/3 //0.7 just a scaling thing - empirically found that the max it would ever produce is 0.7
  // powerTurbidity = powerTurbidity + rms.medium.stdDev/rms.medium.mean/0.7/3;
  // powerTurbidity = clip(powerTurbidity+rms.short.stdDev/rms.short.mean/0.7/3,0,1);

  var r = 0.6*powerTurbidity+0.4*spectralTurbidity;

  return r

}



// Lower frequency+higher volume -> greater 'strength'
Listen.calculateStrength = function (features, nonGraphables){
  var centroid, loudnessTotal;
  if(nonGraphables){
    // how to normalize this accross devices - some will be recording louder than others?
    // calibration period?
    loudnessTotal = nonGraphables['loudnessTotal'].windowedValues
    // var loudness = clip(Math.sqrt((loudnessTotal.long.mean+loudnessTotal.medium.mean+loudnessTotal.short.mean)/3/50),0,1)
    centroid = nonGraphables['spectralCentroid'].windowedValues;
  } else {
    loudnessTotal = createUniformWindowedObj(mean(features['loudness'].total),Utilities.standardDeviation(features['loudness'].total))
  }
  loudness = clip((loudnessTotal.long.mean+loudnessTotal.medium.mean+loudnessTotal.short.mean)/3/50,0,1)

  var normalizedCentroid = clip(scaleCentroidStrength(((centroid.long.mean+centroid.medium.mean+centroid.short.mean)/3)/(fftSize/2)),0,1)
  // centroid = clip(scaleCentroidStrength(normalizedCentroid),0,1);
  return normalizedCentroid*0.2+0.8*loudness;
}


Listen.calculateClarity = function(features, nonGraphables){
  var centroid, spectralFlatness, rms

  if (nonGraphables){
    centroid = nonGraphables['spectralCentroid'].windowedValues
    flatness = nonGraphables['spectralFlatness'].windowedValues;
    rms = nonGraphables['rms'].windowedValues
  } else {
    centroid = createUniformWindowedObj(mean(features['spectralCentroid']), Utilities.standardDeviation(features['spectralCentroid']))
    rms = createUniformWindowedObj(mean(features['rms']),Utilities.standardDeviation(features['rms']))
    flatness = createUniformWindowedObj(mean(features['spectralFlatness']), Utilities.standardDeviation(features['spectralFlatness']))
  }

  var short = scaleSpectralFlatness(flatness.short.mean)
  var long = scaleSpectralFlatness(flatness.long.mean)
  var medium = scaleSpectralFlatness(flatness.medium.mean)
  var lowness = Math.sqrt((centroid.long.mean+centroid.medium.mean+centroid.short.mean)/3/(fftSize/2))
  var spectralClarity = (1-clip((long+short+medium)/3))*lowness
  var levelClarity;
  levelClarity = 1-clip(Math.sqrt((rms.long.stdDev/rms.long.mean/3+rms.medium.stdDev/rms.medium.mean/3+rms.short.stdDev/rms.short.mean/3)/1.05));
  var r = spectralClarity*0.7+levelClarity*0.3;

  return r


}

function scaleSpectralFlatness(x){
  return (1/(1+Math.pow(Math.E,(-10)*x+5)))
}

function scaleCentroidStrength(x){
  return 1/(1+Math.pow(Math.E,(-10)*x+5))
}

// crudely mapped sigmoid...
function scaleSpectralTurbidity(x){
  return 1/(1+Math.pow(Math.E,-10*clip(x,0,1)+5))
}


function createUniformWindowedObj(mean,stdDev){
  return {long:{mean:mean,stdDev:stdDev},medium:{mean:mean,stdDev:stdDev},short:{mean:mean,stdDev:stdDev}}
}

export default Listen;
