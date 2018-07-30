import Meyda from "meyda"
import Utilities from "./Utilities.js"

var Audio = {}
Audio.buffers = {}
Audio.samplesUrl = window.location.pathname.substring(0,window.location.pathname.lastIndexOf("/"))+"/corpuses/808/_grains/";

Audio.corpus = undefined
Audio.ac = undefined;

// sonification
Audio.sonificationGain = undefined


Audio.init = function (){
  Audio.loadCorpus("corpuses/808/_grains/_grains.json");
  try{
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    Audio.ac = new AudioContext();
    Audio.sonificationGain = Audio.ac.createGain();

    console.log("Web Audio initialized")
  } catch (e){
    alert("Web Audio Not supported by your browser, please try using a recent version of Firefox or Google Chrome")
  }
}

Audio.loadCorpus = function(url){
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "json"
  request.onload = function() {
     if(request.readyState != 4) throw Error("readyState != 4 in callback of loadAndPlayScore");
     if(request.status != 200) throw Error("status != 200 in callback of loadAndPlayScore");
     if(request.response == null) throw Error("JSON response null in callback of loadAndPlayScore");
     console.log("loaded corpus: " + url);
     Audio.corpus = this.response
     console.log(Audio.corpus)
 }
  request.send();
}



Audio.selectAndPlayGrain = function (params){
  var minDist = Infinity;
  var match = undefined;
  for (var i in Audio.corpus){
    var grain = Audio.corpus[i];
    var dist = 0;
    for(var j in Audio.params){
      dist = dist+Math.abs(params[j]-grain[j])
    }
    if(dist < minDist){
      minDist = dist;
      match = grain;
      grain.url = i;
    }
  }
  if(match == undefined){
    console.log("WARNING - undefined match (uhoh)");
  }
  // TODO - corpus analysis should probably yield relative paths rather than absolute ones...
  match.url = match.url.substring(match.url.indexOf("corpuses"));
  Audio.loadAndPlayBuffer(match.url);
}

Audio.loadAndPlayBuffer = function (url){
  if(Audio.buffers[url]){
    var absn = Audio.ac.createBufferSource();
    absn.buffer = Audio.buffers[url];
    absn.connect(Audio.sonificationGain);
    absn.start();
  } else{
    var request = new XMLHttpRequest();
    try {
      request.open('GET',url,true);
      request.responseType = 'arraybuffer';

      request.onload = function() {
        Audio.ac.decodeAudioData(request.response, function(x) {
          var absn = Audio.ac.createBufferSource();
          absn.buffer = x;
          absn.connect(Audio.sonificationGain);
          absn.start();
          Audio.buffers[url] = x
        },
        function(err) {
          console.log("error decoding sample " + url);
        }
      );
      }

      request.send();
    } catch (e){
      console.log("could not load and decode audio buffer")
    }
  }
}

Audio.mute = function (){
  Audio.sonificationGain.disconnect(Audio.ac);
};

Audio.unmute = function(){
  Audio.sonificationGain.connect(Audio.ac)
};

//
Audio.meydaAnalyzer = undefined
Audio.microphoneNode = undefined
Audio.meydaGain = undefined
Audio.config = {
  fftSize:512,
  longWindow:200,
  mediumWindow:50,
  shortWindow:10
}

var emptyMeanStdDev = {mean:undefined,stdDev:undefined}
var emptyWindowedValues = {long:emptyMeanStdDev,medium:emptyMeanStdDev,short:emptyMeanStdDev}

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
    if(!Audio.ac){
      Audio.init();
    }
    if(!Audio.meydaGain){
      Audio.meydaGain = Audio.ac.createGain();
      Audio.meydaGain.gain.value = 1;
    }
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
    navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(function(stream){
  			Audio.microphoneNode = Audio.ac.createMediaStreamSource(stream);
  			Audio.microphoneNode.connect(Audio.meydaGain);
  			Audio.meydaAnalyzer.start()
        window.requestAnimationFrame(Audio.draw);
        console.log("Meyda started")
    });
   } else{
     Audio.microphoneNode.disconnect();
     Audio.microphoneNode.connect(Audio.meydaGain);
     Audio.meydaAnalyzer.start()
    window.requestAnimationFrame(Audio.draw);
     console.log("Meyda started")
   }
}

Audio.stopMachineListening = function(){
  Audio.meydaAnalyzer.stop();
  Audio.microphoneNode.disconnect(Audio.meydaGain)
}

