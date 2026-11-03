import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import {
  type AudioTiming,
  validateWords,
} from "../../../shared/speech/timing.ts";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { plannedDocuments } from "./planned-documents.ts";

// Pure offline reconciliation: never call the returned alignAudio service entry.
const { assessmentWords, verifyAlignment } = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});
const root = fileURLToPath(
  new URL("../out/synthesis-6eb84c2bf3a6/", import.meta.url),
);
const manifest = JSON.parse(
  readFileSync(join(root, "assessment-manifest.json"), "utf8"),
);
const original = JSON.parse(
  readFileSync(join(root, "timing-candidates.json"), "utf8"),
) as Record<string, AudioTiming>;
const aligned: Record<string, AudioTiming> = {};
const results = [];
const counts = { Mispronunciation: 0, Omission: 0, Insertion: 0 };
for (const document of plannedDocuments()) {
  const entry = manifest.entries.find(
    (e: { id: string }) => e.id === document.id,
  );
  const file = join(root, `${document.id}.assessment.json`);
  if (
    entry?.state !== "complete" ||
    entry.responseSha256 !==
      createHash("sha256").update(readFileSync(file)).digest("hex")
  )
    throw Error(`${document.id}: missing or stale analysis response`);
  const timing = original[document.id];
  if (
    timing.audioSha256 !== audioSha256(join(root, document.audioFile)) ||
    timing.fingerprint !== document.fingerprint ||
    entry.audioSha256 !== timing.audioSha256 ||
    entry.fingerprint !== document.fingerprint
  )
    throw Error(`${document.id}: stale audio/request`);
  const response = JSON.parse(readFileSync(file, "utf8"));
  const flags = (
    response.NBest[0].Words as {
      Word: string;
      Offset: number;
      Duration: number;
      PronunciationAssessment: { ErrorType: string };
    }[]
  ).filter((w) => w.PronunciationAssessment.ErrorType !== "None");
  for (const flag of flags) {
    const type = flag.PronunciationAssessment.ErrorType;
    if (type in counts) counts[type as keyof typeof counts]++;
  }
  let alignmentError: string | undefined;
  try {
    const words = assessmentWords(timing, response);
    const resolved: AudioTiming = {
      ...timing,
      words,
      alignment: {
        method: "azure-pronunciation-assessment",
        audioSha256: timing.audioSha256!,
        synthesisWords: timing.words,
        response,
        pronunciationReview: "pending-listening",
      },
    };
    validateWords(resolved);
    verifyAlignment(resolved, join(root, document.audioFile));
    aligned[document.id] = resolved;
  } catch (error) {
    alignmentError =
      error instanceof Error ? error.message : "Offline alignment failed";
  }
  results.push({
    id: document.id,
    audioSha256: timing.audioSha256,
    fingerprint: document.fingerprint,
    aligned: !alignmentError,
    alignmentError,
    flags,
    pronunciationReview: "pending-listening",
  });
}
writeFileSync(
  join(root, "aligned-timing.json"),
  JSON.stringify(aligned, null, 2) + "\n",
);
const summary = {
  total: results.length,
  assessed: results.length,
  aligned: Object.keys(aligned).length,
  counts,
  results,
  serviceRequestsAdded: 0,
  published: false,
  listening: "pending",
};
writeFileSync(
  join(root, "assessment-summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      total: summary.total,
      assessed: summary.assessed,
      aligned: summary.aligned,
      counts,
      alignmentFailures: results
        .filter((r) => r.alignmentError)
        .map((r) => ({ id: r.id, error: r.alignmentError })),
      listening: "pending",
    },
    null,
    2,
  ),
);
if (summary.aligned !== summary.total || counts.Omission || counts.Insertion)
  process.exitCode = 1;
