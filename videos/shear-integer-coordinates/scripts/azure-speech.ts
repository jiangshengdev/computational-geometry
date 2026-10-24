import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../shared/speech/azure-speech.ts";
export type { WordBoundary } from "../../shared/speech/timing.ts";
export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
// Explicit letter segments disambiguate new narration without changing the
// SSML fingerprints of previously approved plain-text narration.
const letterIpa: Record<string, string> = {
  A: "eɪ",
  B: "biː",
  C: "siː",
  M: "ɛm",
  P: "piː",
  Q: "kjuː",
  X: "ɛks",
  Y: "waɪ",
  Z: "ziː",
};

export const { buildSpeechDocument, synthesize } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
  letterIpa,
});
