import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import katex from "katex";
import { plannedDocuments } from "./planned-documents.ts";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { validateWords } from "../../../shared/speech/timing.ts";
import { fileURLToPath } from "node:url";
import { shots, pageList } from "../src/storyboard.ts";
import {
  colorMath,
  normalizeMath,
  type ColorMark,
} from "../../../shared/math/semantic-colors.ts";
import {
  objectMarks,
  focusMarks,
  gestureMarks,
} from "../src/teaching-colors.ts";
import {
  rows,
  visualAt,
  timingKind,
  fps,
  audioLeadFrames,
  audio,
} from "../src/timeline.ts";

const plainBytes = readFileSync(
  new URL("../src/narration-text.json", import.meta.url),
  "utf8",
);
assert.equal(
  createHash("sha256").update(plainBytes).digest("hex"),
  "87e0dbe65e486d0ef007be4593dac3b6f0e2408df6578dfce58b765d37101214",
  "Frozen narration changed",
);
const plain = JSON.parse(plainBytes);
const speechBytes = readFileSync(
  new URL("../src/speech-text.json", import.meta.url),
  "utf8",
);
assert.equal(
  createHash("sha256").update(speechBytes).digest("hex"),
  "c3a9b1af770d9a73abb28f1d03c847fedc9cfb5081ee45bcbe2a46d8dd2d1aad",
  "Independently reviewed pronunciation changed",
);
const speech = JSON.parse(speechBytes);
const requests = Object.fromEntries(
  plannedDocuments().map((document) => [document.id, document]),
);
assert.deepEqual(
  Object.keys(plain),
  shots.map((s) => s.id),
);
assert.deepEqual(Object.keys(speech), Object.keys(plain));
assert.equal(timingKind, "measured-narration");
const { verifyAlignment } = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});

// Keep mathematical atom classes and script groups, discarding only color nodes.
function withoutColor(node: unknown): unknown {
  if (Array.isArray(node))
    return node.flatMap((child) => {
      const value = withoutColor(child);
      return Array.isArray(value) ? value : [value];
    });
  if (!node || typeof node !== "object") return node;
  const fields = node as Record<string, unknown>;
  if (fields.type === "color") return withoutColor(fields.body);
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => key !== "loc")
      .map(([key, value]) => {
        const result = withoutColor(value);
        return [
          key,
          !Array.isArray(value) && Array.isArray(result) && result.length === 1
            ? result[0]
            : result,
        ];
      }),
  );
}
const parse = (text: string) =>
  withoutColor(
    (
      katex as unknown as {
        __parse: (text: string, options: { strict: string }) => unknown;
      }
    ).__parse(text, { strict: "error" }),
  );
function checkMarks(row: (typeof rows)[number], marks: ColorMark[]) {
  const text = normalizeMath(row.math ?? row.text ?? "");
  for (const mark of marks) {
    const term = normalizeMath(mark.term);
    assert(text.includes(term), `${row.id}: unused teaching mark ${term}`);
    if (!/[\u3400-\u9fff]/.test(term))
      assert(
        colorMath(text, undefined, [mark]).includes(
          `\\textcolor{${mark.color}}{${term}}`,
        ),
        `${row.id}: mark does not match a whole quantity: ${term}`,
      );
  }
  if (row.math) {
    const colored = colorMath(row.math, undefined, marks);
    katex.renderToString(colored, { throwOnError: true, strict: "error" });
    assert.deepEqual(
      parse(colored),
      parse(normalizeMath(row.math)),
      `${row.id}: coloring changed mathematical structure`,
    );
  }
}
for (const [index, row] of rows.entries()) {
  assert.equal(
    focusMarks[row.id]?.length,
    row.captions.length,
    `${row.id}: focus/subtitle correspondence changed`,
  );
  const objects = objectMarks[row.id] ?? [];
  checkMarks(row, objects);
  for (const marks of [
    ...focusMarks[row.id],
    ...Object.values(gestureMarks[row.id] ?? {}),
  ])
    checkMarks(row, [...objects, ...marks]);
  assert.equal(visualAt(row, 0).activeCaption, null);
  for (const [phrase, caption] of row.captions.entries()) {
    assert.equal(visualAt(row, caption.start).activeCaption, phrase);
    assert.notEqual(visualAt(row, caption.end).activeCaption, phrase);
  }
  assert.equal(visualAt(row, row.durationInFrames - 1).activeCaption, null);
  const recording = audio[row.id];
  const path = fileURLToPath(
    new URL(`../public/narration/${recording.audioFile}`, import.meta.url),
  );
  assert.equal(recording.audioSha256, audioSha256(path));
  assert.equal(recording.fingerprint, requests[row.id].fingerprint);
  validateWords(recording);
  verifyAlignment(recording, path);
  const parts = speech[row.id] as (string | { text: string; pinyin: string })[];
  assert.equal(
    parts.map((part) => (typeof part === "string" ? part : part.text)).join(""),
    plain[row.id],
  );
  assert.equal(requests[row.id].text, plain[row.id]);
  assert.doesNotMatch(plain[row.id], /[,，]/);
  if (row.math)
    katex.renderToString(row.math, { throwOnError: true, strict: "error" });
  assert.equal(
    row.from,
    index ? rows[index - 1].from + rows[index - 1].durationInFrames : 0,
  );
  assert.equal(visualAt(row, 0).visibleStep, row.visibleStep);
  assert(row.captions[0].start >= audioLeadFrames);
  assert.equal(
    visualAt(row, row.durationInFrames - 1).caption,
    row.captions[row.captions.length - 1].text,
  );
  assert.equal(visualAt(row, row.durationInFrames - 1).target, null);
  const page = pageList.find((entry) => entry.id === row.page)!;
  if (rows[index + 1]?.page !== row.page)
    assert(
      row.durationInFrames - row.audioEndFrame >= page.holdAfterSeconds * fps,
    );
  assert(
    row.durationInFrames - row.audioEndFrame >= (row.thinkAfter ?? 1) * fps,
  );
  assert(
    row.durationInFrames >=
      audioLeadFrames + row.speechFrames + row.pauseAfter * fps,
  );
  for (const gesture of row.gestures) {
    assert(gesture.end > gesture.start);
    assert.equal(visualAt(row, gesture.start).target, gesture.target);
    assert(visualAt(row, gesture.end).reached.includes(gesture.target));
    assert(gesture.end <= row.audioEndFrame);
  }
}
console.log(
  `PASS ${rows.length} measured source/assessment bindings, word times, captions, semantic windows, complete-source slots and page holds; actual listening acceptance remains pending`,
);
