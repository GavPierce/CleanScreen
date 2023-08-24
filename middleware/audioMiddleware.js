import wavefile from "wavefile";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
class AudioMiddleware {
  constructor() {
    this.audioBuffer = null;
  }
  async getAudioBuffer(filePath) {
    this._loadAudio(filePath);
    if (!this._checkIfAudioBufferIsWavFile()) {
      await this._convertAudioBufferToWavFile();
    }
    this._loadWavFile();
    let audioBuffer = this.audioBuffer;
    this.audioBuffer = null;
    return audioBuffer;
  }

  // Deprecated, since we now edite the video file directly.
  async censorAndSave(inputPath, outputPath, badWords) {
    // Read input file to Buffer

    const audioBuffer = fs.readFileSync(inputPath);
    let sampleRate = 16000;
    console.log("Sample Rate: " + sampleRate);
    // Iterate through bad words
    for (const word of badWords) {
      console.log(word);
      const start = word.start * sampleRate;
      const end = word.end * sampleRate;
      console.log(audioBuffer.length);
      // Overwrite part of buffer with 0s
      audioBuffer.fill(0, start, end);
    }

    // Write output
    fs.writeFileSync(outputPath, audioBuffer);
  }

  _loadAudio(filePath) {
    this.audioBuffer = fs.readFileSync(filePath);
  }
  _checkIfAudioBufferIsWavFile() {
    if (this.audioBuffer.slice(0, 4).toString() !== "RIFF") {
      return false;
    } else {
      return true;
    }
  }
  async _convertAudioBufferToWavFile() {
    return new Promise((resolve, reject) => {
      // Create FFmpeg command
      // Create PassThrough stream
      const bufferStream = new PassThrough();

      // Write buffer to stream
      bufferStream.end(this.audioBuffer);
      console.log("Converting file to .wav...");
      ffmpeg(bufferStream)
        .output("outputFile.wav")
        .audioCodec("pcm_s16le") // WAV codec
        .on("end", () => {
          console.log("Conversion completed!");
          this.audioBuffer = fs.readFileSync("outputFile.wav");
          resolve();
        })
        .run();
    });
  }
  _loadWavFile() {
    console.log("Loading wav file...");
    this.audioBuffer = new wavefile.WaveFile(this.audioBuffer);
    this.audioBuffer.toBitDepth("32f"); // Pipeline expects input as a Float32Array
    this.audioBuffer.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
    this.audioBuffer = this.audioBuffer.getSamples();
    // console.log("Merging into Mono...");
    // if (Array.isArray(this.audioBuffer)) {
    //   if (this.audioBuffer.length > 1) {
    //     const SCALING_FACTOR = Math.sqrt(2);

    //     // Merge channels (into first channel to save memory)
    //     for (let i = 0; i < this.audioBuffer[0].length; ++i) {
    //       this.audioBuffer[0][i] =
    //         (SCALING_FACTOR *
    //           (this.audioBuffer[0][i] + this.audioBuffer[1][i])) /
    //         2;
    //     }
    //   }

    //   // Select first channel
    //   this.audioBuffer = this.audioBuffer[0];
    //   console.log("Finished Loading");
    // }
  }

  _getMP3SampleRate(buffer) {
    // MP3 frame header is 4 bytes
    const header = buffer.slice(0, 4);

    // Sample rate is stored in bits 12-15
    const sampleRateIndex = (header[2] >> 3) & 0x0f;

    const sampleRates = [
      48000,
      44100,
      32000,
      22050,
      24000,
      16000,
      11025,
      12000,
      8000, // mapping of bit values to rates
    ];
    console.log(typeof sampleRateIndex);
    let sampleRate = parseInt(sampleRates[sampleRateIndex]);
    return sampleRate;
  }
}
export default AudioMiddleware;
