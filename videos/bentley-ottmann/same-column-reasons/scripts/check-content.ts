import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pageList, shots } from "../src/storyboard.ts";
import {
  rows,
  visualAt,
  fps,
  leadFrames,
  timingKind,
} from "../src/timeline.ts";

const narration = JSON.parse(
  readFileSync(new URL("../src/narration-text.json", import.meta.url), "utf8"),
) as Record<string, string>;
const speech = JSON.parse(
  readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
) as Record<string, (string | { text: string; pinyin: string })[]>;
assert.deepEqual(
  Object.keys(narration),
  shots.map((s) => s.id),
);
assert.deepEqual(Object.keys(speech), Object.keys(narration));
assert.equal(timingKind, "provisional-silent-reading");
assert.equal(new Set(shots.map((s) => s.id)).size, shots.length);
for (const [index, row] of rows.entries()) {
  assert.equal(
    row.from,
    index ? rows[index - 1].from + rows[index - 1].durationInFrames : 0,
  );
  assert.equal(
    row.captions.map((c) => c.text).join(""),
    shots[index].captions.join(""),
    `${row.id}: subtitle punctuation changed`,
  );
  assert(row.captions.every((c) => c.end > c.start));
  assert.equal(
    visualAt(row, 0).visibleStep,
    row.visibleStep,
    `${row.id}: teaching line must precede explanation`,
  );
  const last = visualAt(row, row.durationInFrames - 1);
  assert(last.thinking);
  assert.equal(last.caption, row.captions[row.captions.length - 1].text);
  assert.equal(last.visibleStep, row.visibleStep);
  if (rows[index + 1]?.page !== row.page) assert(row.pauseAfter >= 3);
  if (index && rows[index - 1].page === row.page)
    assert.equal(
      visualAt(row, 0).caption,
      visualAt(rows[index - 1], rows[index - 1].durationInFrames - 1).caption,
    );
  assert.equal(
    row.durationInFrames,
    leadFrames + row.readingFrames + row.pauseAfter * fps,
  );
  assert(!/[,，]/.test(narration[row.id]), `${row.id}: speech punctuation`);
  assert(!/[\u3400-\u9fff]\s+[\u3400-\u9fff]/u.test(narration[row.id]));
  for (const sentence of narration[row.id].split(/[。！？]/).filter(Boolean))
    assert(
      !/^[A-Za-z]|[A-Za-z]$/.test(sentence.trim()),
      `${row.id}: exposed sentence-edge letter`,
    );
  assert.equal(
    speech[row.id]
      .map((part) => (typeof part === "string" ? part : part.text))
      .join(""),
    narration[row.id],
    `${row.id}: pronunciation altered frozen text`,
  );
  for (const part of speech[row.id])
    if (typeof part !== "string") {
      assert.deepEqual(Object.keys(part).sort(), ["pinyin", "text"]);
      assert(/^[\u3400-\u9fff]+$/u.test(part.text));
      const syllables = part.pinyin.split(" ");
      assert.equal(syllables.length, [...part.text].length);
      assert(syllables.every((s) => /^[a-zv]+[1-5]$/.test(s)));
    }
}
console.log(
  `PASS: ${pageList.length} pages; ${shots.length} shots; silent reading estimates, full subtitles, retained steps and captions, page holds, frozen narration binding. Pronunciation semantics require independent review.`,
);
