import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToString } from "katex";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { pages } from "../src/content.ts";
import { timeline, visualAt, fps, timingStatus } from "../src/timeline.ts";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { createSentencePlanTools } from "../../../shared/speech/sentence-plan-tools.ts";
import type { SentencePlan } from "../../../shared/speech/sentence-pauses.ts";

const read = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../src/${name}.json`, import.meta.url), "utf8"),
  );
const narration = read("narration-text") as Record<string, string>;
const speech = read("speech-text") as Record<string, unknown>;
const plans = read("sentence-plan") as Record<string, SentencePlan>;
const shots = pages.flatMap((page) =>
  page.steps.map((step) => ({ id: step.id, caption: step.subtitle })),
);
const ids = shots.map((shot) => shot.id).sort();
assert.equal(new Set(ids).size, ids.length, "Stable step IDs must be unique");
for (const data of [narration, speech, plans])
  assert.deepEqual(Object.keys(data).sort(), ids);

// Build documents locally only. No synthesizer or service request is called.
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
  commas: "document",
  fingerprint: true,
});
const { checkSentencePlan } = createSentencePlanTools({
  shots,
  plans,
  narration,
  path: new URL("../src/speech-text.json", import.meta.url),
});
let formulas = 0;
for (const page of pages) {
  for (const step of page.steps) {
    const doc = buildSpeechDocument(speech[step.id], step.id);
    assert.equal(
      doc.text,
      narration[step.id],
      `${step.id}: annotation changed frozen text`,
    );
    checkSentencePlan(speech[step.id], doc.text, step.id);
    for (const text of [step.subtitle, ...step.lines]) {
      assert.equal(
        (text.match(/\$/g) ?? []).length % 2,
        0,
        `${step.id}: unpaired math delimiter`,
      );
      for (const match of text.matchAll(/\$([^$]+)\$/g)) {
        renderToString(match[1], {
          throwOnError: true,
          strict: "error",
          trust: false,
        });
        formulas++;
      }
    }
  }
}
for (const row of timeline) {
  assert.equal(
    row.captions.map((caption) => caption.text).join(""),
    row.step.subtitle,
    `${row.id}: caption punctuation lost`,
  );
  const end = visualAt(row, row.durationInFrames - 1);
  const start = visualAt(row, 0);
  assert.equal(
    end.visibleLines,
    start.visibleLines,
    `${row.id}: completed lines disappeared`,
  );
  assert.equal(
    end.caption,
    row.captions[row.captions.length - 1].text,
    `${row.id}: last caption not held`,
  );
  if (row.index === row.page.steps.length - 1)
    assert.ok(
      row.durationInFrames - row.readingFrames >=
        (row.page.dense ? 2 : 1) * fps,
    );
  if (row.step.thinkSeconds)
    assert.ok(
      row.durationInFrames - row.readingFrames >= row.step.thinkSeconds * fps,
    );
}
console.log(
  `${pages.length} pages; ${shots.length} steps; ${formulas} math fragments; text/annotations/sentence plans/read-preview checks PASS`,
);
console.log(
  `Timing: ${timingStatus}. No audio, browser layout, pronunciation listening or synchronization acceptance implied.`,
);
