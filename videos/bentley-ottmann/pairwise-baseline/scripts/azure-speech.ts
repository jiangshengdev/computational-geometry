import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
export const { buildSpeechDocument, synthesize } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});
export const { alignAudio, verifyAlignment, assessmentWords } =
  createAlignmentTools(sdk, { allowReviewedPronunciation: true });
