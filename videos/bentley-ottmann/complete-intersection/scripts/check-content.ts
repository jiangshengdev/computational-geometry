import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import katex from "katex";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { shots } from "../src/storyboard.ts";
import { rows, visualAt, fps } from "../src/timeline.ts";

const read = (name: string) =>
  readFileSync(new URL(`../src/${name}.json`, import.meta.url), "utf8");
const plainBytes = read("narration-text");
assert.equal(
  createHash("sha256").update(plainBytes).digest("hex"),
  "d8662cd758df1e07baedfb876af0aaffc2f25043a3037b2341a1250f86a5cda8",
  "Pure text changed after independent freeze; return to text review",
);
const plain: Record<string, string> = JSON.parse(plainBytes);
const speech = JSON.parse(read("speech-text"));
const tools = createSpeechTools(sdk, {
  voice: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
  commas: "document",
  fingerprint: true,
});
assert.deepEqual(Object.keys(plain).sort(), shots.map((s) => s.id).sort());
assert.deepEqual(Object.keys(speech).sort(), Object.keys(plain).sort());
for (const [index, row] of rows.entries()) {
  const document = tools.buildSpeechDocument(speech[row.id], row.id);
  assert.equal(
    document.text,
    plain[row.id],
    `${row.id}: pronunciation changed frozen text`,
  );
  assert.doesNotMatch(
    document.text,
    /德尔塔|欧米伽/,
    `${row.id}: Greek names must use English pronunciation`,
  );
  for (const name of new Set(document.text.match(/\b(?:delta|omega)\b/g))) {
    assert.equal(
      document.ssml.split(`<lang xml:lang="en-US">${name}</lang>`).length - 1,
      document.text.split(name).length - 1,
      `${row.id}: ${name} must be spoken as a complete English name`,
    );
  }
  if (row.math)
    katex.renderToString(row.math, { throwOnError: true, strict: "error" });
  if (row.targets)
    assert.equal(
      row.targets.length,
      row.captions.length,
      `${row.id}: missing phrase/object correspondence`,
    );
  assert.equal(
    row.from,
    index ? rows[index - 1].from + rows[index - 1].durationInFrames : 0,
    "Timeline gap or overlap",
  );
  assert.equal(
    visualAt(row, 0).visibleStep,
    row.visibleStep,
    "Incomplete row before first reading phrase",
  );
  assert.equal(
    visualAt(row, row.durationInFrames - 1).target,
    null,
    "Gesture persists after reading phrase",
  );
  assert.equal(
    visualAt(row, row.durationInFrames - 1).caption,
    row.captions[row.captions.length - 1].text,
    "Caption lost during pause",
  );
  assert(
    row.durationInFrames - row.readingFrames >= (row.thinkAfter ?? 1) * fps,
  );
}
console.log(
  `PASS ${rows.length} text/SSML documents and provisional visual rows; no synthesis or audio acceptance`,
);
