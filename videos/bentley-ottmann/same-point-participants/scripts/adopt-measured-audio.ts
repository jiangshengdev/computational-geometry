import {
  copyFileSync,
  existsSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { audioSha256 } from "../../../shared/speech/audio.ts";
import { readTiming, verifyRecordings } from "./measured-audio.ts";

/** Validate the entire selected batch before replacing any formal asset. No synthesis. */
export async function adoptMeasuredAudio(
  root: string,
  staging: string,
  write = false,
) {
  const source = realpathSync(staging);
  const destination = realpathSync(join(root, "public/narration"));
  if (source === destination)
    throw Error("Staging must be separate from formal audio");
  const timing = readTiming(join(source, "audio-timing.json"));
  const result = verifyRecordings(source, timing, true);
  const outputs = await Promise.all(
    [
      ["audio-timing", timing],
      ["captions", result.captions],
    ].map(
      async ([name, data]) =>
        [name, await format(JSON.stringify(data), { parser: "json" })] as const,
    ),
  );
  if (write) {
    for (const recording of Object.values(timing)) {
      const target = join(destination, recording.audioFile!);
      if (!existsSync(target) || audioSha256(target) !== recording.audioSha256)
        copyFileSync(join(source, recording.audioFile!), target);
    }
    for (const [name, content] of outputs)
      writeFileSync(join(root, `src/${name}.json`), content);
  }
  return {
    clips: result.clips,
    counts: result.counts,
    adopted: write,
    currentTimingMatches:
      readFileSync(join(root, "src/audio-timing.json"), "utf8") ===
      outputs[0][1],
    actualListeningPerformed: false,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = process.argv.slice(2);
  if (
    options.some((arg) => arg !== "--write" && !arg.startsWith("--staging=")) ||
    options.filter((arg) => arg.startsWith("--staging=")).length !== 1 ||
    options.filter((arg) => arg === "--write").length > 1
  )
    throw Error(
      "Use --staging=<complete selected batch> [--write]; adoption never synthesizes audio",
    );
  const staging = options
    .find((arg) => arg.startsWith("--staging="))!
    .slice(10);
  if (!staging) throw Error("--staging=<complete selected batch> is required");
  console.log(
    JSON.stringify(
      await adoptMeasuredAudio(
        fileURLToPath(new URL("../", import.meta.url)),
        resolve(staging),
        options.includes("--write"),
      ),
    ),
  );
}
