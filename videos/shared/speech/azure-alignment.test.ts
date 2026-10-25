import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type * as SDK from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "./azure-alignment.ts";
import { audioSha256 } from "./audio.ts";
import type { AudioTiming } from "./timing.ts";
test("assessment matches uppercase letters to lowercase source without relaxing omission checks", () => {
  const audio: AudioTiming = {
    speech: "x。",
    duration: 1,
    voice: "test",
    fingerprint: "test",
    words: [
      {
        text: "X",
        textOffset: 0,
        wordLength: 1,
        startMs: 100,
        durationMs: 1000,
      },
    ],
  };
  const response = {
    RecognitionStatus: "Success",
    NBest: [
      {
        Words: [
          {
            Word: "X",
            Offset: 1000000,
            Duration: 2000000,
            PronunciationAssessment: { ErrorType: "None" },
          },
        ],
      },
    ],
  };
  const { assessmentWords } = createAlignmentTools({} as typeof SDK, {
    allowReviewedPronunciation: false,
  });
  assert.deepEqual(assessmentWords(audio, response), [
    {
      text: "X",
      textOffset: 0,
      wordLength: 1,
      startMs: 100,
      durationMs: 200,
    },
  ]);
  response.NBest[0].Words[0].Word = "Y";
  assert.throws(() => assessmentWords(audio, response), /text mismatch/);
  response.NBest[0].Words[0].Word = "X";
  response.NBest[0].Words[0].PronunciationAssessment.ErrorType = "Omission";
  assert.throws(() => assessmentWords(audio, response), /requires review/);
});

test("saved assessment repairs a synthesis word beyond the audio end without changing audio", () => {
  const dir = mkdtempSync(join(tmpdir(), "alignment-test-"));
  try {
    const path = join(dir, "source.wav");
    writeFileSync(path, "immutable source");
    const measured = {
      text: "坐标",
      textOffset: 0,
      wordLength: 2,
      startMs: 100,
      durationMs: 800,
    };
    const audio: AudioTiming = {
      duration: 1,
      words: [measured],
      speech: "坐标",
      voice: "test",
      fingerprint: "test",
      alignment: {
        method: "azure-pronunciation-assessment",
        audioSha256: audioSha256(path),
        synthesisWords: [{ ...measured, durationMs: 910 }],
        response: {
          RecognitionStatus: "Success",
          NBest: [
            {
              Words: [
                {
                  Word: "坐标",
                  Offset: 1000000,
                  Duration: 8000000,
                  PronunciationAssessment: { ErrorType: "None" },
                },
              ],
            },
          ],
        },
      },
    };
    const { verifyAlignment } = createAlignmentTools({} as typeof SDK, {
      allowReviewedPronunciation: false,
    });
    assert.doesNotThrow(() => verifyAlignment(audio, path));
    assert.throws(
      () =>
        verifyAlignment(
          { ...audio, words: [{ ...measured, durationMs: 790 }] },
          path,
        ),
      /do not match/,
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});
