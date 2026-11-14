import assert from "node:assert/strict";
import { rows, visualAt, fps, durationInFrames } from "../src/timeline.ts";
import { pageList } from "../src/storyboard.ts";
assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
let end = 0;
for (const [i, row] of rows.entries()) {
  assert.equal(row.from, end);
  end += row.durationInFrames;
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
console.log(
  `PASS: ${pageList.length} pages, ${rows.length} silent shots; contiguous timeline, subtitle boundaries, same-page retention and 2-second page holds. Mathematical proof requires separate review.`,
);
