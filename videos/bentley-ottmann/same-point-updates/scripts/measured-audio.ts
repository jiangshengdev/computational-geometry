import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import {
  audioSha256,
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "../../../shared/speech/audio.ts";
import { synthesisFormat } from "../../../shared/speech/source.ts";
import {
  validateCaptionClauses,
  wordsInTextRange,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";
import { timedCaption } from "../../../shared/speech/captions.ts";
import { checkSentencePlan } from "./sentence-plan.ts";
import { shots } from "../src/storyboard.ts";
import plans from "../src/caption-plan.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import narration from "../src/narration-text.json" with { type: "json" };

const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});
const alignment = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});

/** Local-only verification, shared by adoption and ongoing formal checks. */
export function verifyRecordings(
  directory: string,
  timing: Record<string, AudioTiming>,
  decode = false,
) {
  const ids = shots.map((s) => s.id).sort();
  for (const source of [timing, plans, speech, narration])
    assert.deepEqual(Object.keys(source).sort(), ids);
  const counts = { Mispronunciation: 0, Omission: 0, Insertion: 0 };
  const captions = Object.fromEntries(
    shots.map((shot) => {
      const id = shot.id as keyof typeof plans;
      const audio = timing[id];
      const doc = buildSpeechDocument(speech[id], id);
      checkSentencePlan(speech[id], narration[id], id);
      assert.equal(doc.text, narration[id]);
      assert.equal(audio.speech, doc.text);
      assert.equal(audio.fingerprint, doc.fingerprint);
      assert.equal(audio.voice, voice);
      assert.equal(audio.audioFile, `${id}.wav`);
      assert.equal(audio.outputFormat, synthesisFormat);
      const path = join(directory, audio.audioFile!);
      assert.equal(audioSha256(path), audio.audioSha256);
      verifyPcmSource(path);
      assert.equal(measureAudio(path), audio.duration);
      if (decode) decodeAudio(path);
      assert(audio.alignment, `${id}: missing raw assessment`);
      assert.deepEqual(
        alignment.assessmentWords(audio, audio.alignment.response),
        audio.words,
      );
      alignment.verifyAlignment(audio, path);
      const response = audio.alignment.response as {
        NBest: {
          Words: { PronunciationAssessment: { ErrorType: string } }[];
        }[];
      };
      for (const word of response.NBest[0].Words) {
        const flag = word.PronunciationAssessment.ErrorType;
        assert(flag === "None" || flag in counts);
        if (flag !== "None") counts[flag as keyof typeof counts]++;
      }
      const plan = plans[id];
      validateCaptionClauses(
        shot.cues.map((c) => c.caption).join(""),
        audio.speech,
        plan,
      );
      for (const [source, cue] of shot.cues.entries())
        assert.equal(
          plan
            .filter((p) => p.source === source)
            .map((p) => p.caption)
            .join(""),
          cue.caption,
          `${id}: changed semantic source`,
        );
      let offset = 0;
      return [
        id,
        plan.map((part) => {
          assert(
            Number.isInteger(part.source) &&
              part.source >= 0 &&
              part.source < shot.cues.length,
          );
          const cue = shot.cues[part.source];
          const words = wordsInTextRange(
            audio,
            offset,
            offset + part.speech.length,
          ).filter((w) => w.durationMs > 0);
          offset += part.speech.length;
          assert(words.length, `${id}: no measured phrase`);
          return {
            ...timedCaption(part.caption, words),
            source: part.source,
            target: cue.target ?? null,
            focus: cue.focus ?? null,
          };
        }),
      ];
    }),
  );
  return {
    captions,
    counts,
    clips: ids.length,
    actualListeningPerformed: false,
  };
}

export function readTiming(path: string): Record<string, AudioTiming> {
  return JSON.parse(readFileSync(path, "utf8"));
}
