(
~params = Dictionary.new();
~params["clarity"] = 0.3;
~params["loudness"] = 0.3;
~params["spectralCentroid"] = 0.3;
~params["pitch"] = 0.3;
~params["turbidity"] = 0.3;
~params["strength"] = 0.3;
~remote = Remote.new(1,~params,2,rateNoise:0.5);

~remote2 = Remote.new(2,~params,2,rateNoise:0.6);

~computation = Computation.new(2,computationType:"grain randomness",computationValue:0.5);

~speaker = Speaker.new(3,[]);

SynthDef(\grain,
	{
		|tolerance=0.5|
		var audio = SinOsc.ar((440*tolerance).clip(10,20000),mul:0.01)*EnvGen.ar(Env.perc(),doneAction:2);
		Out.ar(0,audio!2);
}).add;
)


Pdef(\a, Pbind(\midinote,Pseq([56,67,48],inf)) <> Ppar([Pdef(\b,Pbind(\dur,0.25))],inf)).play



~computation.computationValue = 1

~chain = ~remote.connect(~computation).connect(~speaker);

~chain.pattern.play;


~computation.disconnect(~speaker)

~computation.connect(~speaker);

~remote2.connect(~computation)


~remote2.connect(~speaker);



~remote2.disconnect(~speaker);

~speaker.inputs[0].play



~speaker.inputs


~remote.disconnect(~computation)

~remote.connect(~computation)

~computation.connect(~speaker)

~chain.pattern.stop

~computation.disconnect(~speaker)

(

)


~p = Pbind.new

~p.patternpairs = ~patternPairs

~p.patternpairs

~p.play

~patternPairs[0].class

~params.asKeyValuePairs.collect({|val,i|if(i%2==0,{val.asSymbol},{val})})[0].class

'a'.asSymbol