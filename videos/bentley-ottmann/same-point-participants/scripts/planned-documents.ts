import assert from "node:assert/strict";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { validateSentencePauses } from "../../../shared/speech/sentence-pauses.ts";
import { shots } from "../src/storyboard.ts";
import narration from "../src/narration-text.json" with { type: "json" };
import speech from "../src/speech-text.json" with { type: "json" };
import sentences from "../src/sentence-plan.json" with { type: "json" };
import { aliasReferenceText, type SpeechAlias } from "./speech-alias.ts";

export const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});

/** Rebuild the actual selected requests. This module never creates a service client. */
export function plannedDocuments() {
  const ids = shots.map((shot) => shot.id).sort();
  for (const source of [narration, speech, sentences])
    assert.deepEqual(Object.keys(source).sort(), ids, "Source IDs differ");
  return shots.map((shot) => {
    const id = shot.id as keyof typeof narration;
    const input = speech[id] as (string | Record<string, unknown>)[];
    const canonical: (string | Record<string, unknown>)[] = [];
    const aliases: SpeechAlias[] = [];
    let offset = 0;
    const synthesis = input.map((part) => {
      if (typeof part === "object" && "englishWord" in part) {
        assert.deepEqual(Object.keys(part).sort(), ["englishWord", "letter"]);
        assert(typeof part.letter === "string" && /^[A-Z]$/.test(part.letter));
        assert(typeof part.englishWord === "string");
        aliases.push({
          sourceOffset: offset,
          spoken: part.englishWord,
          letter: part.letter,
        });
        canonical.push({ letter: part.letter });
        offset += part.englishWord.length;
        return { englishWord: part.englishWord };
      }
      canonical.push(part);
      offset += buildSpeechDocument([part], id).text.length;
      return part;
    });
    const document = buildSpeechDocument(synthesis, id);
    assert.equal(
      aliasReferenceText(document.text, aliases),
      narration[id],
      `${id}: speech differs from narration`,
    );
    assert.doesNotMatch(
      document.ssml,
      /<prosody\b|\brate\s*=/,
      `${id}: rate override`,
    );
    const pauses = validateSentencePauses(
      shot.captions.join(""),
      canonical,
      narration[id],
      sentences[id],
      id,
    );
    const chargeable = Array.from(
      document.ssml.replace(/<\/?(?:speak|voice)\b[^>]*>/g, ""),
    );
    const han = chargeable.filter((character) =>
      /\p{Script=Han}/u.test(character),
    ).length;
    return {
      id,
      audioFile: `${id}.wav`,
      text: narration[id],
      synthesisText: document.text,
      ssml: document.ssml,
      fingerprint: document.fingerprint,
      aliases,
      characters: Array.from(narration[id]).length,
      ssmlCharacters: Array.from(document.ssml).length,
      billableCharacters: chargeable.length + han,
      internalPauses: pauses.filter((p) => p.breakMs === 200).length,
      sentencePauses: pauses.filter((p) => p.breakMs === 400).length,
    };
  });
}
