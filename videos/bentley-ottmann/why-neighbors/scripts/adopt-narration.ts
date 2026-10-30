import { readFileSync, writeFileSync, mkdtempSync, linkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { narrationShots } from "./sentence-pauses.ts";
import {
  assessmentWords,
  verifyAlignment,
  alignAudio,
  buildSpeechDocument,
  voice,
} from "./azure-speech.ts";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { runNarration } from "../../../shared/speech/narration.ts";
import {
  createCaptions,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";
import reviewData from "../src/listening-review.json" with { type: "json" };

const root = fileURLToPath(new URL("../", import.meta.url));
const source = process.argv
  .find((arg) => arg.startsWith("--staging="))
  ?.slice(10);
if (
  !source ||
  process.argv.some(
    (arg) => arg.startsWith("--resume=") || arg.startsWith("--shots="),
  )
)
  throw Error(
    "Use --staging=<existing complete batch>; adoption never synthesizes audio",
  );
const speech = JSON.parse(
  readFileSync(join(root, "src/speech-text.json"), "utf8"),
);
const reviews = reviewData as Record<
  string,
  NonNullable<AudioTiming["alignment"]>["reviewedRecognition"]
>;
const prepared = new Map<string, AudioTiming>();
const errors: Error[] = [];
for (const shot of narrationShots) {
  try {
    const path = join(source, `${shot.id}.wav`);
    const audio: AudioTiming = JSON.parse(
      readFileSync(join(source, `${shot.id}.json`), "utf8"),
    );
    const doc = buildSpeechDocument(speech[shot.id], shot.id);
    if (
      audio.audioSha256 !== audioSha256(path) ||
      audio.fingerprint !== doc.fingerprint ||
      audio.speech !== doc.text
    )
      throw Error("Audio/hash/text/SSML fingerprint mismatch");
    const response = JSON.parse(
      readFileSync(`${path}.assessment.json`, "utf8"),
    );
    audio.alignment = {
      method: "azure-pronunciation-assessment",
      audioSha256: audio.audioSha256,
      synthesisWords: audio.alignment?.synthesisWords ?? audio.words,
      response,
      pronunciationReview: "pending-listening",
      ...(reviews[shot.id] ? { reviewedRecognition: reviews[shot.id] } : {}),
    };
    audio.words = assessmentWords(audio, response);
    verifyAlignment(audio, path);
    createCaptions(shot.caption, audio, shot.captionPlan);
    prepared.set(shot.id, audio);
  } catch (error) {
    errors.push(new Error(`${shot.id}: ${String(error)}`));
  }
}
if (errors.length)
  throw new Error(
    "Batch reconciliation failed; originals retained\n" +
      errors.map((e) => e.message).join("\n"),
  );
// The original audition directory remains intact. The existing publisher owns
// only this disposable, hash-identical batch, and cannot call synthesis here.
const staging = mkdtempSync(join(tmpdir(), "shear-speech-"));
for (const [id, audio] of prepared) {
  linkSync(join(source, `${id}.wav`), join(staging, `${id}.wav`));
  writeFileSync(
    join(staging, `${id}.json`),
    JSON.stringify(audio, null, 2) + "\n",
  );
}
process.argv.push(`--resume=${staging}`);
await runNarration({
  root,
  shots: narrationShots,
  buildSpeechDocument,
  voice,
  alignAudio,
  verifyAlignment,
  synthesize: async () => {
    throw Error("Adoption cannot synthesize or replace accepted audio");
  },
  requireTimingFile: false,
  validateClauses: true,
  concurrency: 1,
});
