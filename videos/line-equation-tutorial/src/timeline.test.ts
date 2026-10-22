import assert from "node:assert/strict";
import { test } from "node:test";
import timingData from "./audio-timing.json" with { type: "json" };
import { derivationAt, derivations } from "./derivations.ts";
import {
  chapters,
  offsets,
  totalFrames,
  fps,
  storyboardSeconds,
} from "./timeline.ts";

const timing: Record<string, { frames: number; duration: number }> = timingData;

test("only page endings gain reading time; chapter and video offsets include it", () => {
  let absolute = 0;
  for (const [index, chapter] of chapters.entries()) {
    assert.equal(offsets[index], absolute);
    let from = 0;
    for (const row of chapter.rows) {
      assert.equal(row.from, from);
      const page = derivations.find(
        (page) => page.rows[page.rows.length - 1] === row.id,
      );
      const hold = page ? (page.holdAfterSeconds ?? 3) : index === 0 ? 3 : 0;
      const originalFrames = timing[row.id].frames * 2;
      assert.equal(row.animationDurationInFrames, originalFrames);
      if (hold) {
        const silence =
          row.durationInFrames / fps - 0.2 - timing[row.id].duration;
        assert.ok(silence >= hold && silence < hold + 1 / fps, row.id);
        if (page) {
          for (const frame of [
            Math.ceil((0.2 + timing[row.id].duration) * fps),
            row.durationInFrames - 1,
          ]) {
            assert.equal(
              derivationAt(row.id, storyboardSeconds(row, frame)).step
                .visibleCount,
              page.lines.length,
              row.id,
            );
          }
        }
      } else {
        assert.equal(row.durationInFrames, originalFrames, row.id);
      }
      from += row.durationInFrames;
    }
    assert.equal(chapter.durationInFrames, from);
    absolute += from;
  }
  assert.equal(totalFrames, absolute);
});

test("added holds preserve every original animation frame and freeze its final state", () => {
  for (const row of chapters.flatMap((chapter) => chapter.rows)) {
    const originalFrames = timing[row.id].frames * 2;
    for (let frame = 0; frame < originalFrames; frame++) {
      assert.equal(
        storyboardSeconds(row, frame),
        (frame / originalFrames) * (row.end - row.start),
        row.id,
      );
    }
    assert.equal(
      storyboardSeconds(row, row.durationInFrames - 1),
      storyboardSeconds(row, originalFrames - 1),
      row.id,
    );
  }
});
