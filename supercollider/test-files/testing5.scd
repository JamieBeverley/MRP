(
// Works in NIL
Precipitate.boot(device:"MOTU Audio ASIO",corpuses:["C:/Users/jamie/AppData/Local/SuperCollider/Extensions/SuperCollider-Extensions/Nil.sc/corpus/node9-grains.json"]);

)


Precipitate.boot(corpuses:["C:/Users/jamie/AppData/Local/SuperCollider/Extensions/SuperCollider-Extensions/Nil.sc/corpus/node9-grains.json"]);

Server.default.options.sampleRate = 48000

Precipitate.connectables[9].computationValue


().play


~m.

inf+(-1*inf) == (0/0).isNan


(0/0).isNumber

isNan

CheckBadValues.kr(

(0/0).clip(0,1)

0.ampdb.clip(-80,0)


[1,2,3,4,5,nil].collectInPlace({|v|v?0});

nil?1

~m

~j = ~m

(
~m.do{
	|i|
	i.postln;
}
)




~sp.pattern = Pdef(\a, ~sp.basePattern <> Ppar(~sp.inputs))

~sp.pattern.play

~sp.basePattern


~sp.inputs[0]

~s = Speaker.new(1,[]);

~c = Computation.new(22)


~r = Remote.new(22,Remote.makeParams,1,0)

~r.connect(~c)

~c.connect(~s)


~r.disconnect(~s)

~c.disconnect(~s)











v = Pseq([1,2,3],inf).asStream


v = Pbind(\midinote, Pseq([1,2,3],inf)).asStream

v.next

Routine


~c.basePattern

~c.computationValue
(
~r = Precipitate.connectables[8];
~c = Precipitate.connectables[9];
~sp = Precipitate.connectables[0];


)

~c.basePattern.patternpairs[1].nextFunc.value()

~c.computationValue = 0.7

[].asArgsArray


e = Pbind.new([\instrument,\default,\midinote,35].asArgsArray);

a= Pbind.new()
a.patternpairs = ~c.basePattern.patternpairs++[\instrument,\grain];

b = Pchain([a,Pbind(\connected,1)]);


a.play

a.stop

Pdef(\a, a)

Pdef(\a).stop

~sp.basePattern.patternpairs

Pdef(\b, ~sp.basePattern <> b)

Pdef(\b).play

~r.connect(~sp)

~r.disconnect(~sp)

~c.connect(~sp)

~c.computationValue

~c.basePattern.asStream.next

~r.pattern.asStream.next




~sp.inputs

~sp.pattern.stop

Pdef("computation:0::speaker:0").stop


~sp.pattern.asStream.next


a = Pseq([1,2,3],inf);



(instrument:\grain,tolerance:1).play

~out

Precipitate.connectables.size

Precipitate.connectables[9].computationType

Precipitate.connectables[9].basePattern.patternpairs[1].nextFunc.value()

Precipitate.connectables[3].computationType

Precipitate.connectables[3].computationValue


Precipitate.connectables[3].basePattern.patternpairs[1].n.nextFunc.value

Precipitate.connectables[3].basePattern.patternpairs[1].pattern

Pkey(\a).asStream

FuncStream

~k=4
~note =68
(
Pdef(\b,Pbind(\instrument,\default,\midinote,Pfunc({~note})));

Pdef(\a,
	Pbind(
		\midinote, Pstutter(Pfunc({~k}),Pkey(\midinote)),
		// \midinote, Pkey(\midinote),
		\dur, 1
	) <>
	Pdef(\b)
).play;

)

Pkey

Pfunc

Pstutter

a = Pbind(\instrument, \a, \db, -30);


a.patternpairs


(
Server.default.options.numBuffers = 1024*8;

Server.default.waitForBoot({
	Grain.readGrainsFromJSON("C:/Users/jamie/AppData/Local/SuperCollider/Extensions/SuperCollider-Extensions/Nil.sc/corpus/node9-grains.json",corpusIDKey:'1');
	Precipitate.loadSynths;
	~params = Dictionary.new();
	~params["clarity"] = 0.3;
	~params["loudness"] = 0.03;
	~params["spectralCentroid"] = 0.3;
	~params["pitch"] = 0.3;
	~params["turbidity"] = 0.8;
	~params["strength"] = 0.3;
	~remote = Remote.new(4,~params,2,rateNoise:0.5);

	~computation = Computation.new(2,computationType:"grain randomness",computationValue:0.5);

	~speaker = Speaker(0,[]);
});
)









	// child node
// bounding box of all below it
//
// point,
//
// each 'rectangle' is a 6-dimensional polygon (a search space)

// True 'root' is an Rtree with no parent, search space of entire space

Rtree {
	var <>data; // maybe? or 'identifier'?
	var <>nodeWidth;
	var <>entries; // [] of R-trees, 'nodeWith' long;
	var <>parent;
	var <>boundingBox; // [] of point dimensions of an n-dimensional hypercube
	var <>point;
	// [[0,0,0],[0,0,1],[0,1,0],[0,1,1],[1,0,0],[1,0,1],[1,1,0],[1,1,1]]

	*new{
		|data, nodeWidth, children, parent, boundingBox,point|
		^super.new.init(data,nodeWidth,children,parent,boundingBox,point);
	}

	init {
		|data, nodeWidth, children, parent, boundingBox,point|
		this.data = data;
		this.nodeWidth = nodeWidth;
		this.children = children?[]; // or insert...
		this.parent = parent;
		this.boundingBox = boundingBox;
		this.point = point;
	}

	*insert{
		|root,entry|
		if(root.isLeaf(),{},{
			root
		});

	}

	withinBoundingBox{
		|point|
		// minDimensions and maxDimensions will get 2 opposite corners of the
		// hyperCube
		var minDimensions = this.boundingBox[0].copy;// FUCKUHG.
		var maxDimensions = this.boundingBox[0].copy;
		var isWithin = true;
		if(point.size != minDimensions.size,{"point and bounding box are of different dimensions".throw;});

		this.boundingBox.size.do{
			|i|
			this.boundingBox[i].size.do{
				|j|
				if( this.boundingBox[i][j] < minDimensions[j],{
					minDimensions[j]=this.boundingBox[i][j];
				});
				if( this.boundingBox[i][j] > maxDimensions[j], {
					maxDimensions[j] = this.boundingBox[i][j];
				});
			};
		};
		point.size.do{
			|i|
			isWithin = isWithin && (point[i]>= minDimensions[i]) && (point[i]<= maxDimensions[i]);
		};

		^isWithin;
	}

	isLeaf{
		^this.children.isEmpty
	}


	*pointToBox{
		|point|
		^point!point.size;
	}

}





//



Computation.new(2,\hold,2)


(
{
	var a = SinOsc.ar(440,mul:0.05*(0,0.01..0.07));
	SendReply.kr(Impulse.kr(10),cmdName:"/amplitude",values:LPF.kr(Amplitude.kr(a),freq:10));
	a
}.play
)
(
OSCdef(\a,{
	|msg|
	msg = msg.keep(-8).ampdb.clip(-80,0);
	msg.postln;
},path:"/amplitude",recvPort:NetAddr.langPort);
)

0.05.ampdb

~n = NetAddr.new("127.0.0.1",NetAddr.langPort);

~n.sendBundle(0,["/amplitude",1,2,3,4,5]);
















	(
var boundingBox = [[0,0,0],[0,0,1],[0,1,0],[0,1,1],[1,0,0],[1,0,1],[1,1,0],[1,1,1]];
var minDimensions = boundingBox[0].copy;// seriously fuck this language.
var maxDimensions = boundingBox[0].copy;
var isWithin = true;
var point = [1,0,1];
if(point.size != minDimensions.size,{"point and bounding box are of different dimensions".throw;});


boundingBox.size.do{
	|i|
	boundingBox[i].size.do{
		|j|
		if( boundingBox[i][j] < minDimensions[j],{
			minDimensions[j]=boundingBox[i][j];
		});

		if( boundingBox[i][j] > maxDimensions[j], {
			maxDimensions[j] = boundingBox[i][j];

		});
	};
};
minDimensions.postln;
maxDimensions.postln;

point.size.do{
	|i|
	isWithin = isWithin && (point[i]>= minDimensions[i]) && (point[i]<= maxDimensions[i]);
};
isWithin.postln;
)




