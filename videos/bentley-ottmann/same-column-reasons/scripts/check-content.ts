import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { validateWords } from "../../../shared/speech/timing.ts";
import { checkSentencePlan } from "./sentence-plan.ts";
import { checkAudio } from "./check-audio.ts";
import { pageList, shots } from "../src/storyboard.ts";
import {
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  audio,
  motionStart,
  motionEnd,
  timingKind,
} from "../src/timeline.ts";

const narration = JSON.parse(
  readFileSync(new URL("../src/narration-text.json", import.meta.url), "utf8"),
) as Record<string, string>;
const speech = JSON.parse(
  readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice: "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
  commas: "document",
  fingerprint: true,
});
assert.deepEqual(
  Object.keys(narration),
  shots.map((s) => s.id),
);
assert.deepEqual(Object.keys(speech), Object.keys(narration));
assert.equal(timingKind, "measured-narration");
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
    audioLeadFrames + row.speechFrames + row.pauseAfter * fps,
  );
  assert(!/[,，]/.test(narration[row.id]), `${row.id}: speech punctuation`);
  assert(!/[\u3400-\u9fff]\s+[\u3400-\u9fff]/u.test(narration[row.id]));
  for (const sentence of narration[row.id].split(/[。！？]/).filter(Boolean))
    assert(
      !/^[A-Za-z]|[A-Za-z]$/.test(sentence.trim()),
      `${row.id}: exposed sentence-edge letter`,
    );
  checkSentencePlan(speech[row.id], narration[row.id], row.id);
  assert.equal(
    buildSpeechDocument(speech[row.id], row.id).text,
    narration[row.id],
    `${row.id}: pronunciation altered frozen text`,
  );
  validateWords(audio[row.id]);
  assert(row.spoken[0].start >= audioLeadFrames);
  assert.equal(visualAt(row, motionStart(row) - 1).motion, 0);
  assert.equal(visualAt(row, motionEnd(row)).motion, 1);
  assert(motionEnd(row) <= row.audioEndFrame);
  assert.equal(row.speechFrames, Math.ceil(audio[row.id].duration * fps));
  assert(
    row.spoken.every((c) => c.end > c.start && c.end <= row.audioEndFrame),
  );
  if (row.id === "SR20" || row.id === "SR29") {
    assert.equal(visualAt(row, 0).secondMotion, 0);
    assert.equal(last.secondMotion, 1);
  }
}
console.log(
  `PASS: ${pageList.length} pages; ${shots.length} shots; measured original-speed audio, full subtitles, retained steps and captions, page holds, frozen narration binding. Pronunciation semantics require independent review.`,
);

console.log(JSON.stringify(checkAudio(process.argv.includes("--decode"))));
