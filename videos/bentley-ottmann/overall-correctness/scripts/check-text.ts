import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import plans from "../src/sentence-plan.json" with { type: "json" };
import {
  sentencePauses,
  validateSentencePauses,
} from "../../../shared/speech/sentence-pauses.ts";
const ids = shots.map((shot) => shot.id).sort();
for (const source of [narration, plans])
  assert.deepEqual(Object.keys(source).sort(), ids);
const plainOnly = process.argv.includes("--plain");
const speech = plainOnly
  ? null
  : JSON.parse(
      readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
    );
if (!plainOnly) {
  assert(
    speech !== null && typeof speech === "object" && !Array.isArray(speech),
    "Annotated speech must be an object keyed by shot ID",
  );
  assert.deepEqual(Object.keys(speech).sort(), ids);
}
let boundaries = 0;
for (const shot of shots) {
  const id = shot.id as keyof typeof narration;
  const text = narration[id],
    plan = plans[id],
    caption = shot.captions.join("");
  assert(!/[,，]/.test(text), `${id}: comma in spoken text`);
  boundaries += sentencePauses(caption, text, plan).length;
  for (const sentence of plan)
    for (const phrase of sentence.speech)
      assert(
        !/^\s*[A-Za-z]|[A-Za-z]\s*[。！？]$/.test(phrase),
        `${id}: letter at phrase boundary`,
      );
  if (plainOnly) continue;
  validateSentencePauses(caption, speech[id], text, plan, id);
  for (const part of speech[id]) {
    if (typeof part === "string") continue;
    if (Object.keys(part).length === 1 && "breakMs" in part) continue;
    assert.deepEqual(
      Object.keys(part).sort(),
      ["pinyin", "text"],
      `${id}: unsupported speech object`,
    );
    assert(
      /^\p{Script=Han}+$/u.test(part.text),
      `${id}: non-Han pronunciation text`,
    );
    assert(
      /^[a-z]+[1-5]( [a-z]+[1-5])*$/.test(part.pinyin),
      `${id}: numbered pinyin required`,
    );
    assert.equal(
      part.pinyin.split(" ").length,
      [...part.text].length,
      `${id}: syllable count`,
    );
  }
}
console.log(
  `PASS: ${ids.length} ${plainOnly ? "plain-text" : "annotated-text"} shots, ${boundaries} semantic phrase boundaries. Structural checks do not replace independent pronunciation review or listening.`,
);
