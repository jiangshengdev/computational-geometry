import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { readTiming, verifyRecordings } from "./measured-audio.ts";

// Rebuild from formal sources only: never depend on staging or call Azure.
const timing = readTiming(
  fileURLToPath(new URL("../src/audio-timing.json", import.meta.url)),
);
const result = verifyRecordings(
  fileURLToPath(new URL("../public/narration/", import.meta.url)),
  timing,
);
writeFileSync(
  new URL("../src/captions.json", import.meta.url),
  await format(JSON.stringify(result.captions), { parser: "json" }),
);
console.log(
  `Generated measured captions for ${result.clips} formal recordings`,
);
