import assert from "node:assert/strict";
import {
  audioSha256,
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "./audio.ts";
import type { AudioTiming } from "./timing.ts";

export type AssessmentCounts = {
  Mispronunciation: number;
  Omission: number;
  Insertion: number;
};

/** Verify a selected source locally and accumulate raw service flags.
 * Selection decisions, caption mapping and adoption policy belong to the episode. */
export function verifyRecording({
  audio,
  path,
  expected,
  verifyAlignment,
  decode,
  counts,
}: {
  audio: AudioTiming;
  path: string;
  expected: {
    id: string;
    audioFile: string;
    outputFormat: string;
    voice: string;
    text: string;
    fingerprint: string;
  };
  verifyAlignment: (audio: AudioTiming, path: string) => void;
  decode: boolean;
  counts: AssessmentCounts;
}) {
  assert.equal(audio.audioFile, expected.audioFile);
  assert.equal(audio.outputFormat, expected.outputFormat);
  assert.equal(audio.voice, expected.voice);
  assert.equal(audio.speech, expected.text, `${expected.id}: stale narration`);
  assert.equal(
    audio.fingerprint,
    expected.fingerprint,
    `${expected.id}: stale request`,
  );
  assert.equal(audio.audioSha256, audioSha256(path));
  verifyPcmSource(path);
  assert.equal(audio.duration, measureAudio(path));
  if (decode) decodeAudio(path);
  assert(audio.alignment, `${expected.audioFile}: missing raw assessment`);
  verifyAlignment(audio, path);
  const response = audio.alignment.response as {
    NBest: { Words: { PronunciationAssessment: { ErrorType: string } }[] }[];
  };
  for (const word of response.NBest[0].Words) {
    const flag = word.PronunciationAssessment.ErrorType;
    assert(
      flag === "None" || flag in counts,
      `${expected.audioFile}: unknown assessment flag ${flag}`,
    );
    if (flag !== "None") counts[flag as keyof AssessmentCounts]++;
  }
}
