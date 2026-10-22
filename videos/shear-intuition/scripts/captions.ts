import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { shots } from "../src/storyboard.ts";

// Each short shot is one subtitle cue. Source captions remain independent from TTS.
const timing = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../src/audio-timing.json", import.meta.url)),
    "utf8",
  ),
) as Record<string, { duration: number }>;
const captions = Object.fromEntries(
  shots.map((shot) => {
    if (!timing[shot.id]) throw Error(`Missing measured audio: ${shot.id}`);
    return [
      shot.id,
      [
        {
          text: shot.caption,
          startMs: 0,
          endMs: timing[shot.id].duration * 1000,
          timestampMs: null,
          confidence: null,
        },
      ],
    ];
  }),
);
writeFileSync(
  fileURLToPath(new URL("../src/captions.json", import.meta.url)),
  JSON.stringify(captions, null, 2) + "\n",
);
