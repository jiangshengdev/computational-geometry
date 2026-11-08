import assert from "node:assert/strict";
import { join } from "node:path";
import type * as SpeechSdk from "microsoft-cognitiveservices-speech-sdk";
import type { buildBatchPlan } from "./plan-batch.ts";
import { createAlignmentTools } from "./azure-alignment.ts";
import { verifyRecording } from "./verify-recording.ts";
import type { AudioTiming } from "./timing.ts";

/** Offline only. Regenerate exact request and timing evidence before adoption. */
export function verifyBatch(
  sdk: typeof SpeechSdk,
  plan: ReturnType<typeof buildBatchPlan>,
  directory: string | Record<string, string>,
  timing: Record<string, AudioTiming>,
  decode = false,
) {
  assert.deepEqual(
    Object.keys(timing).sort(),
    plan.documents.map((s) => s.id).sort(),
  );
  const tools = createAlignmentTools(sdk, {
    allowReviewedPronunciation: false,
    deferPronunciationReview: true,
  });
  const counts = { Omission: 0, Insertion: 0, Mispronunciation: 0 };
  const reviewedRecognition = { Omission: 0, Insertion: 0 };
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
    // verifyAlignment above validates every review against this exact WAV,
    // request, raw response span and original measured synthesis event.
    for (const review of audio.alignment?.reviewedRecognition ?? [])
      for (const word of review.expected) reviewedRecognition[word.errorType]++;
  }
  const unresolved = {
    Omission: counts.Omission - reviewedRecognition.Omission,
    Insertion: counts.Insertion - reviewedRecognition.Insertion,
  };
  assert.equal(
    unresolved.Omission,
    0,
    "Unresolved omission blocks adoption/export",
  );
  assert.equal(
    unresolved.Insertion,
    0,
    "Unresolved insertion blocks adoption/export",
  );
  return {
    clips: plan.documents.length,
    counts,
    reviewedRecognition,
    unresolved,
    actualListeningPerformed: false,
  };
}
