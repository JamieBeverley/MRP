var ws;
try{
	ws = new WebSocket("ws://"+location.hostname+":"+location.port, 'echo-protocol');
} catch (e){
	console.log("no WebSocket connection")
}
var ac=undefined;
var globalGain
var coordinates;
var meydaAnalyzer
var fftSize = 512;
var sendCounter = 0;
var microphoneNode;
var longWindow = 200;
var mediumWindow = 50;
var shortWindow = 10;
var consented = false;

var emptyMeanStdDev = {mean:undefined,stdDev:undefined}
var emptyWindowedValues = {long:emptyMeanStdDev,medium:emptyMeanStdDev,short:emptyMeanStdDev}


var features = {
  'amplitudeSpectrum':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1},
  'spectralCentroid':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:fftSize/2},
  'rms':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1},
  'loudness':{total:{vals:[],windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:100}},
  'spectralFlatness':{vals:[], windowedValues:emptyWindowedValues,expectedMin:0,expectedMax:1}
}

var params = {
  turbidity:{vals:[],canvas:undefined,showDiv:undefined},
  pitch:{vals:[],canvas:undefined,showDiv:undefined},
  strength:{vals:[],canvas:undefined,showDiv:undefined},
  clarity:{vals:[],canvas:undefined,showDiv:undefined},
  spectralCentroid:{vals:[],canvas:undefined,showDiv:undefined},
  rms:{vals:[],canvas:undefined,showDiv:undefined}
}

for (i in params){
  params[i].canvas = document.getElementById(i+"Canvas")
}



function start(){
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    ac = new AudioContext
    globalGain = ac.createGain();
    globalGain.gain.value = 1;
    globalGain.connect(ac.destination)
    whitenoiseBuffer = ac.createBuffer(2, ac.sampleRate * 7 , ac.sampleRate);

		toggleShare();

    for (var channel = 0; channel < whitenoiseBuffer.numberOfChannels; channel++) {
      var nowBuffering = whitenoiseBuffer.getChannelData(channel);
      for (var i = 0; i < whitenoiseBuffer.length; i++) {
        nowBuffering[i] = Math.random() * 2 - 1;
      }
    }
  } catch(e){
    console.log('Could not create audio context: '+e)
  }

  var options = {
    "audioContext":ac,
    "source":globalGain,
    "bufferSize": fftSize,
    "featureExtractors": Object.keys(features),
    "callback": analyze
  }
  meydaAnalyzer = Meyda.createMeydaAnalyzer(options);
  console.log("Meyda Initialized "+ac)

	navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(function(stream){
			microphoneNode = ac.createMediaStreamSource(stream);
			microphoneNode.connect(globalGain);
			meydaAnalyzer.start()
	})
  draw();
  setInterval(sendData,100)
}

function analyze(data){
	// everyXPrintY(20,data);
  sendCounter++;
  for(i in features){
    if (i =="loudness"){
      features['loudness'].total.vals.push(data['loudness'].total)
      features['loudness'].total.vals = features['loudness'].total.vals.slice((-1)*longWindow);
      features['loudness'].total.windowedValues = calculateWindowedValues(features['loudness'].total.vals,longWindow,mediumWindow,shortWindow)
    } else if (i == "amplitudeSpectrum"){
      features['amplitudeSpectrum'].vals = data['amplitudeSpectrum'];
    } else {
      features[i].vals.push(data[i])
      features [i].vals = features[i].vals.slice((-1)*longWindow)
      features[i].windowedValues = calculateWindowedValues(features[i].vals,longWindow,mediumWindow,shortWindow)
    }
  }
  // everyXPrintY(20,features)

  params.pitch.vals.push(calculatePitch(data, features));
  params.pitch.vals = params.pitch.vals.slice(-1*longWindow);

  params.strength.vals.push(calculateStrength(data, features))
  params.strength.vals = params.strength.vals.slice(-1*longWindow)

  params.turbidity.vals.push(calculateTurbidity(data, features));
  params.turbidity.vals = params.turbidity.vals.slice(-1*longWindow);

  params.clarity.vals.push(calculateClarity(data, features))
  params.clarity.vals = params.clarity.vals.slice(-1*(longWindow));

  params.spectralCentroid.vals.push(data['spectralCentroid']/fftSize);
  params.spectralCentroid.vals = params.spectralCentroid.vals.slice(-1*(longWindow))

  params.rms.vals.push(data['rms']*8000);
  params.rms.vals = params.rms.vals.slice(-1*(longWindow))
}

