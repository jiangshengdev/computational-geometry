import assert from "node:assert/strict";
import type * as SpeechSdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "./azure-speech.ts";
import { synthesisFormat } from "./source.ts";
import {
  validateSentencePauses,
  type SentencePlan,
} from "./sentence-pauses.ts";

export function buildBatchPlan(
  sdk: typeof SpeechSdk,
  shots: { id: string; caption: string }[],
  narration: Record<string, string>,
  speech: Record<string, unknown>,
  sentences: Record<string, SentencePlan>,
) {
  // This entry only builds documents: no credentials, client, or network requests.
  const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
  const { buildSpeechDocument } = createSpeechTools(sdk, {
    voice,
    commas: "document",
    fingerprint: true,
  });
  const ids = shots.map((shot) => shot.id).sort();
  for (const source of [narration, speech, sentences])
    assert.deepEqual(Object.keys(source).sort(), ids, "Source IDs differ");
  const documents = shots.map((shot) => {
    const id = shot.id as keyof typeof speech;
    const document = buildSpeechDocument(speech[id], id);
    assert.equal(document.text, narration[id], `${id}: narration differs`);
    assert.doesNotMatch(document.ssml, /<prosody\b|\brate\s*=/);
    const pauses = validateSentencePauses(
      shot.caption,
      speech[id],
      narration[id],
      sentences[id],
      id,
    );
    return { id, audioFile: `${id}.wav`, ...document, pauses };
  });
  return {
    mode: "plan-only",
    voice,
    outputFormat: synthesisFormat,
    automaticRetries: 0,
    requests: documents.length,
    documents,
  };
}

export function planBatch(...args: Parameters<typeof buildBatchPlan>) {
  if (process.argv.slice(2).some((arg) => arg !== "--dry-run"))
    throw Error("Planning only; the only accepted option is --dry-run");
  console.log(JSON.stringify(buildBatchPlan(...args), null, 2));
}
