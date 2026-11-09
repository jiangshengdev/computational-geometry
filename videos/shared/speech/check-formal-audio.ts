import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AudioTiming } from "./timing.ts";

export function checkFormalAudio(
  root: URL,
  verifyRecordings: (
    directory: string,
    timing: Record<string, AudioTiming>,
    decode: boolean,
  ) => {
    captions: unknown;
    clips: number;
    counts: unknown;
    reviewedRecognition: unknown;
    unresolved: unknown;
  },
  decode = true,
) {
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
    reviewedRecognition: result.reviewedRecognition,
    unresolved: result.unresolved,
    actualListeningPerformed: false,
  };
}