// Visualizations/drawing
function draw(){
  window.requestAnimationFrame(draw);
  for(i in params){
    drawArrayOnCanvas(params[i].vals, params[i].canvas, 0, 1)
  }
}

function toggleShare(){
	if(!consented){
		navigator.geolocation.getCurrentPosition(function(pos){
			var coordinates = [pos.coords.longitude, pos.coords.latitude];
			var msg = {type:"consented",coordinates:coordinates}
			try{
				ws.send(JSON.stringify(msg))
				console.log("position sent")
				consented = true;
			} catch (e){
				console.log("WARNING: could not send values msg over ws")
			}
		})
	} else{
		var msg = {type:"unconsented"}
		try{
			ws.send(JSON.stringify(msg))
			consented = false;
		} catch (e){
			console.log("couldn't send unconsent message: "+e)
		}
	}
}



// Audio stuff
function createMicrophoneNode(){
  navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(function(stream){
      microphoneNode = ac.createMediaStreamSource(stream);
  })
}

function playMicrophone(){
  microphoneNode.connect(globalGain)
}

function stopMicrophone(){
  microphoneNode.disconnect();
}

// Sending Data over WebSocket
function sendData(){
  var msg = {}
  for (i in params){
    var a = mean(params[i].vals.slice(sendCounter*(-1)));
    if(isNaN(a)){
      console.log("WARNING value for " + i + " is undefined.")
      return // don't send anything if one of the values is undefined
    }
    msg[i] = mean(params[i].vals.slice(sendCounter*(-1)))
  }
  msg.type = "params"
  try{
    ws.send(JSON.stringify(msg))
  } catch (e){
    console.log("WARNING: could not send values msg over ws")
  }
  sendCounter=0;
}



function sendNewRemote(pos, tries){
	if(tries >=3){
		alert("There was an error determining your location, please ensure location services are enabled or feel free to listen without sending sound features.")
		return;
	}
	if (pos){
		if(ws){
			var msg = {
				type: "newRemote",
				coordinates: pos,
			};
			ws.send(JSON.stringify(msg))
		} else{
			console.log("WARNING ws not initialized, couldn't send new remtoe, trying again in 2 sec");
			setTimeout(sendNewRemote(pos,tries+1), 2000);
		}
	} else {
		console.log("WARNING coordinates could not be determined, trying to get coordinates again...");
		navigator.geolocation.getCurrentPosition(function(x){sendNewRemote(x,tries+1)});
	}
}


if (ws){
  ws.addEventListener('message', function(message){
    var msg;
    try {
      msg = JSON.parse(message)
    } catch (e){
      console.log("WARNING: could not parse ws JSON message")
    }

    if (msg.type == "params"){

			// TODO - do something here

    } else if (msg.type == "newRemote"){

      var remote = new Remote(msg.uid, msg.coordinates)
      audienceSource.addFeature(remote.feature);

    } else if ("removeRemote"){
      try {
        audienceSource.removeFeature(Remote.remotes[msg.uid].feature);
        Remote.remotes[msg.uid] = undefined
      } catch (e){
        console.log("WARNING: Error deleting remote <"+msg.uid+"> :" +e)
      }
    } else {
        console.log("WARNING: WS message with unknown type <"+msg.type+"> received.")
    }
  })
}
