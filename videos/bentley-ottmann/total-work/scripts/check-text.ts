import assert from "node:assert/strict";
import { shots } from "../src/storyboard.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };
import narration from "../src/narration-text.json" with { type: "json" };
import { createSentencePlanTools } from "../../../shared/speech/sentence-plan-tools.ts";
import { readFileSync } from "node:fs";
const path = new URL("../src/speech-text.json", import.meta.url);
const tools = createSentencePlanTools({
  shots: shots.map((s) => ({ id: s.id, caption: s.captions.join("") })),
  plans,
  narration,
  path,
});
tools.updateSentencePauses(process.argv.includes("--write-pauses"));
const speech = JSON.parse(readFileSync(path, "utf8"));
for (const shot of shots) {
  const id = shot.id as keyof typeof plans;
  for (const sentence of plans[id])
    for (const phrase of sentence.speech)
      assert.ok(
        !/^\s*[A-Za-z]|[A-Za-z]\s*[。！？]$/.test(phrase),
        `${id}: letter at phrase boundary`,
      );
  for (const part of speech[id]) {
    if (typeof part === "string" || "breakMs" in part) continue;
    assert.deepEqual(Object.keys(part).sort(), ["pinyin", "text"]);
    assert.match(part.text, /^\p{Script=Han}+$/u);
    assert.match(part.pinyin, /^[a-z]+[1-5]( [a-z]+[1-5])*$/);
    assert.equal(part.pinyin.split(" ").length, [...part.text].length);
  }
}
console.log(
  "45 shot annotation structures match frozen narration; independent pronunciation review remains a separate gate.",
);
