import type { AudioTiming } from "../../../shared/speech/timing.ts";
import { writeFileSync } from "node:fs";
import { format } from "prettier";
import audio from "../src/audio-timing.json" with { type: "json" };
import { measuredCaptions } from "./caption-plans.ts";
writeFileSync(
  new URL("../src/captions.json", import.meta.url),
  await format(
    JSON.stringify(measuredCaptions(audio as Record<string, AudioTiming>)),
    { parser: "json" },
  ),
);
