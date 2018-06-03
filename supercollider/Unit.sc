Unit {
	var <>pitch;
	var <>turbidity;
	var <>strength;
	var <>clarity;
	var <>spectralCentroid;
	var <>rms;
	var <>path;
	var <>buffer;
	classvar <>corpus; // a dictionary w/ reference to different corpuses of units (string -> [Unit])

	*initClass{
		corpus = Dictionary.new();
	}

	*new{
		|pitch=0,turbidity=0,strength=0,clarity=0,spectralCentroid=0,rms=0,path,buffer|

		^super.new.init(pitch,turbidity,strength,clarity,spectralCentroid,rms,path,buffer);
	}

	init{
		|pitch=0,turbidity=0,strength=0,clarity=0,centroid=0,rms=0,path,buffer|
		this.pitch=pitch;
		this.turbidity=turbidity;
		this.strength=strength;
		this.clarity=clarity;
		this.spectralCentroid=centroid;
		this.rms=rms;
		this.path=path;
		this.buffer=buffer;
	}

	*euclideanDistance {
		|u,v|
		^sqrt(pow(u.pitch-v.pitch,2)+pow(u.turbidity-v.turbidity,2)+pow(u.strength-v.strength,2)+pow(u.clarity-v.clarity,2)+pow(u.spectralCentroid-v.spectralCentroid,2)+pow(u.rms-v.rms,2));
	}

	postln{
		("pitch: "+this.pitch).postln;
		("turbidity: "+this.turbidity).postln;
		("strength: "+this.strength).postln;
		("clarity: "+this.clarity).postln;
		("spectralCentroid"+this.spectralCentroid).postln;
		("rms"+this.rms).postln;
	}

	play{
		|out=0, amp=1|
		{
			var a = PlayBuf.ar(this.buffer.numChannels,bufnum:buffer,doneAction:2);
			var env = EnvGen.ar(Env.new([0,1,1,0],[0.01,this.buffer.duration-0.02,0.01]));
			a = (0!(out))++[a]++(0!(Server.default.options.numOutputBusChannels-1-out));
			Out.ar(~outBus,a*env*amp);
		}.play;
	}

	*midiTest {
		|corpusPath="c://Users/jamie/AppData/Local/SuperCollider/Extensions/supercollider-extensions/MRP/supercollider/Units/high-level-features/testing2.json",corpusID|

		var units;
		var pitch=0;
		var turbidity=0;
		var strength=0;
		var clarity = 0;
		var spectralCentroid=0;
		var rms=0;
		var out =0;
		var amp =1;

		if(corpusID.isNil,{corpusID=corpusPath});

		MIDIClient.init;
		MIDIIn.connectAll;

		Server.default.waitForBoot({
			Unit.readUnitsFromJSON(corpusPath,corpusID);
			MIDIdef.cc(\concatSynthTest,{
				|val,nm|
				switch(nm,
					1,{
						pitch=val/127;
						("Pitch: "+pitch).postln;},
					2,{
						turbidity=val/127;
						("Turbidity: "+turbidity).postln;
					},
					3,{
						strength=val/127;
						("Strength: "+strength).postln;
					},
					4,{
						clarity=val/127;
						("Clarity: "+clarity).postln;
					},
					5,{
						spectralCentroid=val/127;
						("SpectralCentroid: "+spectralCentroid).postln;
					},
					6,{
						rms=val/127;
						("RMS: "+rms).postln;
					},
					7,{out = (val*Server.default.options.numOutputBusChannels/127).floor;out.postln;},
					8,{amp = val/127}
				);
				Unit.findClosestUnit(Unit(pitch,turbidity,strength,clarity,spectralCentroid,rms),list:Unit.corpus[corpusID]).play(out, amp);
				// [pitch,turbidity,strength,clarity,spectralCentroid,rms].postln;
			});
		});

	}

	*findClosestUnit{
		|target,list|
		var minDistance = Unit.euclideanDistance(target, list[0]);
		var minIndex = 0;
		list.do{
			|v,i|

			var d = Unit.euclideanDistance(target, v);

			if (d<minDistance,{
				minDistance=d;
				minIndex=i
			});
		};
		^list[minIndex];
	}

	*readUnitsFromJSON{
		|path, corpusIDKey|

		var files;
		var units = [];
		"Server must be booted for JSON file to be read".warn;
		if(path.keep(-5)!= ".json",
			{
				Error.new("Path must resolve to a .json file").throw;
		});
		if(corpusIDKey.isNil,{
			corpusIDKey = path;
		});
		path.postln;
		files = JSONFileReader.read(path);
		// files = JSONFileReader.read(PathName(path).parentLevelPath(2)++PathName(path).fileName.drop(-5)++"\\";);
		// keys are paths to the soundfiles
		Routine{
			Unit.corpus[corpusIDKey] = [];
			files.keys.do{
				|key,index|
				var i = files[key];
				var buffer = Buffer.read(Server.default,key,action:{

					Unit.corpus[corpusIDKey] = Unit.corpus[corpusIDKey].add(Unit(pitch:i["pitch"].asFloat,turbidity:i["turbidity"].asFloat,strength:i["strength"].asFloat,clarity:i["clarity"].asFloat,spectralCentroid:i["spectralCentroid"].asFloat,rms:i["rms"].asFloat,path:key,buffer:buffer));
					key.post;
					" ".post;
				});

			};

			"corpus loaded".postln;
		}.play;
	}

	*addCorpus {
		|key, unitList|
		Unit.corpus[key]=unitList;
	}

	*generateUnitSoundFiles{
		|sourcePath, outputFolder, sampleDuration|

		var counter = 0;

		outputFolder.mkdir;
		Server.default.waitForBoot({
			(PathName(sourcePath).entries).do{
				|i|

				i.files.do{
					|j|

					var buffer = Buffer.read(Server.default,j.fullPath,action:{

						buffer.loadToFloatArray(action:{
							|array|
							var chans = buffer.numChannels;
							// Make mono bc meyda doesn't do multichannel
							buffer = Buffer.loadCollection(Server.default, array.unlace(chans).sum*(1/chans),action:{
								|buff|

								(buff.numFrames/Server.default.sampleRate/sampleDuration).floor.do{
									|k|

									// Meyda CLI analysis requires 16bit wav
									buff.write(path:(outputFolder++j.folderName++counter++"_"++k++".wav"),headerFormat:"WAV",sampleFormat:"int16",numFrames:Server.default.sampleRate*sampleDuration,startFrame:	(k*buffer.numFrames/(buffer.numFrames/Server.default.sampleRate/sampleDuration)));

									(outputFolder++j.folderName++counter++"_"++k++".aiff").postln;
									counter=counter+1;
								};
								buff.free;
								buffer.free;


							});// End loadCollections



						});// End loadToFloatArray
					}); // End Buffer.read
				};
			};
		});

		("Finished writing to "+outputFolder).postln;

	}

}
