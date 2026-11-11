import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import { checkSentencePlan } from "./sentence-pauses.ts";

export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
const configureSpeechConfig = (config: sdk.SpeechConfig) => {
  const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  if (proxy) {
    const url = new URL(proxy);
    config.setProxy(
      url.hostname,
      Number(url.port || 80),
      decodeURIComponent(url.username),
      decodeURIComponent(url.password),
    );
  }
};
const tools = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
  configureSpeechConfig,
});
export const { synthesize } = tools;
export function buildSpeechDocument(input: unknown, context = "speech") {
  const document = tools.buildSpeechDocument(input, context);
  checkSentencePlan(input, document.text, context);
  return document;
}
export const { alignAudio, verifyAlignment } = createAlignmentTools(sdk, {
  allowReviewedPronunciation: true,
  deferPronunciationReview: true,
  configureSpeechConfig,
});
