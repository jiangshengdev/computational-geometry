import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import katex from "katex";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { shots } from "../src/storyboard.ts";
import {
  rows,
  visualAt,
  fps,
  audio,
  audioLeadFrames,
  timingKind,
} from "../src/timeline.ts";
import { checkSentencePlan } from "./sentence-pauses.ts";
import {
  audioSha256,
  verifyPcmSource,
  decodeAudio,
  measureAudio,
} from "../../../shared/speech/audio.ts";
import { verifyAlignment } from "./azure-speech.ts";
import { narrationFile } from "../../../shared/speech/source.ts";
import { fileURLToPath } from "node:url";
import { pages } from "../src/storyboard.ts";

const read = (name: string) =>
  readFileSync(new URL(`../src/${name}.json`, import.meta.url), "utf8");
const plainBytes = read("narration-text");
assert.equal(
  createHash("sha256").update(plainBytes).digest("hex"),
  "8d2f619b4130589d300fe31d9bbef7a5a402524318607edf4b374efcbe93b65c",
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
assert.equal(timingKind, "measured-narration");
for (const [index, row] of rows.entries()) {
  const document = tools.buildSpeechDocument(speech[row.id], row.id);
  checkSentencePlan(speech[row.id], document.text, row.id);
  assert.equal(
    document.text,
    plain[row.id],
    `${row.id}: pronunciation changed frozen text`,
  );
  const recording = audio[row.id];
  const path = fileURLToPath(
    new URL(
      `../public/narration/${narrationFile(row.id, recording)}`,
      import.meta.url,
    ),
  );
  assert.equal(
    recording.fingerprint,
    document.fingerprint,
    `${row.id}: stale audio request`,
  );
  assert.equal(
    recording.speech,
    document.text,
    `${row.id}: stale spoken reference`,
  );
  assert.equal(
    recording.audioSha256,
    audioSha256(path),
    `${row.id}: audio hash mismatch`,
  );
  verifyPcmSource(path);
  if (process.argv.includes("--decode")) decodeAudio(path);
  assert.equal(recording.duration, measureAudio(path));
  verifyAlignment(recording, path);
  assert.equal(
    row.audioEndFrame,
    audioLeadFrames + Math.ceil(recording.duration * fps),
  );
  assert.equal(
    visualAt(row, audioLeadFrames - 1).caption,
    row.previousCaption,
    `${row.id}: subtitle changed before the measured audio starts`,
  );
  assert(
    row.captions[0].start > 0,
    `${row.id}: teaching line must precede speech`,
  );
  for (const [i, caption] of row.captions.entries()) {
    assert(
      caption.end <= row.audioEndFrame,
      `${row.id}: caption exceeds complete audio`,
    );
    assert.equal(
      visualAt(row, caption.end).caption,
      caption.text,
      `${row.id}: caption not retained at its end`,
    );
    const next = row.captions[i + 1];
    if (next && next.start > caption.end)
      assert.equal(
        visualAt(row, next.start - 1).caption,
        caption.text,
        `${row.id}: caption lost between measured phrases`,
      );
  }
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
    row.durationInFrames - row.audioEndFrame >= (row.thinkAfter ?? 1) * fps,
  );
  if (rows[index + 1]?.page !== row.page) {
    const minimum = pages[row.page].dense ? 2 : 1;
    assert(pages[row.page].holdAfterSeconds >= minimum);
    assert(
      row.durationInFrames - row.audioEndFrame >=
        pages[row.page].holdAfterSeconds * fps,
      `${row.page}: insufficient configured complete-page hold`,
    );
  }
}
console.log(
  `PASS ${rows.length} measured WAV sources, text/SSML, captions, cue boundaries and page holds; listening and final video acceptance are separate`,
);
