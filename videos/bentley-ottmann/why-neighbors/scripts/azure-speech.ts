import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import { checkSentencePlan } from "./sentence-pauses.ts";
export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
const speechTools = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});
export const { synthesize } = speechTools;
export function buildSpeechDocument(input: unknown, context = "speech") {
  const document = speechTools.buildSpeechDocument(input, context);
  checkSentencePlan(input, document.text, context);
  return document;
}
export const { alignAudio, verifyAlignment, assessmentWords } =
  createAlignmentTools(sdk, {
    allowReviewedPronunciation: true,
    deferPronunciationReview: true,
  });
