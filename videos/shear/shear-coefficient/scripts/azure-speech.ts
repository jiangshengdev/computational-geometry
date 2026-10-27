import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
export type { WordBoundary } from "../../../shared/speech/timing.ts";
export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";

export const { buildSpeechDocument, synthesize } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});
