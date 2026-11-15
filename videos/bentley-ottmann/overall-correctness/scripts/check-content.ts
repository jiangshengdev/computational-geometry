import assert from "node:assert/strict";
import {
  rows,
  visualAt,
  cuesFor,
  fps,
  audioLeadFrames,
  audio,
  durationInFrames,
} from "../src/timeline.ts";
import { pageList } from "../src/storyboard.ts";
import { checkAudio } from "./check-audio.ts";
assert(process.argv.slice(2).every((arg) => arg === "--decode"));
assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
let end = 0;
for (const [i, row] of rows.entries()) {
  assert.equal(row.from, end);
  end += row.durationInFrames;
  assert.equal(row.speechFrames, Math.ceil(audio[row.id].duration * fps));
  assert.equal(row.audioEndFrame, audioLeadFrames + row.speechFrames);
  assert(row.durationInFrames >= row.audioEndFrame + row.pauseAfter * fps);
  const timing = cuesFor(row);
  for (const frame of Object.values(timing))
    assert(frame >= 0 && frame < row.audioEndFrame);
  const final = visualAt(row, row.durationInFrames - 1);
  if (row.id === "OC35") {
    assert(timing.extension < timing.queued);
    assert.equal(visualAt(row, timing.extension - 1).coverageStage, "before");
    assert.equal(visualAt(row, timing.extension).coverageStage, "extended");
    assert.equal(final.coverageStage, "queued");
  }
  if (row.id === "OC39")
    assert(final.preservationAfter && !final.preservationEmphasis);
  if (row.id === "OC45") {
    assert(timing.taken < timing.participants);
    assert(!visualAt(row, timing.participants - 1).nextEventParticipants);
    assert(final.nextEventTaken && final.nextEventParticipants);
  }
  if (row.id === "OC52") assert(final.emptyQueueConclusion);
  for (const cue of row.captions) {
    assert(cue.end > cue.start);
    assert(cue.end <= row.durationInFrames);
    assert.equal(visualAt(row, cue.start).caption, cue.text);
  }
  assert.equal(
    visualAt(row, row.durationInFrames - 1).caption,
    row.captions.at(-1)?.text,
  );
  if (rows[i + 1]?.page !== row.page)
    assert(row.durationInFrames - row.captions.at(-1)!.end >= 2 * fps);
  if (rows[i + 1]?.page === row.page)
    assert.equal(visualAt(rows[i + 1], 0).caption, row.captions.at(-1)?.text);
}
assert.equal(end, durationInFrames);
console.log(JSON.stringify(checkAudio(process.argv.includes("--decode"))));
console.log(
  `PASS: ${pageList.length} pages, ${rows.length} measured shots, ${durationInFrames} frames; complete original audio, semantic cue order, subtitle boundaries, same-page retention and 2-second page holds. No listening performed.`,
);
