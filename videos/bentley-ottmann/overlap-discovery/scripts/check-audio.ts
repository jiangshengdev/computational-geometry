import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { verifyRecordings } from "./measured-audio.ts";

export function checkAudio(decode = true) {
  const root = new URL("../", import.meta.url);
  const timing = JSON.parse(
    readFileSync(new URL("src/audio-timing.json", root), "utf8"),
  );
  const { captions, ...result } = verifyRecordings(
    fileURLToPath(new URL("public/narration", root)),
    timing,
    decode,
  );
  assert.deepEqual(
    JSON.parse(readFileSync(new URL("src/captions.json", root), "utf8")),
    captions,
    "Stale captions",
  );
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(checkAudio()));
