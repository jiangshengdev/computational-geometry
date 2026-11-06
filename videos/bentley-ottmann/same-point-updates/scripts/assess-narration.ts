import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import type { AudioTiming } from "../../../shared/speech/timing.ts";

const args = process.argv.slice(2);
assert(
  args.length === 1 && args[0].startsWith("--staging="),
  "Require --staging=<completed batch>",
);
const root = resolve(args[0].slice("--staging=".length));
const batch = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
assert(
  batch.requests.length &&
    batch.requests.every(
      (r: { status: string }) => r.status === "synthesized-and-decoded",
    ),
  "Synthesis batch is incomplete",
);
const manifestPath = join(root, "assessment-manifest.json");
assert(
  !existsSync(manifestPath),
  "Assessment already started; inspect saved state, do not replay",
);
const { alignAudio } = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});
const records: {
  id: string;
  status: string;
  audioSha256: string;
  fingerprint: string;
  flags?: Record<string, number>;
}[] = [];
// Validate the entire batch before sending any request.
const audios: { id: string; path: string; audio: AudioTiming }[] =
  batch.requests.map((request: { id: string; fingerprint: string }) => {
    const audio = JSON.parse(
      readFileSync(join(root, `${request.id}.json`), "utf8"),
    ) as AudioTiming;
    const path = join(root, `${request.id}.wav`);
    assert.equal(audio.audioSha256, audioSha256(path));
    assert.equal(audio.fingerprint, request.fingerprint);
    records.push({
      id: request.id,
      status: "not-started",
      audioSha256: audio.audioSha256!,
      fingerprint: request.fingerprint,
    });
    return { id: request.id, path, audio };
  });
const save = () =>
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        planSha256: batch.planSha256,
        automaticRetries: 0,
        published: false,
        listening: "not-performed",
        requests: records,
      },
      null,
      2,
    ) + "\n",
  );
writeFileSync(manifestPath, "{}\n", { flag: "wx" });
save();
for (const { id, path, audio } of audios) {
  const record = records.find((r) => r.id === id)!;
  record.status = "started";
  save();
  console.log(`${id}: assessment started`);
  let aligned: AudioTiming | undefined;
  try {
    aligned = await alignAudio(audio, path);
  } catch {
    // A successful response can still fail strict timing checks. Preserve it
    // for listening; only a missing/failed response stops later requests.
  }
  const responsePath = `${path}.assessment.json`;
  const response = existsSync(responsePath)
    ? JSON.parse(readFileSync(responsePath, "utf8"))
    : null;
  if (
    response?.RecognitionStatus !== "Success" ||
    !response.NBest?.[0]?.Words?.length
  ) {
    record.status = "request-failed-or-uncertain";
    save();
    throw Error(
      `${id}: assessment stopped; inspect saved response/state; no retry`,
    );
  }
  const counts: Record<string, number> = {
    Mispronunciation: 0,
    Omission: 0,
    Insertion: 0,
  };
  for (const word of response.NBest[0].Words) {
    const type = word.PronunciationAssessment?.ErrorType;
    if (type && type !== "None") counts[type] = (counts[type] ?? 0) + 1;
  }
  record.flags = counts;
  record.status = aligned
    ? "assessed-timing-available"
    : "assessed-timing-needs-review";
  if (aligned)
    writeFileSync(
      join(root, `${id}.aligned.json`),
      JSON.stringify(aligned, null, 2) + "\n",
      { flag: "wx" },
    );
  save();
  // Remove only disposable recognition copies made by alignAudio; keep the
  // original WAV and all raw/chunk response JSON evidence.
  for (const name of readdirSync(root)) {
    if (
      name === `${id}.wav.wav` ||
      (name.startsWith(`${id}.wav.assessment-chunk-`) && name.endsWith(".wav"))
    )
      rmSync(join(root, name));
  }
  console.log(`${id}: ${record.status}; ${JSON.stringify(counts)}`);
}
console.log(
  "Assessment finished; automatic flags are not listening conclusions; no formal assets adopted",
);
