import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createSpeechTools } from "../../../shared/speech/azure-speech.ts";
import {
  audioSha256,
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "../../../shared/speech/audio.ts";
import { synthesisFormat } from "../../../shared/speech/source.ts";
import { updateSentencePauses } from "./sentence-plan.ts";
import speech from "../src/speech-text.json" with { type: "json" };

const args = process.argv.slice(2);
const names = ["plan", "plan-sha256", "output"];
assert.equal(
  args.length,
  names.length,
  "Require --plan, --plan-sha256 and --output",
);
const options = Object.fromEntries(
  names.map((name) => {
    const matches = args.filter((arg) => arg.startsWith(`--${name}=`));
    assert.equal(matches.length, 1, `Require exactly one --${name}`);
    const value = matches[0].slice(name.length + 3);
    assert(value, `Empty --${name}`);
    return [name, value];
  }),
);
const bytes = readFileSync(options.plan);
assert.equal(
  createHash("sha256").update(bytes).digest("hex"),
  options["plan-sha256"],
  "Approved plan changed",
);
const plan = JSON.parse(bytes.toString());
const voice = "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural";
assert.equal(plan.voice, voice);
assert.equal(plan.outputFormat, synthesisFormat);
assert.equal(plan.automaticRetries, 0);
assert.equal(plan.requests, plan.documents.length);
assert.deepEqual(
  plan.documents.map((d: { id: string }) => d.id),
  Object.keys(speech),
);
updateSentencePauses(false);
const { buildSpeechDocument, synthesize } = createSpeechTools(sdk, {
  voice,
  commas: "document",
  fingerprint: true,
});
for (const doc of plan.documents) {
  const actual = buildSpeechDocument(
    speech[doc.id as keyof typeof speech],
    doc.id,
  );
  assert.equal(actual.ssml, doc.ssml, `${doc.id}: SSML changed`);
  assert.equal(actual.text, doc.text, `${doc.id}: text changed`);
  assert.equal(
    actual.fingerprint,
    doc.fingerprint,
    `${doc.id}: fingerprint changed`,
  );
  assert.equal(doc.audioFile, `${doc.id}.wav`);
}
assert(
  process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_ENDPOINT,
  "Azure credentials missing",
);
assert(new URL(process.env.AZURE_SPEECH_ENDPOINT).protocol === "https:");
assert(
  !process.env.AZURE_SPEECH_VOICE || process.env.AZURE_SPEECH_VOICE === voice,
  "Voice override differs",
);

const output = resolve(options.output);
mkdirSync(dirname(output), { recursive: true });
// Never resume or overwrite an earlier batch, especially an uncertain request.
mkdirSync(output);
writeFileSync(join(output, "request-plan.json"), bytes, { flag: "wx" });
const manifest = {
  planSha256: options["plan-sha256"],
  voice,
  outputFormat: synthesisFormat,
  automaticRetries: 0,
  published: false,
  requests: plan.documents.map((doc: { id: string; fingerprint: string }) => ({
    id: doc.id,
    fingerprint: doc.fingerprint,
    status: "not-started",
    startedAt: "",
    endedAt: "",
  })),
};
const save = () =>
  writeFileSync(
    join(output, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
save();
for (const doc of plan.documents) {
  const record = manifest.requests.find(
    (r: { id: string }) => r.id === doc.id,
  )!;
  record.status = "started";
  record.startedAt = new Date().toISOString();
  save();
  console.log(`${doc.id}: started`);
  let received = false;
  try {
    const path = join(output, doc.audioFile);
    const words = await synthesize(
      speech[doc.id as keyof typeof speech],
      path,
      { exclusive: true, requireWordBoundaries: false },
    );
    received = true;
    // Persist original events before any validation that could fail.
    writeFileSync(
      join(output, `${doc.id}.words.json`),
      JSON.stringify(words, null, 2) + "\n",
      { flag: "wx" },
    );
    verifyPcmSource(path);
    decodeAudio(path);
    const duration = measureAudio(path);
    assert(Number.isFinite(duration) && duration > 0);
    writeFileSync(
      join(output, `${doc.id}.json`),
      JSON.stringify(
        {
          audioFile: doc.audioFile,
          outputFormat: synthesisFormat,
          audioSha256: audioSha256(path),
          duration,
          words,
          speech: doc.text,
          voice,
          fingerprint: doc.fingerprint,
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    record.status = "synthesized-and-decoded";
    record.endedAt = new Date().toISOString();
    save();
    console.log(
      `${doc.id}: saved ${duration.toFixed(3)}s; ${words.length} original word events`,
    );
  } catch {
    record.status = received
      ? "received-validation-failed"
      : "request-failed-or-uncertain";
    record.endedAt = new Date().toISOString();
    save();
    // Do not print provider diagnostics that may contain credentials or endpoints.
    throw Error(
      `${doc.id}: ${record.status}; stopped without retry; inspect ${output}`,
    );
  }
}
console.log(
  `Staged ${manifest.requests.length} complete original WAV files: ${output}; not adopted or listened`,
);
