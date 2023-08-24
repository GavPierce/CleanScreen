import AudioController from "./middleware/audioMiddleware.js";
import TranscriberController from "./middleware/transcriberMiddleware.js";
import VideoController from "./middleware/videoMiddleware.js";

async function run() {
  // please put the name of the video here, and make sure it is in the video folder
  const videoName = "only-the-brave";

  let transcriberController = new TranscriberController();
  await transcriberController.loadTranscriber();

  let videoController = new VideoController(`video/${videoName}.mkv`);
  await videoController.extractAudio(`audio/${videoName}.mp3`);

  let audioController = new AudioController();
  let audioData = await audioController.getAudioBuffer(
    `audio/${videoName}.mp3`
  );

  // use magic to get the transcription from the audio!
  let output = await transcriberController.transcribe(audioData);
  audioData = null;

  // Save Subtitle file! cool
  transcriberController.saveToSRT(output[0].chunks, `video/${videoName}.srt`);

  let nonoWords = transcriberController.getNoNoWords(output);

  // await audioController.censorAndSave(
  //   `audio/${videoName}.mp3`,
  //   `audio/Edited.mp3`,
  //   nonoWords
  // );

  await videoController.censorVideo(
    `video/${videoName}-Edited.mp4`,
    nonoWords,
    "mute"
  );
}

run();
