import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { plannedDocuments, voice } from "./planned-documents.ts";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import {
  speechComparisonText,
  validateWords,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";

const root = resolve(
  new URL("../out/synthesis-6eb84c2bf3a6/", import.meta.url).pathname,
);
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const documents = plannedDocuments();
const timings: Record<string, AudioTiming> = {};
const issues: {
  id: string;
  zeroDurationWords: { text: string; textOffset: number }[];
  mappingFailure: boolean;
  validationPassed: boolean;
}[] = [];
for (const document of documents) {
  const entry = manifest.entries.find(
    (candidate: { id: string }) => candidate.id === document.id,
  );
  if (entry?.state !== "complete")
    throw Error(`${document.id}: successful verified source not yet available`);
  const audioFile = join(root, document.audioFile);
  if (
    entry.fingerprint !== document.fingerprint ||
    entry.audioSha256 !== audioSha256(audioFile)
  )
    throw Error(`${document.id}: source/request hash mismatch`);
  const response = JSON.parse(
    readFileSync(join(root, `${document.id}.response.json`), "utf8"),
  );
  if (response.fingerprint !== document.fingerprint)
    throw Error(`${document.id}: stale response`);
  let cursor = 0,
    mappingFailure = false;
  const source = speechComparisonText(document.text);
  const words = response.rawWordEvents
    .map((event: { text: string; audioOffset: number; duration: number }) => {
      // Locate returned text in the immutable source, preserving every service
      // timestamp and duration. No interpolation or subdivision repairs zeros.
      const offset = source.indexOf(speechComparisonText(event.text), cursor);
      if (
        offset < 0 ||
        !/^[\p{P}\p{Z}\s]*$/u.test(document.text.slice(cursor, offset))
      ) {
        mappingFailure = true;
        return null;
      }
      cursor = offset + event.text.length;
      return {
        text: event.text,
        textOffset: offset,
        wordLength: event.text.length,
        startMs: event.audioOffset / 10000,
        durationMs: event.duration / 10000,
      };
    })
    .filter((word: unknown) => word !== null);
  if (!/^[\p{P}\p{Z}\s]*$/u.test(document.text.slice(cursor)))
    mappingFailure = true;
  const timing: AudioTiming = {
    audioFile: document.audioFile,
    outputFormat: manifest.outputFormat,
    audioSha256: entry.audioSha256,
    duration: entry.duration,
    words,
    speech: document.text,
    voice,
    fingerprint: document.fingerprint,
  };
  let validationPassed = !mappingFailure;
  try {
    validateWords(timing);
  } catch {
    validationPassed = false;
  }
  const zeroDurationWords = timing.words
    .filter((word) => word.durationMs === 0 && /[\p{L}\p{N}]/u.test(word.text))
    .map(({ text, textOffset }) => ({ text, textOffset }));
  timings[document.id] = timing;
  issues.push({
    id: document.id,
    zeroDurationWords,
    mappingFailure,
    validationPassed,
  });
}
const report = {
  status: issues.every((entry) => entry.validationPassed)
    ? "timing-checks-passed-assessment-and-listening-still-pending"
    : "original-audio-retained-word-timing-blocked",
  sources: documents.length,
  sourceFormatAndDecode:
    "verified at synthesis; reused with matching audio hash",
  totalAudioSeconds: Object.values(timings).reduce((n, t) => n + t.duration, 0),
  longestAudioSeconds: Math.max(
    ...Object.values(timings).map((t) => t.duration),
  ),
  validWordTimingShots: issues.filter((entry) => entry.validationPassed).length,
  zeroDurationShots: issues.filter((entry) => entry.zeroDurationWords.length)
    .length,
  zeroDurationWords: issues.reduce(
    (n, entry) => n + entry.zeroDurationWords.length,
    0,
  ),
  mappingFailureShots: issues.filter((entry) => entry.mappingFailure).length,
  recognitionRequests: 0,
  assessmentRequests: 0,
  listening: "not accepted",
  published: false,
  issues,
};
writeFileSync(
  join(root, "timing-candidates.json"),
  JSON.stringify(timings, null, 2) + "\n",
);
writeFileSync(
  join(root, "checks.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const { issues: details, ...summary } = report;
console.log(JSON.stringify(summary, null, 2));
if (!details.every((entry) => entry.validationPassed)) process.exitCode = 1;
