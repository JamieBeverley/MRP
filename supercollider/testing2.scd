
s.options.device = "ASIO : MOTU Audio ASIO"
s.options.numOutputBusChannels = 8

s.options.memSize = 8192*4;

s.options.numBuffers = 1024 * 16; // increase this if you need to load more

s.boot;

~outBus = Bus.audio(Server.default,numChannels:2).index;

(
SynthDef(\out,{
	|lpf=22000, hpf=10, reverb=0,db=0,hrq=1,lrq=1,room=10|
	var audio = In.ar(~outBus,Server.default.options.numOutputBusChannels)*(db.dbamp);

	audio = LPF.ar(audio, Clip.kr(lpf,10,22000));//,1/(resonance.clip(0.0001,1)));
	audio = HPF.ar(audio,Clip.kr(hpf,10,22000));
	audio = GVerb.ar(in:audio,roomsize:room);
	audio = Compander.ar(audio,audio,-30.dbamp,slopeAbove:1/2.5,mul:3.dbamp);
	audio = Compander.ar(audio,audio,thresh:-1.dbamp,slopeAbove:1/20); // limiter...
	Out.ar(0,audio);
}).add;
);

~o = Synth.new(\out,addAction:'addToTail');
CmdPeriod.add({~o=Synth.new(\out,addAction:'addToTail')});
~o.set(\room,5)




// Load one corpus
Unit.readUnitsFromJSON(Platform.userAppSupportDir++"\\Extensions\\SuperCollider-Extensions\\MRP\\supercollider\\Units\\high-level-features\\field-recordings-0.5.json","recordings");

// Load another corpus
Unit.readUnitsFromJSON(Platform.userAppSupportDir++"\\Extensions\\SuperCollider-Extensions\\MRP\\supercollider\\Units\\high-level-features\\testing.json","personal-samples");


// Listen for messages from Nodejs server and play sounds on target match
(
var lastUnit = Unit();
OSCdef(\receiveFeatures, {
	|msg|
	var target = Unit(pitch:msg[1],turbidity:msg[2],strength:msg[3],clarity:msg[4],spectralCentroid:msg[5],rms:msg[6]);

	var newUnit = Unit.findClosestUnit(target,Unit.corpus["personal-samples"]);
	// var newUnit = Unit.findClosestUnit(target,Unit.corpus["recordings"]);

	newUnit.play(out:Server.default.options.numOutputBusChannels.rand);

	lastUnit=newUnit;
	newUnit.postln;
},path:"/target",recvPort:9001);
)





/*
Schwarz, D. (2006). Concatenative sound synthesis: The early years. Journal of New Music Research, 35(1), 3-22.
https://hal.archives-ouvertes.fr/hal-01161361/document


*/