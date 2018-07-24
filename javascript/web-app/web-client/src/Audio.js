import Meyda from "meyda"
import Utilities from "./Utilities.js"

var Audio = {}
var emptyMeanStdDev = {mean:undefined,stdDev:undefined}
var emptyWindowedValues = {long:emptyMeanStdDev,medium:emptyMeanStdDev,short:emptyMeanStdDev}


// sonification
Audio






//
Audio.ac = undefined
Audio.machineListening = false;
Audio.meydaAnalyzer = undefined
Audio.microphoneNode = undefined
Audio.meydaGain = undefined
Audio.config = {
  fftSize:512,
  longWindow:200,
  mediumWindow:50,
  shortWindow:10
}

Audio.features = {
  'amplitudeSpectrum':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1},
  'spectralCentroid':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:Audio.config.fftSize/2},
  'rms':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1},
  'loudness':{total:{vals:[],windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:100}},
  'spectralFlatness':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1}
}
Audio.params = {
  turbidity:{vals:[],canvas:undefined,showDiv:undefined},
  pitch:{vals:[],canvas:undefined,showDiv:undefined},
  strength:{vals:[],canvas:undefined,showDiv:undefined},
  clarity:{vals:[],canvas:undefined,showDiv:undefined},
  spectralCentroid:{vals:[],canvas:undefined,showDiv:undefined},
  rms:{vals:[],canvas:undefined,showDiv:undefined}
}

for (var i in Audio.params){
  Audio.params[i].canvas = document.getElementById(i+"Canvas")
}


Audio.startMachineListening = function (){
  // Try to init web audio things
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!Audio.ac){
      Audio.ac = new AudioContext
    }
    if(!Audio.meydaGain){
      Audio.meydaGain = Audio.ac.createGain();
      Audio.meydaGain.gain.value = 1;
    }
    Audio.machineListening = true;
  } catch(e){
    console.log('Could not create audio context: '+e)
    return
  }

  if(!Audio.meydaAnalyzer){
    // Meyda Options
    var options = {
      "audioContext":Audio.ac,
      "source":Audio.meydaGain,
      "bufferSize": Audio.config.fftSize,
      "featureExtractors": Object.keys(Audio.features),
      "callback": Audio.analyze
    }
    Audio.meydaAnalyzer = Meyda.createMeydaAnalyzer(options);
    console.log("Meyda Initialized")
  }

  if(!Audio.microphoneNode){
	   Audio.microphoneNode = Audio.ac.createMediaStreamSource(stream);
   } else{
     Audio.microphoneNode.disconnect();
   }

   Audio.microphoneNode.connect(Audio.meydaGain);
   Audio.meydaAnalyzer.start()
   Audio.draw();
}

Audio.stopMachineListening = function(){
  Audio.meydaAnalyzer.stop();
  Audio.microphoneNode.disconnect(Audio.meydaGain)
  Audio.machineListening = false;
}

Audio.analyze = function(data){

  for(i in Audio.features){
    if (i =="loudness"){
      Audio.features['loudness'].total.vals.push(data['loudness'].total)
      Audio.features['loudness'].total.vals = Audio.features['loudness'].total.vals.slice((-1)*longWindow);
      Audio.features['loudness'].total.windowedValues = Utilities.calculateWindowedValues(Audio.features['loudness'].total.vals,Audio.config.longWindow,Audio.config.mediumWindow,Audio.config.shortWindow)
    } else if (i == "amplitudeSpectrum"){
      Audio.features['amplitudeSpectrum'].vals = data['amplitudeSpectrum'];
    } else {
      Audio.features[i].vals.push(data[i])
      Audio.features [i].vals = Audio.features[i].vals.slice((-1)*longWindow)
      Audio.features[i].windowedValues = Utilities.calculateWindowedValues(Audio.features[i].vals,Audio.config.longWindow,Audio.config.mediumWindow,Audio.config.shortWindow)
    }
  }

  Audio.params.pitch.vals.push(calculatePitch(data, Audio.features));
  Audio.params.pitch.vals = Audio.params.pitch.vals.slice(-1*Audio.config.longWindow);

  Audio.params.strength.vals.push(calculateStrength(data, Audio.features))
  Audio.params.strength.vals = Audio.params.strength.vals.slice(-1*Audio.config.longWindow)

  Audio.params.turbidity.vals.push(calculateTurbidity(data, Audio.features));
  Audio.params.turbidity.vals = Audio.params.turbidity.vals.slice(-1*Audio.config.longWindow);

  Audio.params.clarity.vals.push(calculateClarity(data, Audio.features))
  Audio.params.clarity.vals = Audio.params.clarity.vals.slice(-1*(Audio.config.longWindow));

  Audio.params.spectralCentroid.vals.push(data['spectralCentroid']/Audio.config.fftSize);
  Audio.params.spectralCentroid.vals = Audio.params.spectralCentroid.vals.slice(-1*(Audio.config.longWindow))

  Audio.params.rms.vals.push(data['rms']*8000);
  Audio.params.rms.vals = Audio.params.rms.vals.slice(-1*(Audio.config.longWindow))
}

// Visualizations/drawing
Audio.draw = function(){
  window.requestAnimationFrame(draw);
  for(i in Audio.params){
    drawArrayOnCanvas(Audio.params[i].vals, Audio.params[i].canvas, 0, 1)
  }
}


Audio.calculatePitch = function (features, nonGraphables){
  // var m = mean(features['loudness'].specific)
  // var maximum = max(features['loudness'].specific)
  var m = mean(features['amplitudeSpectrum'])
  var maximum = max(features['amplitudeSpectrum'])
  // TODO - factor in spectral flatness

  var r = clip((maximum/m)/128)
  return r
}


// TODO - peak/gust detections
Audio.calculateTurbidity = function (features, nonGraphables){
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
  var r = 0.6*powerTurbidity+0.4*spectralTurbidity;
  return r
}



// Lower frequency+higher volume -> greater 'strength'
Audio.calculateStrength = function (features, nonGraphables){
  var centroid, loudnessTotal;
  if(nonGraphables){
    // how to normalize this accross devices - some will be recording louder than others?
    // calibration period?
    loudnessTotal = nonGraphables['loudnessTotal'].windowedValues
    centroid = nonGraphables['spectralCentroid'].windowedValues;
  } else {
    loudnessTotal = createUniformWindowedObj(mean(features['loudness'].total),Utilities.standardDeviation(features['loudness'].total))
  }
  loudness = clip((loudnessTotal.long.mean+loudnessTotal.medium.mean+loudnessTotal.short.mean)/3/50,0,1)
  var normalizedCentroid = clip(scaleCentroidStrength(((centroid.long.mean+centroid.medium.mean+centroid.short.mean)/3)/(fftSize/2)),0,1)
  return normalizedCentroid*0.2+0.8*loudness;
}


Audio.calculateClarity = function(features, nonGraphables){
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

export default Audio;
