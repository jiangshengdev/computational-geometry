import assert from "node:assert/strict";
import { test } from "node:test";
import { pages } from "./storyboard.ts";
import { audioLeadFrames, fps, timelineFor, visualAt } from "./timeline.ts";

test("full and chapter timelines hold complete pages without delaying in-page steps", () => {
  for (const issue of [undefined, "204", "205", "206", "207"]) {
    const rows = timelineFor(issue);
    let from = 0;
    for (const [index, row] of rows.entries()) {
      assert.equal(row.from, from);
      const endsPage = rows[index + 1]?.page !== row.page;
      const pause =
        (row.durationInFrames - audioLeadFrames - row.speechFrames) / fps;
      if (row.pauseAfter) {
        assert.equal(pause, 4);
        assert.equal(
          visualAt(row, audioLeadFrames + row.speechFrames - 1).thinking,
          false,
        );
        assert.equal(visualAt(row, row.durationInFrames - 1).thinking, true);
      } else if (endsPage) {
        assert.equal(pause, pages[row.page].holdAfterSeconds ?? 3);
      } else {
        assert.equal(pause, 0.4);
      }
      if (endsPage) {
        const first = visualAt(row, audioLeadFrames + row.speechFrames);
        const last = visualAt(row, row.durationInFrames - 1);
        assert.equal(first.visibleStep, pages[row.page].lines.length, row.id);
        assert.deepEqual(last, first, row.id);
        assert.equal(last.progress, 1, row.id);
        assert.notEqual(last.caption, "", row.id);
      }
      from += row.durationInFrames;
    }
  }
});
