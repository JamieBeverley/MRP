Connectable {

	// a Pbind that characterizes this connectable's behaviour
	// For Remote:  Just a pbind with pfuncs responding to param updates
	// For Computation: a Pbind probably using Pkey to modify the input pattern
	// For Speaker: just Pbind(\out, <speaker #>);
	var <>basePattern;

	var <>pattern;

	var <>type;
	var <>uid;
	var <>identifier; // a symbol composing type and uid:  computation:3, remote:4 etc...
	var <>baseIdentifier; // for base patterns...
	// var input; // Either something feeding this connectable, or itself (if no input)

	*new {
		|type, uid|
		if(type.isNil,{"Connectable must be instantiated with a type".throw;});
		if(uid.isNil,{"Connectable must be instantiated with a uid".throw;});
		^super.new.initConnectable(type, uid);
	}

	initConnectable{
		|type, uid|
		this.type = type;
		this.uid = uid;
		this.identifier = (this.type++":"++this.uid).asSymbol;
		this.baseIdentifier = (this.identifier++"_base").asSymbol;
	}

	connect {
		|to|

		if(to.type.toLower == "speaker",{

			// var pat = Pdef(this.identifier++"::"++to.identifier, to.basePattern <> this.pattern);
			// to.inputs = to.inputs.add(pat);


			/*to.inputs = to.inputs.add(this.pattern);
			to.pattern = Pdef(to.identifier, to.basePattern <> Ppar(to.inputs,inf));
			to.pattern.play;*/



			to.inputs = to.inputs.add(Pdef(this.identifier));
			Pdef(to.identifier, Pdef(to.baseIdentifier) <> Ppar(to.inputs,inf)).play;
		},{ // Else
			Pdef(to.identifier, Pdef(to.baseIdentifier) <> Pdef(this.identifier));
		});
		^to;
	}


	disconnect {
		|to|

		if(to.type.toLower == "speaker", {
			// var remove = this.identifier++"::"++to.identifier;

			to.inputs = to.inputs.reject({|i|i.key == this.identifier});
			if (to.inputs.size == 0,{
				// to.pattern = Pdef(to.identifier, to.basePattern);
				// to.pattern.stop;

				Pdef(to.identifier, Pdef(to.baseIdentifier)).stop;
			},{
				// to.pattern = Pdef(to.identifier, to.basePattern <> Ppar(to.inputs,inf));
				// to.pattern.play;

				Pdef(to.identifier, Pdef(to.baseIdentifier) <> Ppar(to.inputs,inf)).play;
			});

		},{// Else
			// to.pattern = Pdef(to.identifier, to.basePattern);
			Pdef(to.identifier, Pdef(to.baseIdentifier));
		});
	}
}


Remote : Connectable {
	var <>params; // A Dictionary
	var <>rate;
	var <>rateNoise;
	var <>type;
	classvar <>defaultRate;
	classvar <>defaultRateNoise;

	*initClass{
		Remote.defaultRate = 2;
		Remote.defaultRateNoise=0.2;
	}

	*new{
		|uid, params=nil, rate, rateNoise|
		if(rate.isNil,{rate = Remote.defaultRate});
		if(rateNoise.isNil,{rateNoise = Remote.defaultRateNoise});
		^super.new("remote", uid).init(params,rate,rateNoise);
	}

	*makeParams{
		|clarity=0,loudness=0,spectralCentroid=0,pitch=0,turbidity=0, strength=0|
		var d = Dictionary.new();
		d["clarity"] = clarity;
		d["loudness"] = loudness;
		d["spectralCentroid"] = spectralCentroid;
		d["pitch"] = pitch;
		d["turbidity"] = turbidity;
		d["strength"] = strength;
		^ d;
	}

	init{
		|params, rate, rateNoise|
		var patternPairs;
		if(params.isNil,{
			params = Dictionary.new;
			params['clarity'] = 0;
			params['turbidity'] = 0;
			params['pitch'] =0 ;
			params['loudness'] = 0;
			params['strength'] = 0;
			params['spectralCentroid'] = 0;
		});
		this.type = "remote";
		this.params = params;
		this.rate = rate;
		this.rateNoise = rateNoise;

		patternPairs = this.params.collect({|val,key| Pfunc({this.params[key]});}).asKeyValuePairs.collect({|val,i|if(i%2==0,{val.asSymbol},{val})});

		patternPairs = patternPairs++[
			\instrument,\grain,
			\connected,1,
			\dur,Pfunc({
				((1/this.rate)+(Pwhite(-1*this.rateNoise*100,this.rateNoise*100).asStream.next/100)).clip(0.01,inf)})
		];

		patternPairs = Pbind.new.patternpairs_(patternPairs);
		// this.basePattern = Pdef(this.identifier++"_base", patternPairs);
		// this.pattern = Pdef(this.identifier, this.basePattern);

		Pdef(this.baseIdentifier, patternPairs);
		Pdef(this.identifier, Pdef(this.baseIdentifier));
	}

	update{
		|msg|
		var x = Remote.parseMessage(msg);
		this.params = x[1];
	}

	*parseMessage{
		|msg|
		var uid = msg[2].asFloat;
		var list = msg.keep(-12);
		var params = Dictionary.new();
		list.size.do{
			|i|
			if(i%2==0,{params[list[i].asString] = list[i+1].asFloat});
		};

		^[uid,params];//Remote.new(uid,params,Remote.defaultRate,Remote.defaultRateNoise);
	}

}


