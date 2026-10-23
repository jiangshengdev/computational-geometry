import assert from "node:assert/strict";
import { test } from "node:test";
import timingData from "./audio-timing.json" with { type: "json" };
import { phraseTime } from "./speech-timing.ts";
import { audioLeadFrames, fps, timelineFor, visualAt } from "./timeline.ts";
import { pages } from "./storyboard.ts";
import type { AudioTiming } from "./speech-timing.ts";

const timing = timingData as Record<string, AudioTiming>;

test("A reaches B's horizontal coordinate when narration says directly above B", () => {
  const row = timelineFor().find((shot) => shot.id === "210-23")!;
  const ms = phraseTime(timing["210-23"], "正上方", "end");
  const frame = audioLeadFrames + (ms * fps) / 1000;
  assert.equal(visualAt(row, frame).progress, 0.5);
});

test("the 0.006 exercise crosses x=1 at the spoken crossing, before reaching x=1.2", () => {
  const row = timelineFor().find((shot) => shot.id === "213-14")!;
  const audio = timing[row.id];
  const frame =
    audioLeadFrames + (phraseTime(audio, "正上方", "end") * fps) / 1000;
  assert.ok(Math.abs(visualAt(row, frame).progress * 1.2 - 1) < 1e-10);
  assert.equal(visualAt(row, row.durationInFrames - 1).progress * 1.2, 1.2);
});

test("all four predictions retain the question and original points for four silent seconds", () => {
  const rows = timelineFor();
  const questions = rows.filter((row) => row.pauseAfter);
  assert.deepEqual(
    questions.map((row) => row.id),
    ["211-01", "213-01", "213-06", "213-11"],
  );
  for (const row of questions) {
    const silenceStart = audioLeadFrames + row.speechFrames;
    assert.equal(row.durationInFrames - silenceStart, 4 * fps);
    assert.equal(pages[row.page].diagram, undefined);
    const start = visualAt(row, silenceStart);
    assert.equal(start.thinking, true);
    assert.ok(start.caption.length > 0);
    for (let frame = silenceStart; frame < row.durationInFrames; frame++) {
      assert.deepEqual(visualAt(row, frame), start);
    }
    const answer = rows[rows.indexOf(row) + 1];
    assert.notEqual(answer.page, row.page);
    assert.equal(visualAt(answer, 0).visibleStep, 0);
    assert.equal(visualAt(answer, 0).caption, "");
  }
});
