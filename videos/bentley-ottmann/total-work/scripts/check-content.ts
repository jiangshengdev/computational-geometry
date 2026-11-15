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
} from "../src/timeline.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import trace from "../src/case-evidence.json" with { type: "json" };
assert.equal(timingKind, "provisional-silent-reading");
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
  assert.equal(row.captions[0].start, audioLeadFrames);
  assert.equal(row.captions.at(-1)!.end, audioLeadFrames + row.readingFrames);
  assert.equal(
    visualAt(row, row.durationInFrames - 1).caption,
    row.captions.at(-1)!.text,
  );
  assert.equal(visualAt(row, row.durationInFrames - 1).visibleStep, row.step);
  assert.equal(visualAt(row, row.durationInFrames - 1).progress, 1);
  assert.ok(!/[，,]/.test(narration[row.id as keyof typeof narration]));
  if (rows[i + 1]?.page !== row.page)
    assert.ok(
      row.durationInFrames - audioLeadFrames - row.readingFrames >= 2 * fps,
    );
}
for (const page of pageList) {
  assert.ok(page.source && page.reference && page.addition);
  assert.ok(page.steps.length > 0);
}
for (const name of ["Composition.tsx", "Root.tsx", "timeline.ts"])
  assert.ok(
    !/\b(Audio|Video|OffthreadVideo)\b|staticFile\(/.test(
      readFileSync(new URL("../src/" + name, import.meta.url), "utf8"),
    ),
  );
console.log(
  `PASS ${shots.length} silent shots, ${pageList.length} complete page holds, ${durationInFrames} frames (${durationInFrames / fps}s); real trace ledgers verified.`,
);
console.log(
  "Narration SHA256 " +
    createHash("sha256")
      .update(
        readFileSync(new URL("../src/narration-text.json", import.meta.url)),
      )
      .digest("hex"),
);
