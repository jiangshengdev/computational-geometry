import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pageList, shots } from "../src/storyboard.ts";
import {
  rows,
  visualAt,
  durationInFrames,
  audioLeadFrames,
  fps,
  timingKind,
  audio,
  cuesFor,
} from "../src/timeline.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import trace from "../src/case-evidence.json" with { type: "json" };
import { checkAudio } from "./check-audio.ts";
import { phraseTime } from "../../../shared/speech/timing.ts";
assert.equal(timingKind, "measured-narration");
assert.equal(shots.length, 45);
assert.equal(new Set(shots.map((s) => s.id)).size, 45);
assert.deepEqual(
  Object.keys(narration),
  shots.map((s) => s.id),
);
assert.equal(trace.multiway.events.length, 7);
assert.equal(
  trace.multiway.events.reduce((sum, e) => sum + e.groups, 0),
  10,
);
assert.equal(trace.multiway.results.length, 6);
assert.deepEqual(
  trace.overlap.events.map((e) => e.newPairs),
  [1, 2, 0, 0],
);
assert.deepEqual(trace.overlap.events[2].activeAfter, [0, 1]);
assert.deepEqual(trace.multiway.events[3].activeAfter, [1, 3, 0]);
assert.equal(trace.multiway.events[3].groups, 4);
for (const [i, row] of rows.entries()) {
  assert.equal(
    row.from,
    i ? rows[i - 1].from + rows[i - 1].durationInFrames : 0,
  );
  assert.ok(row.captions.length > 0);
  assert.ok(row.captions[0].start >= audioLeadFrames);
  assert.equal(row.speechFrames, Math.ceil(audio[row.id].duration * fps));
  assert.equal(row.audioEndFrame, audioLeadFrames + row.speechFrames);
  for (const caption of row.captions) {
    assert.ok(caption.end > caption.start && caption.end <= row.audioEndFrame);
    assert.equal(visualAt(row, caption.start).caption, caption.text);
  }
  assert.ok(row.captions.at(-1)!.end <= row.audioEndFrame);
  assert.equal(
    visualAt(row, row.durationInFrames - 1).caption,
    row.captions.at(-1)!.text,
  );
  assert.equal(visualAt(row, row.durationInFrames - 1).visibleStep, row.step);
  assert.equal(visualAt(row, row.durationInFrames - 1).progress, 1);
  assert.ok(!/[，,]/.test(narration[row.id as keyof typeof narration]));
  if (rows[i + 1]?.page !== row.page)
    assert.ok(row.durationInFrames - row.audioEndFrame >= 2 * fps);
}
for (const page of pageList) {
  assert.ok(page.source && page.reference && page.addition);
  assert.ok(page.steps.length > 0);
}
for (const [id, phrase] of [
  ["TW21", "当 x 坐标为二时。"],
  ["TW26", "只有一个组并且没有点输入时。"],
]) {
  const row = rows.find((r) => r.id === id)!;
  const switchFrame = row.captions.find((c) => c.source === 1)!.start;
  const measured =
    audioLeadFrames +
    Math.floor((phraseTime(audio[id], phrase, "start") * fps) / 1000);
  assert.equal(switchFrame, measured);
  assert.equal(visualAt(row, switchFrame - 1).captionSource, 0);
  assert.equal(visualAt(row, switchFrame).captionSource, 1);
}
for (const row of rows) {
  const cues = cuesFor(row);
  for (const frame of [
    ...cues.ledger,
    ...cues.inputs,
    ...cues.neighbors,
    cues.motion.start,
    cues.motion.end,
  ])
    assert.ok(frame >= 0 && frame < row.audioEndFrame);
  if (row.id === "TW06")
    assert.equal(visualAt(row, row.audioEndFrame).ledgerCount, 7);
  if (["TW22", "TW23"].includes(row.id))
    assert.ok(visualAt(row, row.audioEndFrame).membersRemoved);
}
console.log(JSON.stringify(checkAudio(process.argv.includes("--decode"))));
console.log(
  `PASS ${shots.length} measured shots, ${pageList.length} complete page holds, ${durationInFrames} frames (${durationInFrames / fps}s); real trace ledgers verified.`,
);
console.log(
  "Narration SHA256 " +
    createHash("sha256")
      .update(
        readFileSync(new URL("../src/narration-text.json", import.meta.url)),
      )
      .digest("hex"),
);
