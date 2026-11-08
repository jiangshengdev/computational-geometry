import assert from "node:assert/strict";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { buildBatchPlan } from "../../../shared/speech/plan-batch.ts";
import { verifyBatch } from "../../../shared/speech/verify-batch.ts";
import {
  clauses,
  createCaptions,
  validateCaptionClauses,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };

// Written mathematical definitions expand into several natural spoken phrases.
// These counts map each written clause to its reviewed spoken clauses in order.
const spokenGroups: Record<string, number[]> = {
  OD04: [1, 2, 1, 1, 1, 1],
  OD05: [2, 1, 1, 1, 1],
  OD09: [2, 2, 1, 1],
  OD10: [1, 1, 1, 2, 2],
  OD40: [1, 1, 2, 1, 1],
};
export function captionPlan(id: string) {
  const shot = shots.find((s) => s.id === id)!;
  const visible = clauses(shot.captions.join(""));
  const audible = clauses(narration[id as keyof typeof narration]);
  // “因此，从不足变为足够” is one spoken phrase; retain both written clauses.
  if (id === "OD46")
    visible.splice(5, 2, {
      text: visible[5].text + visible[6].text,
      offset: visible[5].offset,
    });
  const groups = spokenGroups[id] ?? visible.map(() => 1);
  assert.equal(groups.length, visible.length, `${id}: caption groups differ`);
  assert.equal(
    groups.reduce((a, b) => a + b, 0),
    audible.length,
    `${id}: spoken groups differ`,
  );
  let cursor = 0;
  const plan = visible.map((part, index) => {
    const text = audible
      .slice(cursor, cursor + groups[index])
      .map((p) => p.text)
      .join("");
    cursor += groups[index];
    return { caption: part.text, speech: text };
  });
  validateCaptionClauses(
    shot.captions.join(""),
    narration[id as keyof typeof narration],
    plan,
  );
  return plan;
}

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
  return {
    ...verifyBatch(sdk, plan, directory, timing, decode),
    captions: Object.fromEntries(
      shots.map((shot) => [
        shot.id,
        createCaptions(
          shot.captions.join(""),
          timing[shot.id],
          captionPlan(shot.id),
        ),
      ]),
    ),
  };
}
