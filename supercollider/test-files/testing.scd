/*
1. Generate units using SC script: Unit.generateUnitSoundFiles
2. Run batch meyda analysis on those .wav files (the batchAnalysis bash script)
3. Run high-level analysis nodejs script on the .json files generated by (2), store .json features file in the high-level-features directory

w/
same name as the folder used in 1

*/


s.options.device = "ASIO : MOTU Audio ASIO"
s.options.numOutputBusChannels = 8

s.options.numBuffers = 1024 * 16; // increase this if you need to load more

s.boot;

Pbindef(\a,\out,Pseq((0..7),inf)).play


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



Unit.midiTest(Platform.userAppSupportDir++"\\Extensions\\SuperCollider-Extensions\\MRP\\supercollider\\Units\\high-level-features\\field-recordings-0.5.json","recordings");

MIDIClient.init
MIDIIn.connectAll

Unit.midiTest(corpusPath:Platform.userAppSupportDir++"\\Extensions\\SuperCollider-Extensions\\MRP\\supercollider\\Units\\high-level-features\\testing.json");


/*Unit.midiTest(corpusPath:Platform.userAppSupportDir++"\\Extensions\\SuperCollider-Extensions\\MRP\\supercollider\\Units\\high-level-features\\testing3.json");*/




// Listen to nodejs for listening features
Unit.readUnitsFromJSON(Platform.userAppSupportDir++"\\Extensions\\SuperCollider-Extensions\\MRP\\supercollider\\Units\\high-level-features\\field-recordings-0.5.json","recordings");

Unit.readUnitsFromJSON(Platform.userAppSupportDir++"\\Extensions\\SuperCollider-Extensions\\MRP\\supercollider\\Units\\high-level-features\\testing.json","personal-samples");

(
var lastUnit = Unit();
OSCdef(\receiveFeatures, {
	|msg|
	var target = Unit(pitch:msg[1],turbidity:msg[2],strength:msg[3],clarity:msg[4],spectralCentroid:msg[5],rms:msg[6]);
	// var target = Unit(spectralCentroid:msg[5],rms:msg[6]);
	// target.postln;
	var newUnit = Unit.findClosestUnit(target,Unit.corpus["personal-samples"]);
	var newUnit2 = Unit.findClosestUnit(target,Unit.corpus["recordings"]);
	// newUnit2.play();
	// if(newUnit!=lastUnit, {newUnit.play();"played".postln;});
	newUnit.play(out:Server.default.options.numOutputBusChannels.rand);
	lastUnit=newUnit;
	newUnit.postln;
},path:"/target",recvPort:9001);
)














	/*if(newUnit.pitch != lastUnit.pitch || newUnit.turbidity!=lastUnit.turbidity || newUnit.clarity != lastUnit.clarity || newUnit.strength!=lastUnit.strength || newUnit.spectralCentroid!=lastUnit.spectralCentroid || newUnit.rms != lastUnit.rms,{
		newUnit.play();
	});*/