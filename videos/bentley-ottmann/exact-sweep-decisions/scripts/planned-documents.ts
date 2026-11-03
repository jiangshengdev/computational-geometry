import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import {
  applySentencePauses,
  validateSentencePauses,
} from "../../../shared/speech/sentence-pauses.ts";
import { shots } from "../src/storyboard.ts";
import plans from "../src/sentence-plan.json" with { type: "json" };

export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
const read = (name: string) =>
  readFileSync(new URL(`../src/${name}.json`, import.meta.url), "utf8");
const plainBytes = read("narration-text");
const speechBytes = read("speech-text");
export const narrationSha256 = createHash("sha256")
  .update(plainBytes)
  .digest("hex");
export const speechSha256 = createHash("sha256")
  .update(speechBytes)
  .digest("hex");
export const sentencePlanSha256 = createHash("sha256")
  .update(read("sentence-plan"))
  .digest("hex");
if (
  narrationSha256 !==
    "87e0dbe65e486d0ef007be4593dac3b6f0e2408df6578dfce58b765d37101214" ||
  speechSha256 !==
    "c3a9b1af770d9a73abb28f1d03c847fedc9cfb5081ee45bcbe2a46d8dd2d1aad"
)
  throw Error("Reviewed narration or pronunciation source changed");
const plain: Record<string, string> = JSON.parse(plainBytes);
const speech = JSON.parse(speechBytes);
// Only the pure builder is retained. No service/client/configuration is created.
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});
const ids = shots
  .map((shot) => shot.id)
  .sort()
  .join(",");
for (const data of [plain, speech, plans])
  if (Object.keys(data).sort().join(",") !== ids)
    throw Error("Plan/source IDs differ");
export function plannedDocuments() {
  return shots.map((shot) => {
    const sentences = plans[shot.id as keyof typeof plans];
    const parts = applySentencePauses(
      shot.captions.join(""),
      speech[shot.id],
      plain[shot.id],
      sentences,
    );
    const pauses = validateSentencePauses(
      shot.captions.join(""),
      parts,
      plain[shot.id],
      sentences,
      shot.id,
    );
    const document = buildSpeechDocument(parts, shot.id);
    if (document.text !== plain[shot.id])
      throw Error(`${shot.id}: planned request changes frozen text`);
    if (/<prosody\b|\brate=|alphabet="ipa"/.test(document.ssml))
      throw Error(`${shot.id}: unexpected rate or unapproved IPA`);
    const letters = [
      ...document.text.matchAll(/(?<![A-Za-z])[A-Za-z](?![A-Za-z])/g),
    ];
    const spelled = [
      ...document.ssml.matchAll(
        /<lang xml:lang="en-US"><say-as interpret-as="characters">[A-Z]<\/say-as><\/lang>/g,
      ),
    ];
    if (letters.length !== spelled.length)
      throw Error(`${shot.id}: standalone letter not using default spelling`);
    const chargeable = Array.from(
      document.ssml.replace(/<\/?(?:speak|voice)\b[^>]*>/g, ""),
    );
    const han = chargeable.filter((character) =>
      /\p{Script=Han}/u.test(character),
    ).length;
    return {
      id: shot.id,
      audioFile: `${shot.id}.wav`,
      ...document,
      characters: Array.from(document.text).length,
      ssmlCharacters: Array.from(document.ssml).length,
      chargeableCodePoints: chargeable.length,
      additionalHanUnits: han,
      billableCharacters: chargeable.length + han,
      internalPauses: pauses.filter((pause) => pause.breakMs === 200).length,
      sentencePauses: pauses.filter((pause) => pause.breakMs === 400).length,
      spelledLetters: letters.length,
    };
  });
}
