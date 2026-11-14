import assert from "node:assert/strict";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { buildBatchPlan } from "../../../shared/speech/plan-batch.ts";
import { synthesizeBatch } from "../../../shared/speech/synthesize-batch.ts";
import { configureSpeechConfig } from "./speech-network.ts";
import { shots } from "../src/storyboard.ts";
import originalSpeech from "../src/speech-text.json" with { type: "json" };
import originalSentences from "../src/sentence-plan.json" with { type: "json" };
import originalNarration from "../src/narration-text.json" with { type: "json" };
import evidence from "../narration-staging/review.json" with { type: "json" };
import revisions from "../narration-candidates/wording-v1.json" with { type: "json" };

type Part = string | { text: string; pinyin: string } | { breakMs: number };
const textOf = (parts: Part[]) =>
  parts
    .map((p) => (typeof p === "string" ? p : "text" in p ? p.text : ""))
    .join("");
const speech: Record<string, Part[]> = {};
const narration: Record<string, string> = {};
const sentences: Record<string, { caption: string; speech: string[] }[]> = {};
for (const [id, changes] of Object.entries(revisions)) {
  const source = evidence.results.find((r) => r.id === id);
  assert(
    source && (source.flags.Omission || source.flags.Insertion),
    `${id}: outside repair scope`,
  );
  const key = id as keyof typeof originalSpeech;
  assert.equal(
    source.speech,
    originalNarration[key],
    `${id}: stale repair reference`,
  );
  const clauses: { parts: Part[]; pause: { breakMs: number } }[] = [];
  let parts: Part[] = [];
  for (const part of originalSpeech[key] as Part[]) {
    if (typeof part !== "string" && "breakMs" in part) {
      clauses.push({ parts, pause: part });
      parts = [];
    } else parts.push(part);
  }
  assert.equal(parts.length, 0, `${id}: missing final pause`);
  assert.deepEqual(
    clauses.map((c) => textOf(c.parts)),
    originalSentences[key].flatMap((s) => s.speech),
  );
  for (const change of changes) {
    const matching = clauses.filter((c) => textOf(c.parts) === change.before);
    assert.equal(matching.length, 1, `${id}: repair sentence must match once`);
    assert(
      change.after.length &&
        change.after.every(
          (p) => typeof p === "string" || ("text" in p && "pinyin" in p),
        ),
    );
    const after = textOf(change.after);
    assert(
      !/[,，]/.test(after) && after.endsWith("。"),
      `${id}: preserve spoken sentence structure`,
    );
    matching[0].parts = change.after;
  }
  speech[id] = clauses.flatMap((c) => [...c.parts, c.pause]);
  narration[id] = textOf(speech[id]);
  let index = 0;
  sentences[id] = originalSentences[key].map((s) => ({
    caption: s.caption,
    speech: s.speech.map(() => textOf(clauses[index++].parts)),
  }));
}
const build = () =>
  buildBatchPlan(
    sdk,
    shots
      .filter((s) => s.id in revisions)
      .map((s) => ({ id: s.id, caption: s.captions.join("") })),
    narration,
    speech,
    sentences,
  );
const mode = process.argv.splice(2, 1)[0];
assert(
  mode === "--plan-only" || mode === "--synthesize",
  "Choose candidate planning or synthesis",
);
if (mode === "--plan-only") {
  assert(process.argv.slice(2).every((arg) => arg === "--dry-run"));
  console.log(JSON.stringify(build(), null, 2));
} else {
  // Fixed four-shot candidate input; no default full-film fallback or adoption.
  await synthesizeBatch(
    sdk,
    speech,
    () => {
      build();
    },
    { concurrency: 1, configureSpeechConfig },
  );
}
