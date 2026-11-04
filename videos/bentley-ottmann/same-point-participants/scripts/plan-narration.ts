import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { shots } from "../src/storyboard.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { synthesisFormat } from "../../../shared/speech/source.ts";
import {
  applySentencePauses,
  validateSentencePauses,
} from "../../../shared/speech/sentence-pauses.ts";

// Pure planning only: no credentials, SpeechConfig, client, audio or timing writes.
const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
const read = (name: string) =>
  readFileSync(new URL(`../src/${name}.json`, import.meta.url), "utf8");
const plainBytes = read("narration-text");
const speechBytes = read("speech-text");
const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");
if (
  sha256(plainBytes) !==
    "f972441e0e309f3b65c9529eb5e13e6da5c0ffb034aaa9237c476c6c1323cc1a" ||
  sha256(speechBytes) !==
    "50acea1b275596f180a03c099a8c2346d3b1d1d6908ea09974c59a92817eb1af"
)
  throw Error("Reviewed narration or pronunciation source changed");
const plain: Record<string, string> = JSON.parse(plainBytes);
const speech = JSON.parse(speechBytes);
const ids = shots
  .map((shot) => shot.id)
  .sort()
  .join(",");
for (const data of [plain, speech, plans])
  if (Object.keys(data).sort().join(",") !== ids)
    throw Error("Plan/source IDs differ from current storyboard");
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});
const documents = shots.map((shot) => {
  const caption = shot.captions.join("");
  const sentences = plans[shot.id as keyof typeof plans];
  const parts = applySentencePauses(
    caption,
    speech[shot.id],
    plain[shot.id],
    sentences,
  );
  const pauses = validateSentencePauses(
    caption,
    parts,
    plain[shot.id],
    sentences,
    shot.id,
  );
  const document = buildSpeechDocument(parts, shot.id);
  if (document.text !== plain[shot.id])
    throw Error(`${shot.id}: request changes frozen narration`);
  if (/<prosody\b|\brate=|alphabet="ipa"/.test(document.ssml))
    throw Error(`${shot.id}: rate change or unapproved IPA`);
  const letters = [
    ...document.text.matchAll(/(?<![A-Za-z])[A-Za-z](?![A-Za-z])/g),
  ];
  const spelled = [
    ...document.ssml.matchAll(
      /<lang xml:lang="en-US"><say-as interpret-as="characters">[A-Z]<\/say-as><\/lang>/g,
    ),
  ];
  if (letters.length !== spelled.length)
    throw Error(`${shot.id}: standalone letter missing default spelling`);
  return {
    id: shot.id,
    audioFile: `${shot.id}.wav`,
    ...document,
    characters: Array.from(document.text).length,
    ssmlCharacters: Array.from(document.ssml).length,
    internalPauses: pauses.filter((pause) => pause.breakMs === 200).length,
    sentencePauses: pauses.filter((pause) => pause.breakMs === 400).length,
    spelledLetters: letters.length,
  };
});
const total = (
  key:
    | "characters"
    | "ssmlCharacters"
    | "internalPauses"
    | "sentencePauses"
    | "spelledLetters",
) => documents.reduce((sum, document) => sum + document[key], 0);
console.log(
  JSON.stringify(
    {
      mode: "plan-only",
      synthesisAuthorized: false,
      voice,
      outputFormat: synthesisFormat,
      rate: "original; no rate override",
      requests: documents.length,
      concurrency: 1,
      automaticRetries: 0,
      characters: total("characters"),
      ssmlCharacters: total("ssmlCharacters"),
      internalPauses: total("internalPauses"),
      sentencePauses: total("sentencePauses"),
      spelledLetters: total("spelledLetters"),
      narrationSha256: sha256(plainBytes),
      speechSha256: sha256(speechBytes),
      sentencePlanSha256: sha256(read("sentence-plan")),
      note: "Full synthesis request plan only. Character counts are not billing units, account quota, a price or measured audio duration. Recognition and assessment are additional requests planned against actual audio hashes after synthesis.",
      documents,
    },
    null,
    2,
  ),
);
