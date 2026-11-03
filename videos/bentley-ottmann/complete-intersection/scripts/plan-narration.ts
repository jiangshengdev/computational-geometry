import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import { synthesisFormat } from "../../../shared/speech/source.ts";
import { narrationShots, checkSentencePlan } from "./sentence-pauses.ts";

// Planning only: this entry has no service client, audio writer or publish action.
const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
const speechBytes = readFileSync(
  new URL("../src/speech-text.json", import.meta.url),
);
const speech = JSON.parse(speechBytes.toString());
const { buildSpeechDocument } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});
const documents = narrationShots.map((shot) => {
  const document = buildSpeechDocument(speech[shot.id], shot.id);
  const pauses = checkSentencePlan(speech[shot.id], document.text, shot.id);
  // Only speak/voice tags are excluded; all other serialized markup is counted.
  const chargeable = Array.from(
    document.ssml.replace(/<\/?(?:speak|voice)\b[^>]*>/g, ""),
  );
  const hanCharacters = chargeable.filter((char) =>
    /\p{Script=Han}/u.test(char),
  ).length;
  return {
    id: shot.id,
    characters: Array.from(document.text).length,
    ssmlCharacters: Array.from(document.ssml).length,
    chargeableCodePoints: chargeable.length,
    additionalHanUnits: hanCharacters,
    billableCharacters: chargeable.length + hanCharacters,
    internalPauses: pauses.filter((pause) => pause.breakMs === 200).length,
    sentencePauses: pauses.filter((pause) => pause.breakMs === 400).length,
    ...document,
  };
});
console.log(
  JSON.stringify(
    {
      mode: "plan-only",
      voice,
      outputFormat: synthesisFormat,
      rate: "original; no rate override",
      requests: documents.length,
      characters: documents.reduce((sum, doc) => sum + doc.characters, 0),
      ssmlCharacters: documents.reduce(
        (sum, doc) => sum + doc.ssmlCharacters,
        0,
      ),
      characterCountNote:
        "Calculated from exact SSML: exclude speak/voice tags, count other code points once and Han twice. Not an account quota reading or provider invoice; assessment and retries are additional requests.",
      billableCharacters: documents.reduce(
        (sum, doc) => sum + doc.billableCharacters,
        0,
      ),
      billingRuleSource:
        "https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech#billable-characters",
      speechSha256: createHash("sha256").update(speechBytes).digest("hex"),
      synthesisAuthorized: false,
      documents,
    },
    null,
    2,
  ),
);
