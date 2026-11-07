import assert from "node:assert/strict";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import type { AudioTiming } from "../../../shared/speech/timing.ts";
import { shots } from "../src/storyboard.ts";
import { verifyRecordings } from "./measured-audio.ts";

const args = process.argv.slice(2);
assert(
  args.filter((a) => a.startsWith("--staging=")).length >= 1 &&
    args.filter((a) => a === "--write").length <= 1 &&
    args.every((a) => a === "--write" || a.startsWith("--staging=")),
  "Use --staging=<selected batch> [--staging=<additional selected batch>] [--write]",
);
const staging = args
  .filter((a) => a.startsWith("--staging="))
  .map((a) => realpathSync(resolve(a.slice(10))));
assert.equal(
  new Set(staging).size,
  staging.length,
  "Repeated staging directory",
);
const sources = Object.fromEntries(
  shots.map((shot) => {
    const matches = staging.filter((directory) =>
      existsSync(join(directory, `${shot.id}.aligned.json`)),
    );
    assert.equal(
      matches.length,
      1,
      `${shot.id}: require exactly one selected measured source`,
    );
    return [shot.id, matches[0]];
  }),
);
const timing: Record<string, AudioTiming> = Object.fromEntries(
  shots.map((s) => [
    s.id,
    JSON.parse(
      readFileSync(join(sources[s.id], `${s.id}.aligned.json`), "utf8"),
    ),
  ]),
);
const result = verifyRecordings(sources, timing, true);
const root = fileURLToPath(new URL("../", import.meta.url));
const target = join(root, "public/narration");
const outputs = await Promise.all(
  [
    ["audio-timing", timing],
    ["captions", result.captions],
  ].map(
    async ([name, value]) =>
      [
        join(root, `src/${name}.json`),
        await format(JSON.stringify(value), { parser: "json" }),
      ] as const,
  ),
);
// Preserve only irrecoverable request-state evidence, without local paths or credentials.
const batches = staging.map((directory) => ({
  directory,
  manifest: JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8")),
}));
// Retain superseded flagged recordings until the deferred listening review.
// They are evidence only and never enter the production timeline.
const reviewCopies: { source: string; target: string; hash: string }[] = [];
for (const { directory } of batches) {
  for (const shot of shots) {
    const assessmentPath = join(directory, `${shot.id}.wav.assessment.json`);
    if (directory === sources[shot.id] || !existsSync(assessmentPath)) continue;
    const response = JSON.parse(readFileSync(assessmentPath, "utf8"));
    const source = join(directory, `${shot.id}.wav`);
    const original = JSON.parse(
      readFileSync(join(directory, `${shot.id}.json`), "utf8"),
    );
    const request = JSON.parse(
      readFileSync(join(directory, "request-plan.json"), "utf8"),
    ).documents.find((document: { id: string }) => document.id === shot.id);
    assert.equal(request.fingerprint, original.fingerprint);
    const hash = audioSha256(source);
    assert.equal(hash, original.audioSha256);
    const prefix = join(
      root,
      "assets/narration-review",
      `${shot.id}-${hash.slice(0, 12)}`,
    );
    reviewCopies.push({ source, target: `${prefix}.wav`, hash });
    outputs.push([
      `${prefix}.json`,
      await format(
        JSON.stringify({
          id: shot.id,
          status: "superseded-candidate-awaiting-listening",
          original,
          request,
          response,
          selectedAudioSha256: timing[shot.id].audioSha256,
          actualListeningPerformed: false,
        }),
        { parser: "json" },
      ),
    ]);
  }
}
const unresolved = batches.flatMap(({ manifest }) =>
  manifest.requests
    .filter(
      (request: { status: string }) =>
        !["not-started", "synthesized-and-decoded"].includes(request.status),
    )
    .map(
      (request: {
        id: string;
        fingerprint: string;
        status: string;
        startedAt: string;
        endedAt: string;
      }) => ({ planSha256: manifest.planSha256, ...request }),
    ),
);
if (unresolved.length) {
  const replacements = unresolved.map((request: { id: string }) => {
    const batch = batches.find(
      (batch) => batch.directory === sources[request.id],
    )!.manifest;
    const selected = batch.requests.find(
      (entry: { id: string }) => entry.id === request.id,
    );
    assert.equal(selected.status, "synthesized-and-decoded");
    assert.equal(selected.fingerprint, timing[request.id].fingerprint);
    return {
      planSha256: batch.planSha256,
      ...selected,
      audioSha256: timing[request.id].audioSha256,
    };
  });
  outputs.push([
    join(root, "assets/narration-request-evidence.json"),
    await format(JSON.stringify({ unresolved, replacements }), {
      parser: "json",
    }),
  ]);
}
// This entry adopts the first complete batch. Never overwrite another selection.
for (const copy of reviewCopies)
  if (existsSync(copy.target))
    assert.equal(audioSha256(copy.target), copy.hash);
for (const row of Object.values(timing)) {
  const path = join(target, row.audioFile!);
  if (existsSync(path))
    assert.equal(
      audioSha256(path),
      row.audioSha256,
      "Different formal audio exists",
    );
}
for (const [path, value] of outputs)
  if (existsSync(path))
    assert.equal(
      readFileSync(path, "utf8"),
      value,
      "Different formal timing exists",
    );
if (args.includes("--write")) {
  for (const copy of reviewCopies) {
    mkdirSync(dirname(copy.target), { recursive: true });
    if (!existsSync(copy.target))
      copyFileSync(copy.source, copy.target, constants.COPYFILE_EXCL);
  }
  mkdirSync(target, { recursive: true });
  for (const [id, row] of Object.entries(timing)) {
    const path = join(target, row.audioFile!);
    if (!existsSync(path))
      copyFileSync(
        join(sources[id], row.audioFile!),
        path,
        constants.COPYFILE_EXCL,
      );
  }
  for (const [path, value] of outputs)
    if (!existsSync(path)) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, value, { flag: "wx" });
    }
}
console.log(
  JSON.stringify({
    clips: result.clips,
    counts: result.counts,
    adopted: args.includes("--write"),
    actualListeningPerformed: false,
  }),
);
