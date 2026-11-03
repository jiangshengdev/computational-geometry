import { synthesisFormat } from "../../../shared/speech/source.ts";
import {
  plannedDocuments,
  voice,
  narrationSha256,
  speechSha256,
  sentencePlanSha256,
} from "./planned-documents.ts";

// Planning only: no environment credentials, service calls, audio or timing writes.
const documents = plannedDocuments();
const total = (
  key:
    | "characters"
    | "ssmlCharacters"
    | "chargeableCodePoints"
    | "additionalHanUnits"
    | "billableCharacters"
    | "internalPauses"
    | "sentencePauses"
    | "spelledLetters",
) => documents.reduce((n, doc) => n + doc[key], 0);
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
      chargeableCodePoints: total("chargeableCodePoints"),
      additionalHanUnits: total("additionalHanUnits"),
      billableCharacters: total("billableCharacters"),
      internalPauses: total("internalPauses"),
      sentencePauses: total("sentencePauses"),
      spelledLetters: total("spelledLetters"),
      narrationSha256,
      speechSha256,
      sentencePlanSha256,
      billingRuleSource:
        "https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech#billable-characters",
      characterCountNote:
        "Exact serialized SSML: exclude speak/voice tags only; other Unicode code points once and Han twice. This is a request plan, not account quota, money price, provider invoice or measured duration. Assessment and any separately authorized retries are additional requests.",
      documents,
    },
    null,
    2,
  ),
);
