# Clean Screen

This application detects and censors profanity in video files using machine learning.
This is just a plane Node app currently. I plan to make it a CLI tool in the future, or a web app.

## Overview

- Accepts an input video file
- Uses FFmpeg to extract audio
- Creates transcript of audio using Whisper Speech-to-Text
- Bleeps out profanity in video via transcript timestamps
- Creates a cleaned subtitle .srt file
- Outputs censored video and .srt to `/video/` folder

## Usage

```
npm install
```

- Put video you would like to censor in the `/video` folder
- In app.js replace videoName with the name of your video
- Run `npm run clean` to start the app
Note: First time usage will download the whisper model, may take a minute
## Performance

- A 10 minute video in under 5 minutes.

## References

- [Whisper](https://github.com/ggerganov/whisper.cpp)
- [FFmpeg](https://ffmpeg.org/)
- [TransformerJS](https://github.com/xenova/transformers.js)
