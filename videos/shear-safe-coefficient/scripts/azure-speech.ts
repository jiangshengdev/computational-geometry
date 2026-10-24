import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../shared/speech/azure-speech.ts";
import { createAlignmentTools } from "../../shared/speech/azure-alignment.ts";
export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
export const { buildSpeechDocument, synthesize } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
  letterIpa: {
    M: "ɛm",
    P: "piː",
    Q: "kjuː",
    R: "ɑːr",
    S: "ɛs",
    T: "tiː",
    X: "ɛks",
    Y: "waɪ",
  },
});
export const { alignAudio, verifyAlignment } = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
});