Computation : Connectable {
	var <>params; // A Dictionary
	var <>computationType;
	var <>computationValue;
	var <>type;

	*new{
		|uid, computationType="undefined", computationValue=nil|
		^super.new("computation", uid).init(computationType,computationValue);
	}

	init{
		|computationType, computationValue|
		this.computationType = computationType;
		this.computationValue = computationValue;
		this.type = "computation";//Todo - yuck.
		this.setBasePattern();
		//Computation.getBasePatternFromComputation(computationType, computationValue);
		// this.pattern = Pdef(this.identifier, this.basePattern);

		Pdef(this.identifier, Pdef(this.baseIdentifier));
	}

	setBasePattern{
		var pat;
		if(this.computationType == "randomness",{
			"base set".postln;
			pat = Pbind(\tolerance, Pfunc({this.computationValue}));
		});

		if(this.computationType =="sample and hold",{
			var pf = Pfunc({this.computationValue.clip(1,inf).round});
			"@@@@@@#@#@$#$@#$!@#$!@#$!@#$".post;this.computationValue.postln;
			this.computationValue.class.postln;
			pat = Pbind(
				\clarity,Pstutter(pf,Pkey(\clarity)),
				\turbidity,Pstutter(pf,Pkey(\turbidity)),
				\strength,Pstutter(pf,Pkey(\strength)),
				\loudness,Pstutter(pf,Pkey(\loudness)),
				\spectralCentroid,Pstutter(pf,Pkey(\spectralCentroid)),
				\pitchedness,Pstutter(pf,Pkey(\pitchedness)));
		});

		if(this.computationType == "reweight",{

			pat = Pbind(
				\clarityWeight,this.computationValue["clarity"],
				\turbidityWeight,this.computationValue["turbidity"],
				\strengthWeight,this.computationValue["strength"],
				\loudnessWeight,this.computationValue["loudness"],
				\spectralCentroidWeight,this.computationValue["spectralCentroid"],
				\pitchednessWeight,this.computationValue["pitch"]);
		});

		if (this.computationType == "grain randomness",{
			"grain randomness".postln;
			pat = Pbind(\tolerance, Pfunc({this.computationValue}));
		});

		if (this.computationType == "corpus",{
			// TODO does value need to be an index opposed to a string?
			pat = Pbind(\corpus, this.computationValue);
		});
		if (this.computationType == "undefined",{
			pat = Pbind();
		});

		Pdef(this.baseIdentifier,pat);
		// this.basePattern = Pdef(this.identifier++"_base",pat);
	}


	update{
		|msg|
		var spec;
		if(msg[4].asString.toLower !="reweight",{
			msg.removeAt(msg.indexOf('value'));
		});
		spec = Computation.parseMessage(msg);
		msg.postln;
		this.computationType = spec[1];
		this.computationValue = spec[2];
		this.setBasePattern();
	}



	*parseMessage{
		|msg|
		var uid = msg[2].asFloat;
		var type = msg[4].asString.toLower;
		var value;


		if(type == "randomness",{
			value = msg[6].asFloat;
		});

		if(type =="sample and hold",{
			value = msg[6].asFloat;
		});

		if(type == "reweight",{
			var list = msg.keep(-12);
			value = Dictionary.new();
			list.size.do{
				|i|
				if(i%2==0,{value[list[i].asString] = list[i+1].asFloat});
			};
		});

		if (type == "grain randomness",{
			value = msg[6].asFloat;
		});

		if (type == "corpus",{
			//TODO - this might need to be a number referring to a corpus
			value = msg[6].asString;
		});

		if( (value.isNil) && (type!="undefined"),{
			"not recognizable compution type".warn;
		});
		^[uid,type,value];
	}


}


Speaker : Connectable {
	var <>inputs; // an array

	*new{
		|uid, inputs|
		if(inputs.isNil,{inputs=[]});
		^super.new("speaker", uid).init(inputs);
	}

	init{
		|inputs|
		this.inputs = inputs;
		this.type = "speaker";
		/*this.basePattern = Pdef(this.identifier++"_base",
		Pbind(
		\midinote, Pfunc({
		|event|
		"in speaker: ".post;
		event.postln;
		if(event.keys.includes('connected'),{1},{\r});}),
		\out, this.uid)
		);*/
		Pdef(this.baseIdentifier,
			Pbind(
				\midinote, Pfunc({
					|event|
					"in speaker: ".post;
					event.postln;
					if(event.keys.includes('connected'),{1},{\r});}),
				\out, this.uid)
		);
		Pdef(this.identifier, Pdef(this.baseIdentifier));
		// this.pattern = Pdef(this.identifier, this.basePattern);
	}


}