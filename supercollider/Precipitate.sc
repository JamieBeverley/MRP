// Class for Remote, Computation, Speaker
// Class for booting, managing connections graph, oscdefs, etc...


// Either 'Remote' sends to a bus which other things read from - which means that other things need to know what busses to be reading from

// Or remote sends to multiple things and everything just listens on one bus


// No pattern is 'played' until connected to a speaker at which point an explicit out can override the 'outs' of
// where things before it in the chain are playing out of

Precipitate {

	classvar <>nodePort;
	classvar <>speakers;
	classvar <>connectables;
	classvar <>connections;


	*reset{
		Precipitate.connectables = [];
		Precipitate.connections = [];
	}

	*boot{

		|device, outChannels=2, nodePort=10001, corpusJsonPath|

		Precipitate.nodePort = nodePort;
		Precipitate.speakers = [];
		outChannels.do{|i|Precipitate.speakers = Precipitate.speakers.add(Speaker(i));};

		Precipitate.connectables = speakers;
		Precipitate.connections = [];

		if(device.notNil,{Server.default.options.device = device;});
		Server.default.options.numBuffers = 1024*8;
		Server.default.options.numOutputBusChannels = outChannels;

		Server.default.waitForBoot({
			var cmdPFunc,oscCmdPFunc;
			~outBus = Bus.audio(Server.default,Server.default.options.numOutputBusChannels);

			SynthDef(\grain,{
				|amp,out=0,spectralCentroid=0,loudness=0,pitchedness=0,clarity=0,strength=0,turbidity=0,corpus=0,attack=0.01,release=0.01,tolerance=0.05|

				SendReply.kr(Line.kr(-1,1,dur:0.01),"/grain",[corpus,tolerance,out,amp,attack,release,loudness,spectralCentroid,pitchedness,clarity,strength,turbidity]);
				// SendReply.kr(Line.kr(-1,1,dur:0.01),"/grain",0.1!15);
				Out.ar(0,EnvGen.ar(Env.perc(),doneAction:2)*0);
			}).add;

			SynthDef(\out,{
				|lpf=22000, hpf=10, reverb=0,db=0,hrq=1,lrq=1,room=0.3|
				var audio = In.ar(~outBus,Server.default.options.numOutputBusChannels)*(db.dbamp);
				audio = FreeVerb.ar(audio,mix:Clip.kr(reverb,0,1),room:Clip.kr(room,0,1),damp:0.9);
				audio = LPF.ar(audio, Clip.kr(lpf,10,22000));//,1/(resonance.clip(0.0001,1)));
				audio = HPF.ar(audio,Clip.kr(hpf,10,22000));
				audio = Compander.ar(audio,audio,-30.dbamp,slopeAbove:1/2.5,mul:3.dbamp);
				audio = Compander.ar(audio,audio,thresh:-1.dbamp,slopeAbove:1/20); // limiter...
				Out.ar(0,audio);
			}).add;

			Grain.readGrainsFromJSON(corpusJsonPath,"c1");


			cmdPFunc = {
				Tdef(\ugh,{
					0.1.wait;
					"Adding new ~out Synth".postln;
					~out = Synth.new(\out,addAction:'addToTail');

					OSCdef(\playGrain,{
						|msg|
						var features = Dictionary.new();
						var corpus = msg[3];
						var tolerance = msg[4];
						var out = msg[5];
						var amp = msg[6];

						var attack = msg[7];
						var release = msg[8];
						var match;

						features["rms"] = (msg[9].asFloat)/0.2; // TODO - this scaling is kind of custom
						features["spectralCentroid"] = msg[10].asFloat;
						features["pitch"] = msg[11].asFloat;
						features["clarity"] = msg[12].asFloat;
						features["strength"] = msg[13].asFloat;
						features["turbidity"] = msg[14].asFloat;

						match =Grain.findCloseEnoughGrain(Grain(features),list:Grain.corpus.asArray[corpus],tolerance:tolerance);
						match.play(out:out,amp:amp,attack:attack,release:release);
					},"/grain",recvPort:NetAddr.langPort).add;
				}).play;
			};

			cmdPFunc.value();
			CmdPeriod.add(cmdPFunc);

			oscCmdPFunc = {Precipitate.oscDefs()};
			oscCmdPFunc.value();
			CmdPeriod.add(oscCmdPFunc);
		});

	}



	*oscDefs{

		OSCdef(\newConnectable,{
			|msg|
			var connectable;
			"new connectable".postln;
			msg.postln;
			if(msg[1].asString.toLower == "computation",{
				connectable = Computation.parseMessage(msg);
			});
			if(msg[1].asString.toLower == "remote",{
				connectable = Remote.parseMessage(msg);
			});

			Precipitate.connectables = Precipitate.connectables.add(connectable);

			("new: "+connectable.type++":"++connectable.uid).postln;
		},path:"/newConnectable",recvPort:Precipitate.nodePort);

		OSCdef(\removeConnectable,{
			|msg|
			var type = msg[1].asString;
			var uid = msg[2].asFloat;

			// TODO
			// Commenting this out for now bc it doesn't really matter from SC's
			// perspective which connectables still exist - only matters what
			// connections exist, and when things get updated. Need to think
			// of a way to manage when a connectable with connections gets deleted
			// bc. it will remove it from list here and might conflict with deletion
			// of connections.
			/*	Precipitate.connectables = Precipitate.connectables.reject({
			|v|
			v.uid==uid && v.type == type
			});*/

			("remove"+type++":"++uid).postln;
		},path:"/removeConnectable",recvPort:Precipitate.nodePort);


		OSCdef(\newConnection,{
			|msg|

			var fromType = msg[1].asString;
			var fromUid = msg[2].asFloat;
			var toType = msg[3].asString;
			var toUid = msg[4].asFloat;
			var from = Precipitate.connectables.select({|v| v.type==fromType && v.uid==fromUid})[0];
			var to = Precipitate.connectables.select({|v| v.type==toType && v.uid==toUid})[0];
			if(from.isNil,{
				("From not found in list of connectables: "++fromType++":"++fromUid).warn;
				msg.postln;
			});


			if(to.isNil,{
				("To not found in list of connectables: "++toType++":"++toUid).warn;
				msg.postln;
			});


			if(to.notNil && from.notNil,{
				from.connect(to);
				Precipitate.connections = Precipitate.connections.add([from,to]);
				("new connection:  "++fromType++":"++fromUid++"->"++toType++":"++toUid).postln;
			});
		},path:"/newConnection",recvPort: Precipitate.nodePort);

		OSCdef(\removeConnection,{
			|msg|
			var fromType = msg[1].asString;
			var fromUid = msg[2].asFloat;
			var toType = msg[3].asString;
			var toUid = msg[4].asFloat;
			var from = Precipitate.connectables.select({|v| v.type==fromType && v.uid==fromUid})[0];
			var to = Precipitate.connectables.select({|v| v.type==toType && v.uid==toUid})[0];

			var index;


			if(from.isNil,{
				("From not found in list of connectables: "++fromType++":"++fromUid).warn;
				msg.postln;
			});

			if(to.isNil,{
				("To not found in list of connectables: "++toType++":"++toUid).warn;
				msg.postln;
			});


			if(to.notNil && from.notNil, {
				Precipitate.connections.size.do{
					|i|
					var con = Precipitate.connections[i];
					if (con[0].type == from.type && con[0].uid == from.uid &&
						con[1].type==to.type && con[1].uid == to.uid,{
							index = i;
					});
				};

				if(index.notNil,{
					from.disconnect(to);
					Precipitate.connections.removeAt(index);
				},{"Tried to remove non-existing connection".warn;});
			});


			("remove connection:  "++fromType++":"++fromUid++"->"++toType++":"++toUid).postln;
		},path:"/removeConnection",recvPort: Precipitate.nodePort);

		OSCdef(\updateConnectable,{
			|msg|
			var type = msg[1].asString;
			var uid = msg[2].asFloat;
			var connectable = Precipitate.connectables.select({|v| v.type==type && v.uid==uid})[0];

			if(connectable.notNil,{
				connectable.update(msg);
			},{
				"could not find connectable to update".warn;
			});

		},path:"/updateConnectable",recvPort: Precipitate.nodePort);


	}
}
