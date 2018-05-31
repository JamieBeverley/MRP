(
var dur = 0.5; //seconds
var writePath = "C:/Users/jamie/AppData/Local/SuperCollider/Extensions/SuperCollider-Extensions/MRP/Units/testing/";
var counter = 0;
(PathName(Platform.userAppSupportDir++"\\downloaded-quarks\\personal-samples").entries).do{
	|i|

	i.files.do{
		|j|

		var buffer = Buffer.read(s,j.fullPath,action:{

			buffer.loadToFloatArray(action:{
				|array|
				var chans = buffer.numChannels;
				// Make mono bc meyda doesn't do multichannel
				buffer = Buffer.loadCollection(s, array.unlace(chans).sum*(1/chans),action:{
					|buff|

					(buff.numFrames/s.sampleRate/dur).floor.do{
						|k|

						// Meyda CLI analysis requires 16bit wav
						buff.write(path:(writePath++j.folderName++counter++"_"++k++".wav"),headerFormat:"WAV",sampleFormat:"int16",numFrames:s.sampleRate*dur,startFrame:	(k*buffer.numFrames/(buffer.numFrames/s.sampleRate/dur)));

						(writePath++j.folderName++counter++"_"++k++".aiff").postln;
						counter=counter+1;
					};
					buff.free;
					buffer.free;


				});// End loadCollections



			});// End loadToFloatArray
		}); // End Buffer.read
	};
};
);















// Old...

(
var dur = 0.5; //seconds
var writePath = "C:/Users/jamie/AppData/Local/SuperCollider/Extensions/SuperCollider-Extensions/MRP/Units/testing/";
var counter = 0;
(PathName(Platform.userAppSupportDir++"\\downloaded-quarks\\personal-samples").entries).do{
	|i|

	i.files.do{
		|j|

		var buffer = Buffer.read(s,j.fullPath,action:{
			(buffer.numFrames/s.sampleRate/dur).floor.do{
				|k|

				buffer.write(path:(writePath++j.folderName++counter++"_"++k++".wav"),headerFormat:"WAV",sampleFormat:"int24",numFrames:s.sampleRate*dur,startFrame:	(k*buffer.numFrames/(buffer.numFrames/s.sampleRate/dur)));

				(writePath++j.folderName++counter++"_"++k++".aiff").postln;
				counter=counter+1;
			};
			buffer.free;
		});
	};;
};
);


File.write
(

// var p = SoundFile.new.headerFormat_("AIFF").sampleFormat_("int16").numChannels_(2);
// p.openWrite(path);
// arr.readFromStream(
var begin =0;
var buffer = Buffer.read(s,"C:/Users/jamie/AppData/Local/SuperCollider/downloaded-quarks/Personal-Samples/synth/HIE_C_Synth_1.wav",action:{
	arg buf;
	buf.numChannels.postln;
	// {PlayBuf.ar(2,buf)}.play;
	// "okay..".postln;
});
)


asdf.frames