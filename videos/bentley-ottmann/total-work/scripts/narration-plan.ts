import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { buildBatchPlan } from "../../../shared/speech/plan-batch.ts";
import { selectNarrationShots } from "../../../shared/speech/selection.ts";
import type { SentencePlan } from "../../../shared/speech/sentence-pauses.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };
const sources = process.argv.slice(2).filter((a) => a.startsWith("--source="));
assert(sources.length <= 1, "Repeated --source");
if (sources.length)
  assert(
    process.argv.some((a) => a.startsWith("--shots=")),
    "Candidate source requires explicit --shots",
  );
const selection = selectNarrationShots(shots);
let sourceNarration: Record<string, string> =
  selection.selectedSource(narration);
let sourceSpeech: Record<string, unknown> = selection.selectedSource(speech);
let sourceSentences: Record<string, SentencePlan> =
  selection.selectedSource(sentences);
if (sources.length) {
  process.argv.splice(process.argv.indexOf(sources[0]), 1);
  const directory = resolve(sources[0].slice(9));
  const read = (name: string) =>
    JSON.parse(readFileSync(join(directory, name), "utf8"));
  sourceNarration = read("narration-text.json");
  sourceSpeech = read("speech-text.json");
  sourceSentences = read("sentence-plan.json");
}
export const narrationSpeech = sourceSpeech;
export function currentNarrationPlan() {
  return buildBatchPlan(
    sdk,
    selection.selectedShots.map((s) => ({
      id: s.id,
      caption: s.captions.join(""),
    })),
    sourceNarration,
    sourceSpeech,
    sourceSentences,
  );
}
