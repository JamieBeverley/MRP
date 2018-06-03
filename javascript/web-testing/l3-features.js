
function calculatePitch(features, nonGraphables){
  // var m = mean(features['loudness'].specific)
  // var maximum = max(features['loudness'].specific)
  var m = mean(features['amplitudeSpectrum'])
  var maximum = max(features['amplitudeSpectrum'])
  // TODO - factor in spectral flatness

  var r = clip((maximum/m)/128)
  return r
}


// TODO - peak/gust detections
function calculateTurbidity(features, nonGraphables){
  // var centroid = nonGraphables['spectralCentroid']
  // var centroidComponent = centroid.long.variance
  var spectralTurbidity, powerTurbidity;

  var centroid, rms;

  if(nonGraphables==undefined){
      var cMean = mean(features['spectralCentroid'])
      var cStdDev = stdDev(features['spectralCentroid'])
      centroid = createUniformWindowedObj(cMean,cStdDev)
      var rMean = mean(features['rms'])
      var rStdDev = stdDev(features['rms'])
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
function calculateStrength(features, nonGraphables){
  var centroid, loudnessTotal;
  if(nonGraphables){
    // how to normalize this accross devices - some will be recording louder than others?
    // calibration period?
    loudnessTotal = nonGraphables['loudnessTotal'].windowedValues
    // var loudness = clip(Math.sqrt((loudnessTotal.long.mean+loudnessTotal.medium.mean+loudnessTotal.short.mean)/3/50),0,1)
    centroid = nonGraphables['spectralCentroid'].windowedValues;
  } else {
    loudnessTotal = createUniformWindowedObj(mean(features['loudness'].total),stdDev(features['loudness'].total))
  }
  loudness = clip((loudnessTotal.long.mean+loudnessTotal.medium.mean+loudnessTotal.short.mean)/3/50,0,1)

  var normalizedCentroid = clip(scaleCentroidStrength(((centroid.long.mean+centroid.medium.mean+centroid.short.mean)/3)/(fftSize/2)),0,1)
  // centroid = clip(scaleCentroidStrength(normalizedCentroid),0,1);
  return normalizedCentroid*0.2+0.8*loudness;
}


function calculateClarity(features, nonGraphables){
  var centroid, spectralFlatness, rms

  if (nonGraphables){
    centroid = nonGraphables['spectralCentroid'].windowedValues
    flatness = nonGraphables['spectralFlatness'].windowedValues;
    rms = nonGraphables['rms'].windowedValues
  } else {
    centroid = createUniformWindowedObj(mean(features['spectralCentroid']), stdDev(features['spectralCentroid']))
    rms = createUniformWindowedObj(mean(features['rms']),stdDev(features['rms']))
    flatness = createUniformWindowedObj(mean(features['spectralFlatness']), stdDev(features['spectralFlatness']))
  }


  var short = scaleSpectralFlatness(flatness.short.mean)
  var long = scaleSpectralFlatness(flatness.long.mean)
  var medium = scaleSpectralFlatness(flatness.medium.mean)
  var lowness = Math.sqrt((centroid.long.mean+centroid.medium.mean+centroid.short.mean)/3/(fftSize/2))
  var spectralClarity = (1-clip((long+short+medium)/3))*lowness


  // var spectralClarity;
  // var centroid = nonGraphables['spectralCentroid'].windowedValues;
  // var rms = nonGraphables['rms'].windowedValues;
  // spectralClarity = 1-clip(scaleSpectralTurbidity((centroid.long.stdDev/3+centroid.medium.stdDev/3+centroid.short.stdDev/3)/20),0,1);

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




// Utilities....

function mean (l){
  var x = 0;
  for (i in l){
    x+=l[i]
  }
  return x/l.length
}

function stdDev (l){
  var m = mean(l)
  var x=0;
  for (i in l){
    x += Math.pow(l[i]-m,2);
  }
  return Math.sqrt(x/(l.length-1))
}
