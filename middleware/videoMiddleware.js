import ffmpeg from "fluent-ffmpeg";
import wavefile from "wavefile";
import fs from "fs";
class VideoMiddleware {
  constructor(videoFilePath) {
    this.videoFilePath = videoFilePath;
  }

  async extractAudio(outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(this.videoFilePath)
        .toFormat("mp3")
        .on("end", () => {
          console.log("Audio extraction finished.");
          resolve();
        })
        .on("error", (err) => {
          console.error("Error:", err);
          reject();
        })
        .save(outputPath);
    });
  }

  async censorVideo(outputPath, muteIntervals, censorStyle = "mute") {
    // padding to make sure you get the whole word
    let padding = 0.1;
    let targetSampleRate = await this.getSampleRate(this.videoFilePath);
    const beepFilePath = "";
    if (censorStyle === "mute") {
      beepFilePath = this.generateBeep(800, targetSampleRate, 0.8);
    } else {
      beepFilePath = this.generateBeep(800, targetSampleRate, 1);
    }

    return new Promise((resolve, reject) => {
      // Step 1: Probe the .mp4 video to get its audio sample rate

      console.log("Target sample rate:", targetSampleRate);

      // Construct filter to split and insert beep at intervals
      const filters = [];
      let lastEnd = 0;

      muteIntervals.forEach((interval, index) => {
        const start = interval.start - padding;
        const end = interval.end + padding;

        // Audio before beep
        filters.push(
          `[0:a]atrim=${lastEnd}:${start},asetpts=PTS-STARTPTS[a${index}pre]`
        );
        // Beep
        filters.push(
          `[1:a]atrim=0:${
            end - start
          },asetpts=PTS-STARTPTS,volume=0.2[a${index}beep]`
        );

        lastEnd = end;
      });

      // Audio after last beep
      filters.push(`[0:a]atrim=${lastEnd},asetpts=PTS-STARTPTS[afinal]`);

      // Construct the streams together
      const audioStreams = muteIntervals
        .map((_, index) => `[a${index}pre][a${index}beep]`)
        .join("");
      filters.push(
        `${audioStreams}[afinal]concat=n=${
          2 * muteIntervals.length + 1
        }:v=0:a=1[outa]`
      );

      ffmpeg(this.videoFilePath)
        .input(beepFilePath)
        .complexFilter([...filters, "[0:v]copy[outv]"], ["[outv]", "[outa]"])
        .on("end", () => {
          console.log("Finished processing");
          resolve();
        })
        .on("error", (err) => {
          console.error("Error:", err);
          reject();
        })
        .toFormat("mp4")
        .save(outputPath);
    });
  }
  // This should probably be in AudioMiddleware, but I'm too lazy to move it
  generateBeep(
    duration = 4,
    frequency = 800,
    sampleRate = 16000,
    volume = 0.8
  ) {
    const numSamples = duration * sampleRate;
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      samples[i] =
        Math.sin(2 * Math.PI * frequency * (i / sampleRate)) * volume;
    }

    const wav = new wavefile.WaveFile();
    wav.fromScratch(1, sampleRate, "32f", samples);
    fs.writeFileSync("audio/beeps/beep.wav", wav.toBuffer());

    return "audio/beeps/beep.wav";
  }
  async getSampleRate(videoFilePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoFilePath, (err, metadata) => {
        if (err) {
          console.error("Error during probing:", err);
          reject(err);
          return;
        }

        const audioStream = metadata.streams.find(
          (stream) => stream.codec_type === "audio"
        );
        if (!audioStream) {
          const error = new Error("No audio stream found in the video");
          console.error(error);
          reject(error);
          return;
        }

        resolve(audioStream.sample_rate);
      });
    });
  }
}

export default VideoMiddleware;
