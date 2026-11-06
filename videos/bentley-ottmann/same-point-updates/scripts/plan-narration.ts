import assert from "node:assert/strict";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { synthesisFormat } from "../../../shared/speech/source.ts";
import { checkSentencePlan } from "./sentence-plan.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };

if (process.argv.slice(2).some((arg) => arg !== "--dry-run"))
  throw Error("Planning only; the only accepted option is --dry-run");

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
  const pauses = checkSentencePlan(speech[id], narration[id], id);
  return { id, audioFile: `${id}.wav`, ...document, pauses };
});
console.log(
  JSON.stringify(
    {
      mode: "plan-only",
      voice,
      outputFormat: synthesisFormat,
      synthesisAuthorized: false,
      automaticRetries: 0,
      requests: documents.length,
      documents,
    },
    null,
    2,
  ),
);
