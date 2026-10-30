import assert from "node:assert/strict";
import katex from "katex";
import {
  storyboard,
  references,
  type ReferenceId,
  type Reference,
} from "../src/storyboard.ts";
import { pages } from "../src/lesson.ts";
import { timelineFor, visualAt, fps } from "../src/timeline.ts";
if (process.argv.includes("--decode"))
  throw Error(
    "The current preview has no measured narration audio. Historic audio cannot validate #306; synthesis and synchronization require separate authorization for #314.",
  );
const introduced = new Set<ReferenceId>(["example"]);
const ids = new Set<string>();
for (const page of storyboard) {
  assert(!ids.has(page.id), `Duplicate page ${page.id}`);
  ids.add(page.id);
  for (const id of page.basis)
    assert(introduced.has(id), `${page.id}: reference ${id} not introduced`);
  const local = new Set(page.basis);
  for (const step of page.steps) {
    for (const id of step.use ?? [])
      assert(local.has(id), `${page.id}: source ${id} not on current page`);
    if (step.publish) {
      introduced.add(step.publish);
      local.add(step.publish);
    }
    assert(
      step.caption && step.seconds >= 8,
      `${page.id}: missing teaching explanation/read time`,
    );
    if (step.math) katex.renderToString(step.math, { throwOnError: true });
    for (const term of step.focus ?? [])
      assert(step.math?.includes(term), `${page.id}: target emphasis absent`);
  }
  for (const line of pages[page.id].lines)
    if (line.math) katex.renderToString(line.math, { throwOnError: true });
}
for (const source of Object.values(references) as Reference[])
  if (source.math) katex.renderToString(source.math, { throwOnError: true });
const rows = timelineFor();
for (const [index, row] of rows.entries()) {
  assert.equal(
    row.from,
    index ? rows[index - 1].from + rows[index - 1].durationInFrames : 0,
    "Preview gap/overlap",
  );
  for (const stage of row.stages) {
    assert.equal(visualAt(row, stage.frame).visibleStep, stage.step);
    if (stage.frame > 0)
      assert.equal(visualAt(row, stage.frame - 1).visibleStep, stage.step - 1);
    for (const offset of [0, fps, 2 * fps, 4 * fps])
      assert.equal(
        visualAt(row, stage.frame + offset).visibleStep,
        stage.step,
        "Cue reset hides teaching content",
      );
  }
  assert(
    row.durationInFrames - row.readingFrames >= 2 * fps,
    "Insufficient page hold",
  );
  assert.deepEqual(
    visualAt(row, row.readingFrames),
    visualAt(row, row.durationInFrames - 1),
    "Page hold changes completed content",
  );
}
console.log(
  `PASS: ${storyboard.length} pages, ${storyboard.reduce((n, p) => n + p.steps.length, 0)} steps; provisional visual duration ${rows.reduce((n, r) => n + r.durationInFrames, 0) / fps}s; no audio verification claimed.`,
);
