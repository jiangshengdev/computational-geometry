import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { shots, pageList } from "../src/storyboard.ts";
import { inputs, results, type Name } from "../src/example.ts";
import { checkSentencePlan } from "./sentence-plan.ts";
import { checkAudio } from "./check-audio.ts";
import {
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  timingKind,
} from "../src/timeline.ts";

// Article arithmetic only, not a scan implementation: horizontal intervals and
// the single external line y=x-5 determine every pair of this five-input case.
const computed: typeof results = [];
const names: Name[] = ["A", "B", "C", "D", "Z"];
const interval = (name: Name) => [
  Math.min(inputs[name].start[0], inputs[name].end[0]),
  Math.max(inputs[name].start[0], inputs[name].end[0]),
];
assert.equal(inputs.D.start[1], inputs.D.start[0] - 5);
assert.equal(inputs.D.end[1], inputs.D.end[0] - 5);
assert.deepEqual(inputs.Z.start, [5, 0]);
assert.deepEqual(inputs.Z.end, [5, 0]);
for (const [i, a] of names.entries())
  for (const b of names.slice(i + 1)) {
    const aa = interval(a),
      bb = interval(b);
    if (a !== "D" && b !== "D" && b !== "Z") {
      assert.equal(inputs[a].start[1], 0);
      assert.equal(inputs[a].end[1], 0);
      const lo = Math.max(aa[0], bb[0]),
        hi = Math.min(aa[1], bb[1]);
      if (lo <= hi)
        computed.push({
          pair: `${a},${b}`,
          from: [lo, 0],
          to: [hi, 0],
          at: lo,
        });
    } else if (aa[0] <= 5 && 5 <= aa[1] && bb[0] <= 5 && 5 <= bb[1])
      computed.push({ pair: `${a},${b}`, from: [5, 0], to: [5, 0], at: 5 });
  }
const byPair = (a: { pair: string }, b: { pair: string }) =>
  a.pair.localeCompare(b.pair);
assert.deepEqual(
  [...computed].sort(byPair),
  [...results].sort(byPair),
  "all ten unordered input pairs",
);
assert.equal(Math.max(interval("B")[0], interval("E")[0]), 8);
assert.equal(Math.min(interval("B")[1], interval("E")[1]), 8);
for (const name of ["J_1", "J_2", "J_3"] as const)
  assert.deepEqual(interval(name), [1, 5]);
const endpointXs = names.flatMap((n) => [inputs[n].start[0], inputs[n].end[0]]);
assert.equal(
  new Set(endpointXs).size,
  9,
  "distinct event positions, repeated point Z counts once",
);
const narration: Record<string, string> = JSON.parse(
  readFileSync(new URL("../src/narration-text.json", import.meta.url), "utf8"),
);
const speech: Record<string, unknown> = JSON.parse(
  readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
);
// Offline input validation only: no client, service request, audio or timing output.
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
  commas: "document",
  fingerprint: true,
});
assert.deepEqual(Object.keys(speech).sort(), shots.map((s) => s.id).sort());
assert.deepEqual(Object.keys(narration).sort(), shots.map((s) => s.id).sort());
assert.equal(timingKind, "measured-narration");
const audioResult = checkAudio(process.argv.includes("--decode"));
for (const [i, row] of rows.entries()) {
  assert.equal(
    row.from,
    i ? rows[i - 1].from + rows[i - 1].durationInFrames : 0,
  );
  assert.equal(
    row.captions.map((c) => c.text).join(""),
    row.captions.length ? shots[i].captions.join("") : "",
  );
  assert(row.source && row.first && row.action && row.reference);
  assert(!/[，,]/.test(narration[row.id]), `${row.id}: comma in spoken text`);
  checkSentencePlan(speech[row.id], narration[row.id], row.id);
  assert.equal(
    buildSpeechDocument(speech[row.id], row.id).text,
    narration[row.id],
    `${row.id}: pinyin input changed frozen text`,
  );
  if (i && rows[i - 1].page === row.page) {
    assert.equal(
      visualAt(row, 0).caption,
      visualAt(rows[i - 1], rows[i - 1].durationInFrames - 1).caption,
      `${row.id}: caption retreats at transition`,
    );
  }
  const end = visualAt(row, row.durationInFrames - 1);
  assert.equal(end.visibleStep, row.visibleStep);
  assert.equal(end.target, null);
  assert.equal(end.caption, row.captions[row.captions.length - 1].text);
  assert(
    row.durationInFrames - audioLeadFrames - row.speechFrames >=
      (row.thinkAfter ?? 1) * fps,
  );
  if (rows[i + 1]?.page !== row.page) assert(row.pauseAfter >= 3);
  assert.equal(row.audioEndFrame, audioLeadFrames + row.speechFrames);
  for (const cue of [...row.captions, ...row.operations]) {
    assert(
      cue.start >= audioLeadFrames && cue.end > cue.start,
      `${row.id}: invalid measured cue`,
    );
    assert(
      cue.end <= row.audioEndFrame,
      `${row.id}: cue outside complete audio`,
    );
  }
  assert(!visualAt(row, row.audioEndFrame - 1).thinking);
  assert(visualAt(row, row.audioEndFrame).thinking);
  let last = -1;
  for (let f = 0; f < row.durationInFrames; f++) {
    const state = visualAt(row, f);
    assert(state.reachedCaption >= last, `${row.id}: content retreats`);
    last = state.reachedCaption;
  }
}
console.log(
  `PASS: ${shots.length} shots, ${pageList.length} pages; complete article pairs, subtitle preservation, measured cues, complete audio and holds. ${JSON.stringify(audioResult)}`,
);
