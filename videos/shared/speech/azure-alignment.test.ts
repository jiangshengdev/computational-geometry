import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type * as SDK from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "./azure-alignment.ts";
import { audioSha256 } from "./audio.ts";
import type { AudioTiming } from "./timing.ts";
test("malformed SSML offsets are recovered from exact source text without replacing valid measured times", () => {
  const audio: AudioTiming = {
    speech: "R。这里。",
    duration: 2,
    voice: "test",
    fingerprint: "test",
    words: [
      { text: "R", textOffset: 0, wordLength: 1, startMs: 100, durationMs: 0 },
      {
        text: "。这",
        textOffset: 57,
        wordLength: 60,
        startMs: 600,
        durationMs: 200,
      },
      {
        text: "里",
        textOffset: 3,
        wordLength: 1,
        startMs: 800,
        durationMs: 200,
      },
      {
        text: "。",
        textOffset: 4,
        wordLength: 1,
        startMs: 1000,
        durationMs: 0,
      },
    ],
  };
  const response = {
    RecognitionStatus: "Success",
    NBest: [
      {
        Words: [
          {
            Word: "R",
            Offset: 1000000,
            Duration: 4000000,
            PronunciationAssessment: { ErrorType: "None" },
          },
          {
            Word: "这里",
            Offset: 6100000,
            Duration: 3800000,
            PronunciationAssessment: { ErrorType: "Mispronunciation" },
          },
        ],
      },
    ],
  };
  const { assessmentWords } = createAlignmentTools({} as typeof SDK, {
    allowReviewedPronunciation: false,
  });
  assert.deepEqual(assessmentWords(audio, response), [
    { text: "R", textOffset: 0, wordLength: 1, startMs: 100, durationMs: 400 },
    {
      text: "。这",
      textOffset: 1,
      wordLength: 2,
      startMs: 600,
      durationMs: 200,
    },
    audio.words[2],
    audio.words[3],
  ]);
  assert.equal(audio.words[1].textOffset, 57);
  assert.throws(
    () =>
      assessmentWords(
        {
          ...audio,
          words: [{ ...audio.words[0], text: "X" }, ...audio.words.slice(1)],
        },
        response,
      ),
    /source text/,
  );
});
test("listening approval is word-specific and cannot bypass audio binding or omissions", () => {
  const dir = mkdtempSync(join(tmpdir(), "reviewed-alignment-test-"));
  try {
    const path = join(dir, "source.wav");
    writeFileSync(path, "approved audio");
    const { assessmentWords, verifyAlignment } = createAlignmentTools(
      {} as typeof SDK,
      { allowReviewedPronunciation: true },
    );
    const response = {
      RecognitionStatus: "Success",
      NBest: [
        {
          Words: [
            {
              Word: "D",
              Offset: 1000000,
              Duration: 2000000,
              PronunciationAssessment: { ErrorType: "Mispronunciation" },
            },
          ],
        },
      ],
    };
    const audio: AudioTiming = {
      speech: "D。",
      duration: 1,
      voice: "test",
      fingerprint: "test",
      words: [],
      alignment: {
        method: "azure-pronunciation-assessment",
        audioSha256: audioSha256(path),
        synthesisWords: [],
        response,
        reviewedPronunciation: [{ text: "D", textOffset: 0 }],
      },
    };
    audio.words = assessmentWords(audio, response);
    assert.doesNotThrow(() => verifyAlignment(audio, path));
    assert.throws(
      () =>
        assessmentWords(
          {
            ...audio,
            alignment: {
              ...audio.alignment!,
              reviewedPronunciation: [{ text: "D", textOffset: 1 }],
            },
          },
          response,
        ),
      /requires review/,
    );
    response.NBest[0].Words[0].PronunciationAssessment.ErrorType = "Omission";
    assert.throws(() => verifyAlignment(audio, path), /requires review/);
    response.NBest[0].Words[0].PronunciationAssessment.ErrorType =
      "Mispronunciation";
    writeFileSync(path, "different audio");
    assert.throws(() => verifyAlignment(audio, path), /does not belong/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test("audition without synthesis boundaries uses measured recognition and retains review gates", () => {
  const audio: AudioTiming = {
    speech: "S。",
    duration: 1,
    voice: "test",
    fingerprint: "test",
    words: [],
  };
  const response = {
    RecognitionStatus: "Success",
    NBest: [
      {
        Words: [
          {
            Word: "S",
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
  const measured = assessmentWords(audio, response);
  assert.deepEqual(measured, [
    { text: "S", textOffset: 0, wordLength: 1, startMs: 100, durationMs: 200 },
  ]);
  assert.deepEqual(
    assessmentWords(
      {
        ...audio,
        words: measured,
        alignment: {
          method: "azure-pronunciation-assessment",
          audioSha256: "test",
          synthesisWords: [],
          response,
        },
      },
      response,
    ),
    measured,
  );
  response.NBest[0].Words[0].PronunciationAssessment.ErrorType =
    "Mispronunciation";
  assert.throws(
    () => assessmentWords(audio, response),
    /requires review for timing/,
  );
  response.NBest[0].Words[0].PronunciationAssessment.ErrorType = "Omission";
  assert.throws(() => assessmentWords(audio, response), /requires review/);
});
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
