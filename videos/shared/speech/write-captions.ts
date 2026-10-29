import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createCaptions,
  type AudioTiming,
  type CaptionPlan,
} from "./timing.ts";

export function writeCaptions(
  root: string,
  shots: { id: string; caption: string; captionPlan?: CaptionPlan }[],
) {
  // Display text stays separate from speech; cues follow measured word boundaries.
  const timing = JSON.parse(
    readFileSync(join(root, "src/audio-timing.json"), "utf8"),
  ) as Record<string, AudioTiming>;
  const captions = Object.fromEntries(
    shots.map((shot) => {
      if (!timing[shot.id]) throw Error(`Missing measured audio: ${shot.id}`);
      return [
        shot.id,
        createCaptions(shot.caption, timing[shot.id], shot.captionPlan),
      ];
    }),
  );
  writeFileSync(
    join(root, "src/captions.json"),
    JSON.stringify(captions, null, 2) + "\n",
  );
}
