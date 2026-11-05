import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  linkSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { adoptMeasuredAudio } from "./adopt-measured-audio.ts";
import { readTiming } from "./measured-audio.ts";
import { audioSha256 } from "../../../shared/speech/audio.ts";

test("adoption is read-only by default and validates the last recording before writing any formal asset", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "same-point-adoption-"));
  t.after(() => rmSync(directory, { recursive: true }));
  const project = fileURLToPath(new URL("../", import.meta.url));
  const root = join(directory, "project"),
    staging = join(directory, "staging");
  mkdirSync(join(root, "public/narration"), { recursive: true });
  mkdirSync(join(root, "src"));
  mkdirSync(staging);
  const original = readFileSync(join(project, "src/audio-timing.json"), "utf8");
  const timing = readTiming(join(project, "src/audio-timing.json"));
  writeFileSync(join(root, "src/audio-timing.json"), original);
  writeFileSync(join(staging, "audio-timing.json"), original);
  for (const recording of Object.values(timing))
    linkSync(
      join(project, "public/narration", recording.audioFile!),
      join(staging, recording.audioFile!),
    );

  const dryRun = await adoptMeasuredAudio(root, staging);
  assert.equal(dryRun.adopted, false);
  assert.equal(dryRun.clips, 57);
  assert.deepEqual(readdirSync(join(root, "public/narration")), []);
  assert.equal(
    readFileSync(join(root, "src/audio-timing.json"), "utf8"),
    original,
  );
  assert.deepEqual(readdirSync(join(root, "src")), ["audio-timing.json"]);

  const ids = Object.keys(timing);
  const last = ids[ids.length - 1];
  const stale = structuredClone(timing);
  stale[last].fingerprint = "stale";
  writeFileSync(join(staging, "audio-timing.json"), JSON.stringify(stale));
  await assert.rejects(
    adoptMeasuredAudio(root, staging, true),
    new RegExp(`${last}: stale request`),
  );
  assert.deepEqual(readdirSync(join(root, "public/narration")), []);
  assert.equal(
    readFileSync(join(root, "src/audio-timing.json"), "utf8"),
    original,
  );

  writeFileSync(join(staging, "audio-timing.json"), original);
  const adopted = await adoptMeasuredAudio(root, staging, true);
  assert.equal(adopted.adopted, true);
  assert.equal(adopted.currentTimingMatches, true);
  for (const recording of Object.values(timing))
    assert.equal(
      audioSha256(join(root, "public/narration", recording.audioFile!)),
      recording.audioSha256,
    );
  assert.deepEqual(
    JSON.parse(readFileSync(join(root, "src/captions.json"), "utf8")),
    JSON.parse(readFileSync(join(project, "src/captions.json"), "utf8")),
  );
});
