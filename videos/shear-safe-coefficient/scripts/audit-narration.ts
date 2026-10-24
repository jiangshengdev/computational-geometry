import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { audioSha256 } from "../../shared/speech/audio.ts";
import { narrationFile } from "../../shared/speech/source.ts";
import type { AudioTiming } from "../../shared/speech/timing.ts";
import { alignAudio, buildSpeechDocument } from "./azure-speech.ts";
import { shots } from "../src/storyboard.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const timing: Record<string, AudioTiming> = JSON.parse(
  readFileSync(join(root, "src/audio-timing.json"), "utf8"),
);
const speech: Record<string, unknown> = JSON.parse(
  readFileSync(join(root, "src/speech-text.json"), "utf8"),
);
const directory = join(root, "out/narration-audit");
mkdirSync(directory, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), "shear232-assessment-"));
type Response = {
  RecognitionStatus?: string;
  NBest?: {
    Words?: {
      Word: string;
      PronunciationAssessment: { ErrorType: string; AccuracyScore?: number };
    }[];
  }[];
};
const results = [];
for (const shot of shots) {
  const audio = timing[shot.id];
  const file = join(root, "public/narration", narrationFile(shot.id, audio));
  const hash = audioSha256(file);
  const doc = buildSpeechDocument(speech[shot.id], shot.id);
  if (
    hash !== audio.audioSha256 ||
    doc.fingerprint !== audio.fingerprint ||
    doc.text !== audio.speech
  )
    throw Error(`Stale audio: ${shot.id}`);
  const output = join(directory, `${shot.id}.json`);
  const cached = existsSync(output)
    ? JSON.parse(readFileSync(output, "utf8"))
    : null;
  let response: Response | undefined;
  let requestError: string | undefined;
  if (
    cached?.audioSha256 === hash &&
    cached.fingerprint === doc.fingerprint &&
    cached.response?.RecognitionStatus === "Success"
  )
    response = cached.response;
  else if (audio.alignment?.audioSha256 === hash)
    response = audio.alignment.response as Response;
  else {
    const local = join(temporary, `${shot.id}.wav`);
    copyFileSync(file, local);
    try {
      await alignAudio(audio, local);
    } catch {
      requestError = "Assessment or alignment rejected; inspect response";
    }
    if (existsSync(`${local}.assessment.json`))
      response = JSON.parse(readFileSync(`${local}.assessment.json`, "utf8"));
  }
  const words = response?.NBest?.[0]?.Words;
  const complete =
    response?.RecognitionStatus === "Success" && Boolean(words?.length);
  const anomalies = (words ?? []).filter(
    (word) => word.PronunciationAssessment.ErrorType !== "None",
  );
  const result = {
    id: shot.id,
    audioSha256: hash,
    fingerprint: doc.fingerprint,
    speech: doc.text,
    complete,
    anomalies,
    ...(!complete
      ? { requestError: requestError ?? "Missing successful response" }
      : {}),
  };
  writeFileSync(
    output,
    JSON.stringify({ ...result, response }, null, 2) + "\n",
  );
  results.push(result);
  console.log(
    `${shot.id}: ${complete ? "assessed" : "request failed"}; ${anomalies.length} flags`,
  );
}
const summary = {
  total: results.length,
  assessed: results.filter((r) => r.complete).length,
  clean: results.filter((r) => r.complete && !r.anomalies.length).length,
  results,
};
writeFileSync(
  join(directory, "summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  `Assessment evidence: ${directory}; automatic flags require whole-sentence listening`,
);
if (summary.assessed !== summary.total || summary.clean !== summary.total)
  process.exitCode = 1;
