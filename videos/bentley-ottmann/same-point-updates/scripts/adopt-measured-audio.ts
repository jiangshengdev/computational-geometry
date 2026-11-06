import assert from "node:assert/strict";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { verifyRecordings } from "./measured-audio.ts";
import type { AudioTiming } from "../../../shared/speech/timing.ts";
import { shots } from "../src/storyboard.ts";

const args = process.argv.slice(2);
assert(
  args.filter((a) => a.startsWith("--staging=")).length === 1 &&
    args.filter((a) => a === "--write").length <= 1 &&
    args.filter((a) => a === "--consume-staging").length <= 1 &&
    args.every(
      (a) =>
        a === "--write" ||
        a === "--consume-staging" ||
        a.startsWith("--staging="),
    ),
  "Require --staging=<candidate batch> [--write] [--consume-staging]",
);
const staging = resolve(
  args.find((a) => a.startsWith("--staging="))!.slice(10),
);
const root = fileURLToPath(new URL("../", import.meta.url));
const consume = args.includes("--consume-staging");
assert(
  !consume || args.includes("--write"),
  "Consuming staging requires --write",
);
if (consume) {
  assert.equal(
    dirname(realpathSync(staging)),
    realpathSync(join(root, "out")),
    "Only a direct local output batch can be consumed",
  );
  const expected = [
    "manifest.json",
    "assessment-manifest.json",
    "request-plan.json",
    ...shots.flatMap((s) => [
      `${s.id}.wav`,
      `${s.id}.json`,
      `${s.id}.words.json`,
      `${s.id}.wav.assessment.json`,
      `${s.id}.aligned.json`,
    ]),
  ];
  assert.deepEqual(
    readdirSync(staging).sort(),
    expected.sort(),
    "Unexpected staging files; preserve them for inspection",
  );
}
const manifest = JSON.parse(
  readFileSync(join(staging, "assessment-manifest.json"), "utf8"),
);
assert.deepEqual(
  manifest.requests.map((r: { id: string }) => r.id),
  shots.map((s) => s.id),
);
assert(
  manifest.requests.every(
    (r: { status: string }) => r.status === "assessed-timing-available",
  ),
);
const timing: Record<string, AudioTiming> = Object.fromEntries(
  shots.map((s) => [
    s.id,
    JSON.parse(readFileSync(join(staging, `${s.id}.aligned.json`), "utf8")),
  ]),
);
for (const request of manifest.requests) {
  assert.equal(timing[request.id].audioSha256, request.audioSha256);
  assert.equal(timing[request.id].fingerprint, request.fingerprint);
}
const result = verifyRecordings(staging, timing);
const destination = join(root, "public/narration");
// Validate every destination before changing any formal file.
for (const s of shots) {
  const target = join(destination, `${s.id}.wav`);
  if (existsSync(target))
    assert.equal(
      audioSha256(target),
      timing[s.id].audioSha256,
      "Refuse to overwrite different formal audio",
    );
}
const outputs = await Promise.all(
  [
    ["audio-timing", timing],
    ["captions", result.captions],
    [
      "audio-adoption",
      {
        synthesis: JSON.parse(
          readFileSync(join(staging, "manifest.json"), "utf8"),
        ),
        assessment: manifest,
        adopted: true,
        actualListeningPerformed: false,
      },
    ],
  ].map(
    async ([name, data]) =>
      [name, await format(JSON.stringify(data), { parser: "json" })] as const,
  ),
);
if (args.includes("--write")) {
  mkdirSync(destination, { recursive: true });
  for (const s of shots) {
    const target = join(destination, `${s.id}.wav`);
    if (!existsSync(target))
      copyFileSync(
        join(staging, `${s.id}.wav`),
        target,
        constants.COPYFILE_EXCL,
      );
  }
  for (const [name, data] of outputs)
    writeFileSync(join(root, `src/${name}.json`), data);
  if (consume) {
    for (const shot of shots)
      assert.equal(
        audioSha256(join(destination, `${shot.id}.wav`)),
        timing[shot.id].audioSha256,
      );
    for (const [name, data] of outputs)
      assert.equal(readFileSync(join(root, `src/${name}.json`), "utf8"), data);
    rmSync(staging, { recursive: true });
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
