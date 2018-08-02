(
~m =[];
Precipitate.boot(corpusJsonPath:"C:/Users/jamie/AppData/Local/SuperCollider/Extensions/SuperCollider-Extensions/Nil.sc/corpus/node9-grains.json");

)


Precipitate.connectables.size




~m




~m

~j = ~m

(
~m.do{
	|i|
	i.postln;
}
)











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

