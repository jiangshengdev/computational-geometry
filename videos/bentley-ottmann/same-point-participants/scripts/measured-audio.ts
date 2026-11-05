import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import {
  audioSha256,
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "../../../shared/speech/audio.ts";
import { synthesisFormat } from "../../../shared/speech/source.ts";
import type {
  AudioTiming,
  WordBoundary,
} from "../../../shared/speech/timing.ts";
import selection from "../src/audio-selection.json" with { type: "json" };
import { plannedDocuments, voice } from "./planned-documents.ts";
import { mapAliasWords } from "./speech-alias.ts";
import { measuredCaptions } from "./caption-plans.ts";

export type Recording = AudioTiming & {
  alignment?: NonNullable<AudioTiming["alignment"]> & {
    rawSynthesisWords?: WordBoundary[];
  };
};
const tools = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});

/** Shared by formal checks and adoption; only reads local files and real service responses. */
export function verifyRecordings(
  directory: string,
  timing: Record<string, Recording>,
  decode = false,
) {
  const documents = plannedDocuments();
  const ids = documents.map((document) => document.id).sort();
  assert.deepEqual(Object.keys(timing).sort(), ids, "Timing IDs differ");
  assert.deepEqual(
    Object.keys(selection).sort(),
    ids,
    "Selected audio IDs differ",
  );
  const counts = { Mispronunciation: 0, Omission: 0, Insertion: 0 };
  for (const request of documents) {
    const recording = timing[request.id];
    const selected = selection[request.id];
    const path = join(directory, request.audioFile);
    assert.equal(recording.audioFile, request.audioFile);
    assert.equal(recording.outputFormat, synthesisFormat);
    assert.equal(recording.voice, voice);
    assert.equal(
      recording.speech,
      request.text,
      `${request.id}: stale narration`,
    );
    assert.equal(
      recording.fingerprint,
      request.fingerprint,
      `${request.id}: stale request`,
    );
    assert.equal(
      selected.fingerprint,
      request.fingerprint,
      `${request.id}: unselected request`,
    );
    assert.equal(
      recording.audioSha256,
      selected.audioSha256,
      `${request.id}: unselected audio`,
    );
    assert.equal(
      audioSha256(path),
      selected.audioSha256,
      `${request.id}: audio hash mismatch`,
    );
    const alignment = recording.alignment;
    assert(alignment, `${request.id}: missing assessment`);
    if (request.aliases.length) {
      assert(
        alignment.rawSynthesisWords,
        `${request.id}: missing original alias events`,
      );
      assert.deepEqual(
        mapAliasWords(
          request.synthesisText,
          request.text,
          request.aliases,
          alignment.rawSynthesisWords,
        ),
        alignment.synthesisWords,
      );
    } else
      assert.equal(
        alignment.rawSynthesisWords,
        undefined,
        `${request.id}: unexpected alias events`,
      );
    assert.deepEqual(
      alignment.reviewedRecognition ?? [],
      selected.reviewedRecognition,
      `${request.id}: changed recognition decision`,
    );
    assert.deepEqual(
      tools.assessmentWords(recording, alignment.response),
      recording.words,
    );
    tools.verifyAlignment(recording, path);
    verifyPcmSource(path);
    assert.equal(measureAudio(path), recording.duration);
    if (decode) decodeAudio(path);
    const response = alignment.response as {
      NBest: { Words: { PronunciationAssessment: { ErrorType: string } }[] }[];
    };
    for (const word of response.NBest[0].Words) {
      const flag = word.PronunciationAssessment.ErrorType;
      assert(
        flag === "None" || flag in counts,
        `${request.id}: unknown assessment flag`,
      );
      if (flag !== "None") counts[flag as keyof typeof counts]++;
    }
  }
  return {
    captions: measuredCaptions(timing),
    counts,
    clips: documents.length,
    actualListeningPerformed: false,
  };
}

export function readTiming(path: string): Record<string, Recording> {
  return JSON.parse(readFileSync(path, "utf8"));
}
