import { readFileSync, realpathSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, basename, join } from "node:path";
import {
  audioSha256,
  verifyPcmSource,
  decodeAudio,
  measureAudio,
} from "../../../shared/speech/audio.ts";
import { synthesisFormat } from "../../../shared/speech/source.ts";
import {
  createCaptions,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";
import { narrationShots } from "./sentence-pauses.ts";
import { buildSpeechDocument, verifyAlignment } from "./azure-speech.ts";

const requested = process.argv
  .find((arg) => arg.startsWith("--staging="))
  ?.slice("--staging=".length);
if (!requested) throw Error("Specify the existing --staging directory");
const directory = realpathSync(requested);
if (
  dirname(directory) !== realpathSync(tmpdir()) ||
  !basename(directory).startsWith("shear-speech-")
)
  throw Error("Expected an existing synthesis staging directory");
const speech = JSON.parse(
  readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
);
const results = narrationShots.map((shot) => {
  let sourceVerified = false;
  let timingVerified = false;
  let hash: string | undefined;
  let duration: number | undefined;
  let error: string | undefined;
  try {
    const path = join(directory, `${shot.id}.wav`);
    const timing = JSON.parse(
      readFileSync(join(directory, `${shot.id}.json`), "utf8"),
    ) as AudioTiming;
    const document = buildSpeechDocument(speech[shot.id], shot.id);
    hash = audioSha256(path);
    if (
      hash !== timing.audioSha256 ||
      document.fingerprint !== timing.fingerprint ||
      document.text !== timing.speech ||
      timing.outputFormat !== synthesisFormat
    )
      throw Error("Staged source does not match the current request and hash");
    verifyPcmSource(path);
    decodeAudio(path);
    duration = measureAudio(path);
    if (duration !== timing.duration)
      throw Error("Staged duration does not match the source WAV");
    sourceVerified = true;
    verifyAlignment(timing, path);
    createCaptions(shot.caption, timing, shot.captionPlan);
    timingVerified = true;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }
  return {
    id: shot.id,
    sourceVerified,
    timingVerified,
    audioSha256: hash,
    duration,
    assessmentResponseAvailable: existsSync(
      join(directory, `${shot.id}.wav.assessment.json`),
    ),
    ...(error ? { error } : {}),
  };
});
const summary = {
  stage: "unpublished-source-check",
  total: results.length,
  sourceVerified: results.filter((row) => row.sourceVerified).length,
  timingVerified: results.filter((row) => row.timingVerified).length,
  listening: "pending",
  results,
};
const output = join(directory, "staging-summary.json");
writeFileSync(output, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ ...summary, results: undefined, output }));
for (const row of results.filter((row) => row.error))
  console.error(`${row.id}: ${row.error}`);
if (summary.timingVerified !== summary.total) process.exitCode = 1;