Audio.analyze = function(data){

  for(var i in Audio.features){
    if (i =="loudness"){
      Audio.features['loudness'].total.vals.push(data['loudness'].total)
      Audio.features['loudness'].total.vals = Audio.features['loudness'].total.vals.slice((-1)*Audio.config.longWindow);
      Audio.features['loudness'].total.windowedValues = Utilities.calculateWindowedValues(Audio.features['loudness'].total.vals,Audio.config.longWindow,Audio.config.mediumWindow,Audio.config.shortWindow)
    } else if (i == "amplitudeSpectrum"){
      Audio.features['amplitudeSpectrum'].vals = data['amplitudeSpectrum'];
    } else {
      Audio.features[i].vals.push(data[i])
      Audio.features [i].vals = Audio.features[i].vals.slice((-1)*Audio.config.longWindow)
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
    window.requestAnimationFrame(Audio.draw);
  for(var i in Audio.params){
    Utilities.drawArrayOnCanvas(Audio.params[i].vals, Audio.params[i].canvas, 0, 1)
  }
}


function calculatePitch  (features, nonGraphables){
  // var m = mean(features['loudness'].specific)
  // var maximum = max(features['loudness'].specific)
  var m = Utilities.mean(features['amplitudeSpectrum'])
  var maximum = Utilities.max(features['amplitudeSpectrum'])
  // TODO - factor in spectral flatness

  var r = Utilities.clip((maximum/m)/128)
  return r
}


// TODO - peak/gust detections
function calculateTurbidity (features, nonGraphables){
  var spectralTurbidity, powerTurbidity;
  var centroid, rms;

  if(nonGraphables==undefined){
      var cMean = Utilities.mean(features['spectralCentroid'])
      var cStdDev = Utilities.standardDeviationdDev(features['spectralCentroid'])
      centroid = createUniformWindowedObj(cMean,cStdDev)
      var rMean = Utilities.mean(features['rms'])
      var rStdDev = Utilities.standardDeviation(features['rms'])
      rms = createUniformWindowedObj(rMean,rStdDev)
  } else{
    centroid = nonGraphables['spectralCentroid'].windowedValues;
    rms = nonGraphables['rms'].windowedValues;
  }
  spectralTurbidity = Utilities.clip(scaleSpectralTurbidity((centroid.long.stdDev/3+centroid.medium.stdDev/3+centroid.short.stdDev/3)/20),0,1);
  powerTurbidity = Math.sqrt((rms.long.stdDev/rms.long.mean/3+rms.medium.stdDev/rms.medium.mean/3+rms.short.stdDev/rms.short.mean/3)/1.05);
  var r = 0.6*powerTurbidity+0.4*spectralTurbidity;
  return r
}



// Lower frequency+higher volume -> greater 'strength'
function calculateStrength (features, nonGraphables){
  var centroid, loudnessTotal, loudness;
  if(nonGraphables){
    // how to normalize this accross devices - some will be recording louder than others?
    // calibration period?
    loudnessTotal = nonGraphables['loudness'].total.windowedValues
    centroid = nonGraphables['spectralCentroid'].windowedValues;
  } else {
    loudnessTotal = createUniformWindowedObj(Utilities.mean(features['loudness'].total),Utilities.standardDeviation(features['loudness'].total))
  }
  loudness = Utilities.clip((loudnessTotal.long.mean+loudnessTotal.medium.mean+loudnessTotal.short.mean)/3/50,0,1)
  var normalizedCentroid = Utilities.clip(scaleCentroidStrength(((centroid.long.mean+centroid.medium.mean+centroid.short.mean)/3)/(Audio.config.fftSize/2)),0,1)
  return normalizedCentroid*0.2+0.8*loudness;
}


function calculateClarity (features, nonGraphables){
  var centroid, spectralFlatness, rms,flatness;

  if (nonGraphables){
    centroid = nonGraphables['spectralCentroid'].windowedValues
    flatness = nonGraphables['spectralFlatness'].windowedValues;
    rms = nonGraphables['rms'].windowedValues
  } else {
    centroid = createUniformWindowedObj(Utilities.mean(features['spectralCentroid']), Utilities.standardDeviation(features['spectralCentroid']))
    rms = createUniformWindowedObj(Utilities.mean(features['rms']),Utilities.standardDeviation(features['rms']))
    flatness = createUniformWindowedObj(Utilities.mean(features['spectralFlatness']), Utilities.standardDeviation(features['spectralFlatness']))
  }
  var short = scaleSpectralFlatness(flatness.short.mean)
  var long = scaleSpectralFlatness(flatness.long.mean)
  var medium = scaleSpectralFlatness(flatness.medium.mean)
  var lowness = Math.sqrt((centroid.long.mean+centroid.medium.mean+centroid.short.mean)/3/(Audio.config.fftSize/2))
  var spectralClarity = (1-Utilities.clip((long+short+medium)/3))*lowness
  var levelClarity;
  levelClarity = 1-Utilities.clip(Math.sqrt((rms.long.stdDev/rms.long.mean/3+rms.medium.stdDev/rms.medium.mean/3+rms.short.stdDev/rms.short.mean/3)/1.05));
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
  return 1/(1+Math.pow(Math.E,-10*Utilities.clip(x,0,1)+5))
}


function createUniformWindowedObj(mean,stdDev){
  return {long:{mean:mean,stdDev:stdDev},medium:{mean:mean,stdDev:stdDev},short:{mean:mean,stdDev:stdDev}}
}

export default Audio;
