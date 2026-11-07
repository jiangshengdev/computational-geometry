import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { verifyRecordings } from "./measured-audio.ts";

export function checkAudio(decode = true) {
  const root = new URL("../", import.meta.url);
  const timing = JSON.parse(
    readFileSync(new URL("src/audio-timing.json", root), "utf8"),
  );
  const result = verifyRecordings(
    fileURLToPath(new URL("public/narration", root)),
    timing,
    decode,
  );
  assert.deepEqual(
    JSON.parse(readFileSync(new URL("src/captions.json", root), "utf8")),
    result.captions,
    "Stale captions",
  );
  return {
    clips: result.clips,
    counts: result.counts,
    actualListeningPerformed: false,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(checkAudio()));
