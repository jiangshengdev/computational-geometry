import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { shots } from "../src/storyboard.ts";
import { createCaptions, type AudioTiming } from "../src/speech-timing.ts";

// Display text stays separate from speech; cues follow measured word boundaries.
const timing = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../src/audio-timing.json", import.meta.url)),
    "utf8",
  ),
) as Record<string, AudioTiming>;
const captions = Object.fromEntries(
  shots.map((shot) => {
    if (!timing[shot.id]) throw Error(`Missing measured audio: ${shot.id}`);
    return [shot.id, createCaptions(shot.caption, timing[shot.id])];
  }),
);
writeFileSync(
  fileURLToPath(new URL("../src/captions.json", import.meta.url)),
  JSON.stringify(captions, null, 2) + "\n",
);
