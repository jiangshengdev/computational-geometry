import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "../../shared/speech/azure-alignment.ts";

export const { assessmentWords, verifyAlignment, alignAudio } =
  createAlignmentTools(sdk, { allowReviewedPronunciation: false });
