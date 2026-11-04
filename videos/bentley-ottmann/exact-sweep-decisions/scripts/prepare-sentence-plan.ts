import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { format } from "prettier";
import { shots } from "../src/storyboard.ts";
import type { SentencePlan } from "../../../shared/speech/sentence-pauses.ts";
import { buildSentencePlan } from "../../../shared/speech/sentence-plan-tools.ts";

// Authored semantic correspondence, not a rule inferred from synthesized periods.
// Each number says how many frozen spoken phrases belong to that ORIGINAL
// subtitle sentence. Display fragments ending in commas/semicolons stay together.
const phraseCounts = [
  [1, 2, 2],
  [2, 3, 2],
  [1, 2, 1],
  [1, 2, 2],
  [2, 2, 2],
  [1, 2, 2],
  [1, 4, 2],
  [2, 2, 2],
  [2, 2, 4],
  [2, 2, 2],
  [2, 2, 2],
  [3, 2, 2],
  [2, 2, 2],
  [2, 1, 3],
  [2, 2, 3],
  [2, 2, 2],
  [2, 4, 2],
  [1, 2, 2],
  [1, 1, 2],
  [2, 1, 2],
  [2, 2, 2],
  [2, 2, 1],
  [4, 2, 2],
  [4, 2],
  [3, 2, 2],
  [4, 2, 2],
  [1, 1, 2],
  [3, 1, 2],
  [2, 1, 2],
  [2, 2, 3],
  [2, 2, 1],
  [2, 2, 2],
  [4, 2, 2],
  [3, 2, 2],
  [3, 2, 2],
  [1, 2, 2],
  [2, 3, 2],
  [2, 2, 3],
  [4, 3, 2],
  [3, 2, 2],
  [1, 2, 2],
  [2, 1, 4],
  [1, 3, 3],
  [3, 2, 2],
  [2, 2, 2],
  [1, 2, 2],
  [1, 2, 4],
  [2, 1, 2],
  [1, 1, 2],
  [1, 3, 2],
];
const textBytes = readFileSync(
  new URL("../src/narration-text.json", import.meta.url),
  "utf8",
);
if (
  createHash("sha256").update(textBytes).digest("hex") !==
  "87e0dbe65e486d0ef007be4593dac3b6f0e2408df6578dfce58b765d37101214"
)
  throw Error(
    "Frozen narration changed; review correspondence before regenerating",
  );
const narration = JSON.parse(textBytes) as Record<string, string>;
const plans: Record<string, SentencePlan> = {};
if (phraseCounts.length !== shots.length)
  throw Error("Missing authored correspondence");
for (const [index, shot] of shots.entries()) {
  plans[shot.id] = buildSentencePlan(
    shot.captions.join(""),
    narration[shot.id],
    phraseCounts[index],
    shot.id,
  );
}
const output = await format(JSON.stringify(plans), {
  parser: "json",
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
});
const destination = new URL("../src/sentence-plan.json", import.meta.url);
if (process.argv.includes("--write")) writeFileSync(destination, output);
else if (readFileSync(destination, "utf8") !== output)
  throw Error(
    "Sentence plan differs from authored correspondence; regenerate and review",
  );
console.log(
  `Sentence mapping: ${shots.length} shots; ${Object.values(plans).reduce((n, plan) => n + plan.length, 0)} original sentences; ${process.argv.includes("--write") ? "written" : "unchanged"}`,
);
