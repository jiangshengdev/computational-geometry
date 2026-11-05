import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { readTiming, verifyRecordings } from "./measured-audio.ts";

export function checkAudio(decode = true) {
  const root = new URL("../", import.meta.url);
  const timing = readTiming(
    fileURLToPath(new URL("src/audio-timing.json", root)),
  );
  const result = verifyRecordings(
    fileURLToPath(new URL("public/narration/", root)),
    timing,
    decode,
  );
  assert.deepEqual(
    JSON.parse(readFileSync(new URL("src/captions.json", root), "utf8")),
    result.captions,
    "Measured captions are stale; adopt the selected batch",
  );
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { clips, counts, actualListeningPerformed } = checkAudio();
  console.log(JSON.stringify({ clips, counts, actualListeningPerformed }));
}
