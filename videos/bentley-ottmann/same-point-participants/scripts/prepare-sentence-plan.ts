import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { format } from "prettier";
import { shots } from "../src/storyboard.ts";
import type { SentencePlan } from "../../../shared/speech/sentence-pauses.ts";

// Project-specific mapping: reference-project sources retain their own owner.
// Existing shared sentence-pauses.ts remains the authority for pause validation.
function buildSentencePlan(
  caption: string,
  text: string,
  counts: readonly number[],
  context: string,
): SentencePlan {
  const sentences = caption.match(/[^。？！]+[。？！]/g) ?? [];
  const phrases = text.match(/[^。？！]+[。？！]/g) ?? [];
  if (
    sentences.join("") !== caption ||
    phrases.join("") !== text ||
    sentences.length !== counts.length ||
    counts.some((count) => !Number.isInteger(count) || count < 1) ||
    counts.reduce((sum, count) => sum + count, 0) !== phrases.length
  )
    throw Error(`${context}: semantic mapping no longer matches source`);
  let cursor = 0;
  return sentences.map((sentence, index) => {
    const speech = phrases.slice(cursor, cursor + counts[index]);
    cursor += counts[index];
    return { caption: sentence, speech };
  });
}

// Reviewed spoken-phrase counts for each ORIGINAL subtitle sentence.
// Commas, colons and semicolons remain inside that sentence. Stable IDs exclude
// the retired proof/counting steps; no duration is inferred from these counts.
const phraseCounts: Record<string, number[]> = {
  SP01: [2, 3],
  SP02: [2, 3],
  SP03: [2, 3, 1],
  SP04: [2, 2, 2],
  SP05: [2, 3, 1],
  SP06: [4, 3],
  SP07: [2, 4],
  SP08: [3, 3],
  SP09: [3, 4],
  SP10: [2, 2],
  SP11: [2, 4],
  SP12: [2, 3],
  SP13: [2, 3, 2],
  SP14: [3, 3, 1],
  SP15: [3, 2, 2],
  SP16: [2, 1, 4],
  SP17: [3, 1, 3],
  SP18: [3, 4],
  SP19: [2, 2, 1],
  SP20: [3, 2, 2],
  SP21: [3, 2, 1],
  SP22: [3, 4],
  SP23: [2, 4],
  SP24: [3, 2, 4],
  SP25: [2, 3, 1],
  SP26: [2, 4],
  SP27: [4, 2, 3],
  SP29: [2, 3, 1],
  SP33: [3, 2, 2, 1],
  SP34: [4],
  SP35: [2, 4],
  SP36: [3, 4, 2],
  SP37: [2, 3],
  SP38: [3, 3],
  SP39: [4, 3, 1],
  SP40: [5, 1, 1, 2],
  SP41: [1, 2],
  SP43: [2, 1, 2],
  SP44: [2, 4],
  SP45: [3, 2, 2],
  SP46: [3, 4],
  SP47: [3, 3],
  SP48: [3, 4],
  SP49: [3, 2, 3],
  SP50: [2, 1, 2],
  SP51: [2, 3],
  SP52: [3, 3],
  SP53: [3, 2],
  SP54: [2, 3, 1],
  SP55: [3, 3],
  SP56: [3, 2, 2],
  SP57: [1, 3, 2],
  SP58: [3, 3],
  SP59: [3, 4],
  SP60: [4, 3],
  SP61: [3, 2],
  SP62: [1, 1, 2, 2],
};
const textBytes = readFileSync(
  new URL("../src/narration-text.json", import.meta.url),
  "utf8",
);
if (
  createHash("sha256").update(textBytes).digest("hex") !==
  "f972441e0e309f3b65c9529eb5e13e6da5c0ffb034aaa9237c476c6c1323cc1a"
)
  throw Error(
    "Frozen narration changed; review correspondence before regenerating",
  );
const narration = JSON.parse(textBytes) as Record<string, string>;
const ids = shots
  .map((shot) => shot.id)
  .sort()
  .join(",");
for (const data of [narration, phraseCounts])
  if (Object.keys(data).sort().join(",") !== ids)
    throw Error("Sentence mapping and current storyboard IDs differ");
const plans: Record<string, SentencePlan> = Object.fromEntries(
  shots.map((shot) => [
    shot.id,
    buildSentencePlan(
      shot.captions.join(""),
      narration[shot.id],
      phraseCounts[shot.id],
      shot.id,
    ),
  ]),
);
const output = await format(JSON.stringify(plans), { parser: "json" });
const destination = new URL("../src/sentence-plan.json", import.meta.url);
if (process.argv.includes("--write")) writeFileSync(destination, output);
else if (readFileSync(destination, "utf8") !== output)
  throw Error("Sentence plan differs; regenerate and review semantic mapping");
console.log(
  `Sentence mapping: ${shots.length} shots; ${Object.values(plans).reduce((n, plan) => n + plan.length, 0)} original sentences; ${process.argv.includes("--write") ? "written" : "unchanged"}`,
);
