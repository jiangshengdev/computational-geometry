import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rows, visualAt, fps, audioLeadFrames } from "../src/timeline.ts";
import { shots, pageList } from "../src/storyboard.ts";
import { inputs, type Name } from "../src/example.ts";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { updateSentencePauses } from "./sentence-plan.ts";
import { verifyRecordings, readTiming } from "./measured-audio.ts";
import { fileURLToPath } from "node:url";
const formal = verifyRecordings(
  fileURLToPath(new URL("../public/narration/", import.meta.url)),
  readTiming(
    fileURLToPath(new URL("../src/audio-timing.json", import.meta.url)),
  ),
  process.argv.includes("--decode"),
);
assert.deepEqual(
  JSON.parse(
    readFileSync(new URL("../src/captions.json", import.meta.url), "utf8"),
  ),
  formal.captions,
  "Regenerate stale captions",
);

// Validate observable teaching behavior, not exact wording or source shape.
updateSentencePauses(false);
const narration = JSON.parse(
  readFileSync(new URL("../src/narration-text.json", import.meta.url), "utf8"),
);
const annotated = JSON.parse(
  readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
);
// Offline schema/text validation only. Never invoke synthesize or contact Azure.
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
  commas: "document",
  fingerprint: true,
});
assert.deepEqual(Object.keys(annotated), Object.keys(narration));
assert.deepEqual(
  Object.keys(narration),
  shots.map((s) => s.id),
);
for (const [index, row] of rows.entries()) {
  assert.equal(row.audioEndFrame, audioLeadFrames + row.speechFrames);
  assert(
    row.durationInFrames >= row.audioEndFrame + (row.thinkAfter ?? 1) * fps,
  );
  assert(
    row.captions.every(
      (c) => c.start >= audioLeadFrames && c.end <= row.audioEndFrame,
    ),
  );
  for (let i = 1; i < row.captions.length; i++)
    assert(
      row.captions[i].start >= row.captions[i - 1].end,
      `${row.id}: caption overlap`,
    );
  assert.equal(
    row.captions.map((c) => c.text).join(""),
    row.cues.map((c) => c.caption).join(""),
    `${row.id}: subtitle punctuation lost`,
  );
  assert.equal(
    row.from,
    index ? rows[index - 1].from + rows[index - 1].durationInFrames : 0,
  );
  assert.equal(visualAt(row, 0).visibleStep, row.visibleStep);
  assert(!/[,，]/.test(narration[row.id]), `${row.id}: speech comma`);
  assert.equal(
    buildSpeechDocument(annotated[row.id], row.id).text,
    narration[row.id],
    `${row.id}: annotations changed frozen text`,
  );
  for (const cue of row.cues)
    if (cue.focus)
      assert(
        row.text.includes(cue.focus),
        `${row.id}: unused semantic focus ${cue.focus}`,
      );
  let previous = visualAt(row, 0);
  for (let frame = 1; frame < row.durationInFrames; frame++) {
    const state = visualAt(row, frame);
    for (const target of previous.reached)
      assert(
        state.reached.includes(target),
        `${row.id}: lost introduced object`,
      );
    if (state.target && state.target === previous.target)
      assert(
        state.progress >= previous.progress,
        `${row.id}: restarted semantic action`,
      );
    assert(state.progress >= 0 && state.progress <= 1);
    previous = state;
  }
  const end = visualAt(row, row.durationInFrames - 1);
  assert.equal(end.target, null);
  assert.equal(end.caption, row.captions[row.captions.length - 1].text);
  const next = rows[index + 1];
  if (next?.page === row.page)
    assert.equal(visualAt(next, 0).caption, end.caption);
  else assert(row.durationInFrames - row.audioEndFrame >= 3 * fps);
}
const slope = (name: Name) => {
  const { start: a, end: b } = inputs[name];
  return (b[1] - a[1]) / (b[0] - a[0]);
};
for (const { start: a, end: b } of Object.values(inputs)) {
  assert(a[0] < b[0]);
  assert(a[0] <= 4 && b[0] >= 4);
  assert.equal((b[0] - a[0]) * (4 - a[1]) - (b[1] - a[1]) * (4 - a[0]), 0);
}
assert.deepEqual(
  (["A", "C", "D"] as Name[]).sort((a, b) => slope(b) - slope(a)),
  ["D", "A", "C"],
);
assert.deepEqual(
  (["B", "C", "D"] as Name[]).sort((a, b) => slope(a) - slope(b)),
  ["C", "B", "D"],
);
assert.equal(slope("A"), slope("F"));
assert.equal(
  Math.max(inputs.A.start[0], inputs.F.start[0]),
  Math.min(inputs.A.end[0], inputs.F.end[0]),
);
console.log(
  `PASS ${shots.length} shots / ${pageList.length} pages: measured audio, article arithmetic, caption retention, step reveal, semantic cue continuity and page holds. Flags: ${JSON.stringify(formal.counts)}. Actual listening not performed.`,
);
