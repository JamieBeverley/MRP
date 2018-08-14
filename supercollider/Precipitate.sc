// Class for Remote, Computation, Speaker
// Class for booting, managing connections graph, oscdefs, etc...


// Either 'Remote' sends to a bus which other things read from - which means that other things need to know what busses to be reading from

// Or remote sends to multiple things and everything just listens on one bus


// No pattern is 'played' until connected to a speaker at which point an explicit out can override the 'outs' of
// where things before it in the chain are playing out of

Precipitate {

	classvar <>nodeRecvPort;
	classvar <>nodeOut;
	classvar <>speakers;
	classvar <>connectables;
	classvar <>connections;
	classvar <>amplitudes;


	*reset{
		Precipitate.connectables = List.new();
		Precipitate.connections = [];
	}

	*boot{

		|device, nodeOutIP = "127.0.0.1", nodeOutPort=10000, nodeRecvPort=10001, corpuses|

		Precipitate.nodeRecvPort = nodeRecvPort;
		Precipitate.nodeOut = NetAddr.new(nodeOutIP, nodeOutPort);

		Precipitate.speakers = [];

		Precipitate.connectables = List.new();
		Precipitate.connections = [];

		if(device.notNil,{Server.default.options.device = device;});
		Server.default.options.numBuffers = 1024*8;
		Server.default.options.numOutputBusChannels = 8;

/*		Precipitate.amplitudes = [];
		Server.default.options.numOutputBusChannels.do{
			var l = List.new;
			20.do{l.add(0)};
			Precipitate.amplitudes = Precipitate.amplitudes.add(l);
		};*/

		Server.default.waitForBoot({
			var cmdPFunc,oscCmdPFunc;

			Precipitate.loadSynths;
			corpuses.do{
				|i|
				Grain.readGrainsFromJSON(i,i);
			};


			cmdPFunc = {
				Tdef(\ugh,{
					0.1.wait;
					"Adding new ~out Synth".postln;
					~out = Synth.new(\out,addAction:'addToTail');
					Precipitate.loadSynths;
				}).play;
			};

			cmdPFunc.value();
			CmdPeriod.add(cmdPFunc);

			oscCmdPFunc = {Precipitate.oscDefs()};
			oscCmdPFunc.value();
			CmdPeriod.add(oscCmdPFunc);

			Precipitate.nodeOut.sendMsg("/requestGraph");
		});

	}

	*loadSynths{
		if (~outBus.isNil,{~outBus = Bus.audio(Server.default,Server.default.options.numOutputBusChannels)});

		SynthDef(\grain,{
			|amp,out=0,spectralCentroid=0,loudness=0,pitchedness=0,clarity=0,strength=0,turbidity=0,corpus=0,attack=0.01,release=0.01,tolerance=0.05|

			SendReply.kr(Line.kr(-1,1,dur:0.01),"/grain",[corpus,tolerance,out,amp,attack,release,loudness,spectralCentroid,pitchedness,clarity,strength,turbidity]);
			// SendReply.kr(Line.kr(-1,1,dur:0.01),"/grain",0.1!15);
			Out.ar(0,EnvGen.ar(Env.perc(),doneAction:2)*0);
		}).add;

		SynthDef(\out,{
			|lpf=22000, hpf=10, reverb=0,db=0,hrq=1,lrq=1,room=0.3, levelFreq=5|
			var audio = In.ar(~outBus,Server.default.options.numOutputBusChannels)*(db.dbamp);
			audio = FreeVerb.ar(audio,mix:Clip.kr(reverb,0,1),room:Clip.kr(room,0,1),damp:0.9);
			audio = LPF.ar(audio, Clip.kr(lpf,10,22000));//,1/(resonance.clip(0.0001,1)));
			audio = HPF.ar(audio,Clip.kr(hpf,10,22000));
			audio = Compander.ar(audio,audio,-30.dbamp,slopeAbove:1/2.5,mul:3.dbamp);
			audio = Compander.ar(audio,audio,thresh:-1.dbamp,slopeAbove:1/20); // limiter...

			SendReply.kr(Impulse.kr(levelFreq),cmdName:"/amplitude",values:LPF.kr(Amplitude.kr(audio),levelFreq));
			Out.ar(0,audio);
		}).add;

		OSCdef(\amplitude,{
			|msg|
			msg = msg.keep(-8).ampdb.clip(-80,0).collect({|v| if(v.isNumber,{v},{-80})});
			Precipitate.nodeOut.sendBundle(0, ["/levels"]++msg);
		},"/amplitude",recvPort:NetAddr.langPort);

		OSCdef(\playGrain,{
			|msg|
			var features = Dictionary.new();
			var corpus = msg[3];
			var tolerance = msg[4].asFloat;
			var out = msg[5];
			var amp = msg[6];

			var attack = msg[7];
			var release = msg[8];
			var match;

			features["rms"] = (msg[9].asFloat).clip(0,1); // TODO - this scaling is kind of custom
			features["spectralCentroid"] = msg[10].asFloat.clip(0,1);
			features["pitch"] = msg[11].asFloat.clip(0,1);
			features["clarity"] = msg[12].asFloat.clip(0,1);
			features["strength"] = msg[13].asFloat.clip(0,1);
			features["turbidity"] = msg[14].asFloat.clip(0,1);
			"playGrainTolerance: ".post;tolerance.postln;
			"playGrain tolerance class: ".post;tolerance.class.postln;

			match =Grain.findCloseEnoughGrain(Grain(features),list:Grain.corpus.asArray[corpus],tolerance:tolerance);

			~m=	~m.add(match);
			~m.keep(-20);
			match.play(out:out,amp:amp,attack:attack,release:release);
		},"/grain",recvPort:NetAddr.langPort)

	}

	*oscDefs{

		OSCdef(\purge,{
			Precipitate.connectables.do{
				|i|
				i.pattern.stop;
			};
			Precipitate.connectables = List.new();
			Precipitate.connections.do{
				|i|
				i[0].disconnect(i[1]);
			};
			Precipitate.connections = [];
			"Connections purged by instruction of SC web client".postln;
		},path:"/purge",recvPort:Precipitate.nodeRecvPort);

		OSCdef(\confirmGraphDump,{
			|msg|
			"Graph dump received".postln;
			Precipitate.nodeOut.sendMsg("/confirmGraphDump");
		},path:"/confirmGraphDump",recvPort:Precipitate.nodeRecvPort);

		OSCdef(\newConnectable,{
			|msg|
			var connectable;
			"new connectable".postln;
			msg.postln;
			if(msg[1].asString.toLower == "computation",{
				var spec = Computation.parseMessage(msg);
				connectable = Computation.new(spec[0],computationType:spec[1],computationValue:spec[2]);
			});
			if(msg[1].asString.toLower == "remote",{
				var spec = Remote.parseMessage(msg);
				connectable = Remote.new(spec[0], spec[1], Remote.defaultRate, Remote.defaultRateNoise);
			});
			if(msg[1].asString.toLower == "speaker",{connectable = Speaker(msg[2].asFloat,[])});

			// Precipitate.connectables = Precipitate.connectables.add(connectable);
			Precipitate.connectables.add(connectable);
			("new: "+connectable.type++":"++connectable.uid).postln;
		},path:"/newConnectable",recvPort:Precipitate.nodeRecvPort);

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
		},path:"/removeConnectable",recvPort:Precipitate.nodeRecvPort);


		OSCdef(\newConnection,{
			|msg|

			var fromType = msg[1].asSymbol;
			var fromUid = msg[2].asFloat;
			var toType = msg[3].asSymbol;
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
				"from ".post;from.postln;
				"to ".post;to.postln;
				from.connect(to);
				Precipitate.connections = Precipitate.connections.add([from,to]);
				("new connection:  "++fromType++":"++fromUid++"->"++toType++":"++toUid).postln;
			});
		},path:"/newConnection",recvPort: Precipitate.nodeRecvPort);

		OSCdef(\removeConnection,{
			|msg|
			var fromType = msg[1].asSymbol;
			var fromUid = msg[2].asFloat;
			var toType = msg[3].asSymbol;
			var toUid = msg[4].asFloat;
			var from = Precipitate.connectables.select({|v| v.type==fromType && v.uid==fromUid})[0];
			var to = Precipitate.connectables.select({|v| v.type==toType && v.uid==toUid})[0];

			var index;
			"removeConnection".postln;


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
					if( (con[0].equals(from)) && (con[1].equals(to)),{
							index = i;
					});
				};

				if(index.notNil,{
					from.disconnect(to);
					Precipitate.connections.removeAt(index);
				},{"Tried to remove non-existing connection".warn;});
			});


			("remove connection:  "++fromType++":"++fromUid++"->"++toType++":"++toUid).postln;
		},path:"/removeConnection",recvPort: Precipitate.nodeRecvPort);

		OSCdef(\updateConnectable,{
			|msg|
			var type = msg[1].asSymbol;
			var uid = msg[2].asFloat;
			var connectable = Precipitate.connectables.select({|v| v.type==type && v.uid==uid})[0];

			if(connectable.notNil,{
				connectable.update(msg);
			},{
				"could not find connectable to update".warn;
			});

		},path:"/updateConnectable",recvPort: Precipitate.nodeRecvPort);


	}
}
