import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  constants,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createAlignmentTools } from "../../../shared/speech/azure-alignment.ts";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import {
  createCaptions,
  validateWords,
  type AudioTiming,
} from "../../../shared/speech/timing.ts";
import { plannedDocuments } from "./planned-documents.ts";
import { captionPlanFor } from "./caption-plans.ts";
import { shots } from "../src/storyboard.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const staging = join(root, "out/synthesis-6eb84c2bf3a6");
const summary = JSON.parse(
  readFileSync(join(staging, "assessment-summary.json"), "utf8"),
);
if (
  summary.assessed !== 50 ||
  summary.aligned !== 50 ||
  summary.counts.Omission ||
  summary.counts.Insertion
)
  throw Error(
    "All current sources require complete assessment and valid timing without unresolved omission/insertion flags",
  );
const timing = JSON.parse(
  readFileSync(join(staging, "aligned-timing.json"), "utf8"),
) as Record<string, AudioTiming>;
const { verifyAlignment } = createAlignmentTools(sdk, {
  allowReviewedPronunciation: false,
  deferPronunciationReview: true,
});
const documents = plannedDocuments();
const captions = Object.fromEntries(
  shots.map((shot) => {
    const audio = timing[shot.id];
    const request = documents.find((d) => d.id === shot.id)!;
    const source = join(staging, request.audioFile);
    if (
      !audio ||
      audio.audioSha256 !== audioSha256(source) ||
      audio.fingerprint !== request.fingerprint ||
      audio.speech !== request.text
    )
      throw Error(`${shot.id}: unverified source`);
    validateWords(audio);
    verifyAlignment(audio, source);
    return [
      shot.id,
      createCaptions(shot.captions.join(""), audio, captionPlanFor(shot.id)),
    ];
  }),
);
if (process.argv.includes("--write")) {
  const destination = join(root, "public/narration");
  mkdirSync(destination, { recursive: true });
  for (const request of documents) {
    const target = join(destination, request.audioFile);
    if (existsSync(target)) {
      if (audioSha256(target) !== timing[request.id].audioSha256)
        throw Error(
          `${request.id}: refusing to replace existing different audio`,
        );
    } else
      copyFileSync(
        join(staging, request.audioFile),
        target,
        constants.COPYFILE_EXCL,
      );
  }
  for (const [name, value] of [
    ["audio-timing", timing],
    ["captions", captions],
    [
      "caption-plan",
      Object.fromEntries(
        shots.map((shot) => [shot.id, captionPlanFor(shot.id)]),
      ),
    ],
  ] as const)
    writeFileSync(
      join(root, `src/${name}.json`),
      await format(JSON.stringify(value), {
        parser: "json",
        tabWidth: 2,
        useTabs: false,
        bracketSpacing: true,
      }),
    );
}
console.log(
  `${documents.length} original WAVs and measured caption/timing sets ${process.argv.includes("--write") ? "adopted without re-encoding" : "verified; no publication"}; pronunciation/listening acceptance remains pending`,
);
