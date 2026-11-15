import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { currentNarrationPlan } from "./narration-plan.ts";
import { verifyBatch } from "../../../shared/speech/verify-batch.ts";
import type { AudioTiming } from "../../../shared/speech/timing.ts";
import { measuredCaptions } from "./caption-plans.ts";

export function verifyRecordings(
  directory: string | Record<string, string>,
  timing: Record<string, AudioTiming>,
  decode = false,
) {
  return {
    ...verifyBatch(sdk, currentNarrationPlan(), directory, timing, decode),
    captions: measuredCaptions(timing),
  };
}
