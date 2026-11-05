import { plannedDocuments, voice } from "./planned-documents.ts";
import { synthesisFormat } from "../../../shared/speech/source.ts";

if (process.argv.slice(2).some((arg) => arg !== "--dry-run"))
  throw Error("Planning only; the only accepted option is --dry-run");
const documents = plannedDocuments();
console.log(
  JSON.stringify(
    {
      mode: "plan-only",
      voice,
      outputFormat: synthesisFormat,
      synthesisAuthorized: false,
      automaticRetries: 0,
      requests: documents.length,
      characters: documents.reduce(
        (sum, document) => sum + document.characters,
        0,
      ),
      ssmlCharacters: documents.reduce(
        (sum, document) => sum + document.ssmlCharacters,
        0,
      ),
      billableCharacters: documents.reduce(
        (sum, document) => sum + document.billableCharacters,
        0,
      ),
      characterCountNote:
        "Exact SSML: exclude speak/voice tags, count other code points once and Han twice. Not an account quota or invoice; assessment and retries are additional requests.",
      billingRuleSource:
        "https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech#billable-characters",
      documents,
    },
    null,
    2,
  ),
);
