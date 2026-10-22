import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assessmentWords, verifyAlignment } from "./azure-alignment.ts";
import {
  createCaptions,
  phraseTime,
  type AudioTiming,
} from "../src/speech-timing.ts";

const audio: AudioTiming = {
  speech: "得到 Q 撇。",
  duration: 4.824,
  voice: "fixture",
  fingerprint: "fixture",
  words: [
    {
      text: "得到",
      textOffset: 0,
      wordLength: 2,
      startMs: 3631,
      durationMs: 0,
    },
    { text: "Q", textOffset: 3, wordLength: 1, startMs: 3631, durationMs: 0 },
    { text: "撇", textOffset: 5, wordLength: 1, startMs: 3631, durationMs: 0 },
  ],
};
// Service-observed tail of 204-16. No synthesized or interpolated word lengths.
const response = {
  RecognitionStatus: "Success",
  NBest: [
    {
      Words: [
        {
          Word: "得到",
          Offset: 37400000,
          Duration: 3900000,
          PronunciationAssessment: { ErrorType: "None" },
        },
        {
          Word: "Q",
          Offset: 41400000,
          Duration: 2300000,
          PronunciationAssessment: { ErrorType: "None" },
        },
        {
          Word: "撇",
          Offset: 43800000,
          Duration: 4200000,
          PronunciationAssessment: { ErrorType: "None" },
        },
      ],
    },
  ],
};
test("measured alignment supplies separate caption and animation boundaries", () => {
  const aligned = { ...audio, words: assessmentWords(audio, response) };
  assert.deepEqual(
    aligned.words.map((w) => [w.text, w.startMs, w.durationMs]),
    [
      ["得到", 3740, 390],
      ["Q", 4140, 230],
      ["撇", 4380, 420],
    ],
  );
  assert.equal(phraseTime(aligned, "得到", "end"), 4130);
  assert.equal(createCaptions("得到 Q′。", aligned)[0].endMs, 4800);
});
test("incomplete, uncertain, overlapping or out-of-range alignments stop publication", () => {
  for (const change of [
    (r: typeof response) => {
      r.NBest[0].Words.pop();
    },
    (r: typeof response) => {
      r.NBest[0].Words[1].Word = "P";
    },
    (r: typeof response) => {
      r.NBest[0].Words[1].Duration = 0;
    },
    (r: typeof response) => {
      r.NBest[0].Words[1].PronunciationAssessment.ErrorType = "Omission";
    },
    (r: typeof response) => {
      r.NBest[0].Words[1].PronunciationAssessment.ErrorType =
        "Mispronunciation";
    },
    (r: typeof response) => {
      r.NBest[0].Words[1].Offset = 40000000;
    },
    (r: typeof response) => {
      r.NBest[0].Words[2].Duration = 99999999;
    },
  ]) {
    const invalid = structuredClone(response);
    change(invalid);
    assert.throws(() => assessmentWords(audio, invalid));
  }
});
test("alignment is bound to the exact audio bytes and saved service response", () => {
  const dir = mkdtempSync(join(tmpdir(), "alignment-test-"));
  const path = join(dir, "audio.mp3");
  const bytes = Buffer.from("original audio fixture");
  writeFileSync(path, bytes);
  const aligned: AudioTiming = {
    ...audio,
    words: assessmentWords(audio, response),
    alignment: {
      method: "azure-pronunciation-assessment",
      audioSha256: createHash("sha256").update(bytes).digest("hex"),
      synthesisWords: audio.words,
      response,
    },
  };
  try {
    verifyAlignment(aligned, path);
    assert.throws(() => verifyAlignment({ ...aligned, words: [] }, path));
    writeFileSync(path, "different audio fixture");
    assert.throws(() => verifyAlignment(aligned, path));
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test("valid synthesis timing is retained even when its pronunciation score differs", () => {
  const original = {
    ...audio,
    words: audio.words.map((word, i) =>
      i === 0 ? { ...word, startMs: 3631, durationMs: 400 } : word,
    ),
  };
  const assessment = structuredClone(response);
  assessment.NBest[0].Words[0].PronunciationAssessment.ErrorType =
    "Mispronunciation";
  const words = assessmentWords(original, assessment);
  assert.deepEqual(words[0], original.words[0]);
  assert.equal(words[1].startMs, 4140);
  original.words[0].durationMs = 600;
  assert.throws(() => assessmentWords(original, assessment), /requires review/);
});
test("a conflicting neighbor is measured, never trimmed to fit the missing word", () => {
  const original = {
    ...audio,
    words: audio.words.map((word, i) =>
      i === 0 ? { ...word, startMs: 3631, durationMs: 600 } : word,
    ),
  };
  const words = assessmentWords(original, response);
  assert.equal(words[0].startMs, 3740);
  assert.equal(words[0].durationMs, 390);
  assert.equal(words[1].startMs, 4140);
});
test("different tokenizations retain whole measured words without inventing subword durations", () => {
  const original: AudioTiming = {
    ...audio,
    words: [
      {
        text: "得",
        textOffset: 0,
        wordLength: 1,
        startMs: 3631,
        durationMs: 0,
      },
      {
        text: "到",
        textOffset: 1,
        wordLength: 1,
        startMs: 3900,
        durationMs: 200,
      },
      ...audio.words.slice(1),
    ],
  };
  assert.deepEqual(
    assessmentWords(original, response),
    assessmentWords(audio, response),
  );
});
