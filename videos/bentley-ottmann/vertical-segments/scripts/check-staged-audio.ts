import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import { verifyRecording } from "../../../shared/speech/verify-recording.ts";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { currentNarrationPlan } from "./measured-audio.ts";
import {
  audioSha256,
  decodeAudio,
  measureAudio,
  verifyPcmSource,
} from "../../../shared/speech/audio.ts";

const root = fileURLToPath(
  new URL("../assets/narration-staging/", import.meta.url),
);
const directories = ["initial", "recovery"].map((name) => join(root, name));
const plan = currentNarrationPlan();
const results = [];
const { verifyAlignment } = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});
for (const doc of plan.documents) {
  const sources = directories.filter((directory) =>
    existsSync(join(directory, doc.audioFile)),
  );
  assert.equal(sources.length, 1, `${doc.id}: require one original recording`);
  const directory = sources[0];
  const path = join(directory, doc.audioFile);
  const metadata = JSON.parse(
    readFileSync(join(directory, `${doc.id}.json`), "utf8"),
  );
  assert.equal(metadata.audioSha256, audioSha256(path), doc.id);
  assert.equal(metadata.fingerprint, doc.fingerprint, doc.id);
  assert.equal(metadata.speech, doc.text, doc.id);
  assert.equal(metadata.voice, plan.voice, doc.id);
  assert.equal(metadata.outputFormat, plan.outputFormat, doc.id);
  assert.equal(metadata.duration, measureAudio(path), doc.id);
  verifyPcmSource(path);
  decodeAudio(path);
  const attempts = readdirSync(directory)
    .filter((name) => /^assessment-manifest(?:-[a-f0-9]+)?\.json$/.test(name))
    .flatMap(
      (name) =>
        JSON.parse(readFileSync(join(directory, name), "utf8")).requests,
    )
    .filter(
      (record: { id: string; status: string }) =>
        record.id === doc.id && record.status !== "not-started",
    );
  assert.equal(
    attempts.length,
    1,
    `${doc.id}: require one recorded assessment attempt`,
  );
  let assessment = attempts[0];
  let assessmentDirectory = directory;
  if (
    doc.id === "VS33" &&
    existsSync(join(root, "vs33-assessment-recovery.json"))
  ) {
    const recovery = JSON.parse(
      readFileSync(join(root, "vs33-assessment-recovery.json"), "utf8"),
    );
    assert.equal(recovery.id, doc.id);
    assert.equal(recovery.attempt, 2);
    assert.equal(recovery.automaticRetries, 0);
    assert.equal(recovery.audioSha256, metadata.audioSha256);
    assert.equal(recovery.fingerprint, doc.fingerprint);
    assert.equal(assessment.status, "request-failed-or-uncertain");
    assert.equal(
      createHash("sha256")
        .update(readFileSync(join(root, recovery.originalManifest)))
        .digest("hex"),
      recovery.originalManifestSha256,
    );
    assessmentDirectory = join(root, recovery.newDirectory);
    const second = JSON.parse(
      readFileSync(
        join(assessmentDirectory, "assessment-manifest.json"),
        "utf8",
      ),
    );
    assert.equal(second.requests.length, 1);
    assert.equal(second.requests[0].id, doc.id);
    assessment = second.requests[0];
  }
  assert.equal(assessment.audioSha256, metadata.audioSha256, doc.id);
  assert.equal(assessment.fingerprint, doc.fingerprint, doc.id);
  if (assessment.status === "assessed-timing-available") {
    const aligned = JSON.parse(
      readFileSync(join(assessmentDirectory, `${doc.id}.aligned.json`), "utf8"),
    );
    const counts = { Mispronunciation: 0, Omission: 0, Insertion: 0 };
    verifyRecording({
      audio: aligned,
      path,
      expected: { ...doc, voice: plan.voice, outputFormat: plan.outputFormat },
      verifyAlignment,
      decode: false,
      counts,
    });
    assert.deepEqual(
      aligned.alignment.response,
      JSON.parse(
        readFileSync(
          join(assessmentDirectory, `${doc.audioFile}.assessment.json`),
          "utf8",
        ),
      ),
      doc.id,
    );
    assert.deepEqual(counts, assessment.flags, doc.id);
  }
  results.push({
    id: doc.id,
    duration: metadata.duration,
    status: assessment.status,
    flags: assessment.flags ?? null,
  });
}
const blockers = results.filter(
  (record) => record.status !== "assessed-timing-available",
);
console.log(
  JSON.stringify(
    {
      recordings: results.length,
      originalPcmDecoded: true,
      totalSourceSeconds: results.reduce((sum, row) => sum + row.duration, 0),
      measuredTimingAvailable: results.length - blockers.length,
      blockers,
      actualListeningPerformed: false,
      adopted: false,
    },
    null,
    2,
  ),
);
if (blockers.length) process.exitCode = 1;
