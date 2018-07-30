Precipitate.boot(device:"MOTU Audio ASIO",outChannels:8,corpusJsonPath:"C:/Users/jamie/AppData/Local/SuperCollider/Extensions/SuperCollider-Extensions/Nil.sc/corpus/node9-grains.json");


().play

Server.default.options.sampleRate = 48000;

(
var nodePort = 10001;
var speakers = [Speaker(0),	Speaker(1),	Speaker(2),	Speaker(3),	Speaker(4),	Speaker(5),	Speaker(6),Speaker(7)];
var connectables = speakers;
var connections = [];

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

	connectables = connectables.add(connectable);

	("new: "+connectable.type++":"++connectable.uid).postln;
},path:"/newConnectable",recvPort:nodePort);

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
/*	connectables = connectables.reject({
		|v|
		v.uid==uid && v.type == type
	});*/

	("remove"+type++":"++uid).postln;
},path:"/removeConnectable",recvPort:nodePort);


OSCdef(\newConnection,{
	|msg|

	var fromType = msg[1].asString;
	var fromUid = msg[2].asFloat;
	var toType = msg[3].asString;
	var toUid = msg[4].asFloat;
	var from = connectables.select({|v| v.type==fromType && v.uid==fromUid})[0];
	var to = connectables.select({|v| v.type==toType && v.uid==toUid})[0];
	"1".postln;
	if(from.isNil,{
		("From not found in list of connectables: "++fromType++":"++fromUid).warn;
		msg.postln;
	});
	"2".postln;

	if(to.isNil,{
		("To not found in list of connectables: "++toType++":"++toUid).warn;
		msg.postln;
	});
	"3".postln;

	if(to.notNil && from.notNil,{
		from.connect(to);
		"4".postln;
		connections = connections.add([from,to]);
		("new connection:  "++fromType++":"++fromUid++"->"++toType++":"++toUid).postln;
	});
},path:"/newConnection",recvPort: nodePort);

OSCdef(\removeConnection,{
	|msg|
	var fromType = msg[1].asString;
	var fromUid = msg[2].asFloat;
	var toType = msg[3].asString;
	var toUid = msg[4].asFloat;
	var from = connectables.select({|v| v.type==fromType && v.uid==fromUid})[0];
	var to = connectables.select({|v| v.type==toType && v.uid==toUid})[0];

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
		connections.size.do{
			|i|
			var con = connections[i];
			if (con[0].type == from.type && con[0].uid == from.uid &&
				con[1].type==to.type && con[1].uid == to.uid,{
					index = i;
			});
		};

		if(index.notNil,{
			from.disconnect(to);
			connections.removeAt(index);
		},{"Tried to remove non-existing connection".warn;});
	});


	("remove connection:  "++fromType++":"++fromUid++"->"++toType++":"++toUid).postln;
},path:"/removeConnection",recvPort: nodePort);

OSCdef(\updateConnectable,{
	|msg|
	var type = msg[1].asString;
	var uid = msg[2].asFloat;
	var connectable = connectables.select({|v| v.type==type && v.uid==uid})[0];

	if(connectable.notNil,{
		connectable.update(msg);
	},{
		"could not find connectable to update".warn;
	});

},path:"/updateConnectable",recvPort: nodePort);

SynthDef(\grain,
	{
		|tolerance=0.5|
		var audio = SinOsc.ar((440*tolerance).clip(10,20000),mul:0.01)*EnvGen.ar(Env.perc(),doneAction:2);
		Out.ar(0,audio!2);
}).add;

Routine({
	inf.do{
		0.5.wait;
		~connectables = connectables;
		~connections = connections;
	}
}).play;

)

~connections

"clear"