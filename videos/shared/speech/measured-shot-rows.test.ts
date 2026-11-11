import { test } from "node:test";
import assert from "node:assert/strict";
import { measuredShotRows } from "./measured-shot-rows.ts";
import type { AudioTiming, Caption } from "./timing.ts";

test("measured rows preserve full audio and page holds with an explicit zero between-shot pause", () => {
  const shots = [
    { id: "one", page: "page", visibleStep: 1 },
    { id: "two", page: "page", visibleStep: 2 },
    { id: "three", page: "next", visibleStep: 1 },
  ];
  const audio = Object.fromEntries(
    shots.map(({ id }) => [
      id,
      {
        duration: 1.001,
        speech: "甲。",
        voice: "test",
        fingerprint: "test",
        words: [
          {
            text: "甲",
            textOffset: 0,
            wordLength: 1,
            startMs: 70,
            durationMs: 800,
          },
        ],
      },
    ]),
  ) as Record<string, AudioTiming>;
  const captions = Object.fromEntries(
    shots.map(({ id }) => [
      id,
      [
        {
          text: "甲。",
          startMs: 70,
          endMs: 870,
          timestampMs: null,
          confidence: null,
          source: 0,
        },
      ],
    ]),
  ) as Record<string, (Caption & { source: number })[]>;
  const options = {
    shots,
    audio,
    captions,
    pages: { page: { holdAfterSeconds: 3 }, next: { holdAfterSeconds: 3 } },
    fps: 60,
    audioLeadFrames: 30,
  };
  const standard = measuredShotRows(options);
  const immediate = measuredShotRows({
    ...options,
    betweenShotPauseSeconds: 0,
  });
  assert.equal(standard[0].durationInFrames, 30 + 61 + 60);
  assert.equal(immediate[0].durationInFrames, 30 + 61);
  for (const rows of [standard, immediate]) {
    assert.equal(rows[0].audioEndFrame, 91);
    assert.equal(rows[1].durationInFrames, 30 + 61 + 180);
    assert.equal(rows[2].durationInFrames, 30 + 61 + 180);
    assert.equal(rows[1].from, rows[0].durationInFrames);
    assert.equal(
      rows[2].from,
      rows[0].durationInFrames + rows[1].durationInFrames,
    );
    assert.equal(rows[1].previousCaption, "甲。");
    assert.equal(rows[2].previousCaption, "");
  }
  assert.throws(
    () => measuredShotRows({ ...options, betweenShotPauseSeconds: -1 }),
    /nonnegative/,
  );
});
