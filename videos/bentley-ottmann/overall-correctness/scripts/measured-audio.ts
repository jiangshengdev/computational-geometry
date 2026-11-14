import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { buildBatchPlan } from "../../../shared/speech/plan-batch.ts";
import { verifyBatch } from "../../../shared/speech/verify-batch.ts";
import type { AudioTiming } from "../../../shared/speech/timing.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };
import { measuredCaptions } from "./caption-plans.ts";

export function currentNarrationPlan(selectedIds = shots.map((s) => s.id)) {
  const select = <T>(source: Record<string, T>) =>
    Object.fromEntries(selectedIds.map((id) => [id, source[id]]));
  return buildBatchPlan(
    sdk,
    shots
      .filter((s) => selectedIds.includes(s.id))
      .map((s) => ({ id: s.id, caption: s.captions.join("") })),
    select(narration),
    select(speech),
    select(sentences),
  );
}
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
