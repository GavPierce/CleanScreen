import { pipeline } from "@xenova/transformers";
import fs from "fs";

class TranscriberMiddleware {
  constructor() {
    this.transcriber = null;
    this.badWords = [
      "dick",
      "fuck",
      "bitch",
      "shit",
      "ass",
      "cock",
      "cunt",
      "cum",
    ];
  }

  async loadTranscriber() {
    this.transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en",
      {
        revision: "output_attentions",
      }
    );
  }

  async transcribe(audioData) {
    //return the output text of the audio! Cool beans
    let output = await this.transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: "word",
    });
    let lastMax = -Infinity; // Initial value set to negative infinity to ensure the first item isn't filtered out

    output[0].chunks = output[0].chunks.filter((obj) => {
      const firstValue = obj.timestamp[0];
      if (firstValue > lastMax) {
        lastMax = firstValue;
        return true;
      }
      return false;
    });
    return output;
  }

  getNoNoWords(output) {
    // create a list of badwords words to censor
    let badWords = this.badWords;
    // checks the output of the transcriber and returns an array of words that are not allowed, with their timestamps
    let nonoWords = output[0].chunks.filter((x) => {
      // check if x.text contains any words found in badWords
      x.text = x.text.toLowerCase();
      return badWords.some((word) => x.text.includes(word));
    });

    nonoWords = nonoWords.map((x) => {
      return {
        timeStamps: x.timestamp,
        word: x.text,
        start: x.timestamp[0],
        end: x.timestamp[1],
      };
    });
    return nonoWords;
  }
  saveToSRT(timestampArray, output) {
    let srtString = "";
    let subtitleIndex = 1;
    let i = 0;

    while (i < timestampArray.length) {
      const startTime = this._formatTime(timestampArray[i].timestamp[0]);
      let endTime;
      let group = [];

      // Start with the first timestamp in this iteration.
      group.push(timestampArray[i]);
      endTime = this._formatTime(timestampArray[i].timestamp[1]);
      i++;

      // Keep adding to the group while the next word is within 5 seconds of the start of this group.
      while (
        i < timestampArray.length &&
        timestampArray[i].timestamp[0] - group[0].timestamp[0] <= 5
      ) {
        group.push(timestampArray[i]);
        endTime = this._formatTime(timestampArray[i].timestamp[1]);
        i++;
      }

      const text = group.map((item) => this._censorWord(item.text)).join(" ");

      srtString += `${subtitleIndex}\n${startTime} --> ${endTime}\n${text}\n\n`;
      subtitleIndex++;
    }
    console.log("Saving to SRT file...");
    fs.writeFileSync(output, srtString);
  }
  _censorWord(word) {
    let lowerCaseWord = word.toLowerCase();
    // if any word in badwords contains this word, censor it
    let badWords = this.badWords;

    for (let i = 0; i < badWords.length; i++) {
      if (lowerCaseWord.includes(badWords[i])) {
        let wordSize = word.length;
        let firstLetter = word[1];
        let lastLetter = word[wordSize - 1];

        let censoredWord = firstLetter;
        console.log(censoredWord);

        for (let i = 1; i < wordSize - 1; i++) {
          censoredWord += "*";
        }
        censoredWord += lastLetter;
        return censoredWord;
      }
    }
    return word;
  }

  _formatTime(seconds) {
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    const ms = ((seconds * 1000) % 1000).toFixed(0).toString().padStart(3, "0");

    return `${hours}:${minutes}:${secs},${ms}`;
  }
}
export default TranscriberMiddleware;
