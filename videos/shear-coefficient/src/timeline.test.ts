import assert from "node:assert/strict";
import { test } from "node:test";
import timing from "./audio-timing.json" with { type: "json" };
import { phraseTime } from "./speech-timing.ts";
import { audioLeadFrames, fps, timelineFor, visualAt } from "./timeline.ts";

test("A reaches B's horizontal coordinate when narration says directly above B", () => {
  const row = timelineFor().find((shot) => shot.id === "210-23")!;
  const ms = phraseTime(timing["210-23"], "正上方", "end");
  const frame = audioLeadFrames + (ms * fps) / 1000;
  assert.equal(visualAt(row, frame).progress, 0.5);
});
