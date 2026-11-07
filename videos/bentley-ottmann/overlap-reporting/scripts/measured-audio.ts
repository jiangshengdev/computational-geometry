import assert from "node:assert/strict";
import { join } from "node:path";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { buildBatchPlan } from "../../../shared/speech/plan-batch.ts";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import { verifyRecording } from "../../../shared/speech/verify-recording.ts";
import type { AudioTiming } from "../../../shared/speech/timing.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };
import { measuredCaptions } from "./caption-plans.ts";

/** Offline only. Regenerate exact request and timing evidence before adoption. */
export function verifyRecordings(
  directory: string | Record<string, string>,
  timing: Record<string, AudioTiming>,
  decode = false,
) {
  const plan = buildBatchPlan(
    sdk,
    shots.map((s) => ({ id: s.id, caption: s.captions.join("") })),
    narration,
    speech,
    sentences,
  );
  assert.deepEqual(Object.keys(timing).sort(), shots.map((s) => s.id).sort());
  const tools = createAlignmentTools(sdk, {
    allowReviewedPronunciation: false,
    deferPronunciationReview: true,
  });
  const counts = { Omission: 0, Insertion: 0, Mispronunciation: 0 };
  for (const doc of plan.documents) {
    const audio = timing[doc.id];
    const source =
      typeof directory === "string" ? directory : directory[doc.id];
    assert(source, `${doc.id}: missing selected source directory`);
    const path = join(source, doc.audioFile);
    verifyRecording({
      audio,
      path,
      expected: { ...doc, voice: plan.voice, outputFormat: plan.outputFormat },
      verifyAlignment: tools.verifyAlignment,
      decode,
      counts,
    });
  }
  assert.equal(counts.Omission, 0, "Omission blocks adoption/export");
  assert.equal(counts.Insertion, 0, "Insertion blocks adoption/export");
  return {
    clips: shots.length,
    counts,
    captions: measuredCaptions(timing),
    actualListeningPerformed: false,
  };
}
