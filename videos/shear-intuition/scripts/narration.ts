import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { shots } from "../src/storyboard.ts";
import { buildSpeechDocument, synthesize, voice } from "./azure-speech.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const speech = JSON.parse(
  readFileSync(join(root, "src/speech-text.json"), "utf8"),
) as Record<string, unknown>;
const ids = new Set(shots.map((shot) => shot.id));
if (
  ids.size !== shots.length ||
  Object.keys(speech).length !== ids.size ||
  Object.keys(speech).some((id) => !ids.has(id))
)
  throw Error("Speech IDs must match unique storyboard IDs exactly");
const documents = Object.fromEntries(
  shots.map((shot) => {
    const doc = buildSpeechDocument(speech[shot.id], shot.id);
    if (!doc.text.trim()) throw Error(`Empty speech: ${shot.id}`);
    return [shot.id, doc];
  }),
);
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify({ voice, documents }, null, 2));
} else {
  const requested = process.argv
    .find((arg) => arg.startsWith("--issue="))
    ?.split("=")[1];
  const selected = requested
    ? shots.filter((shot) => shot.id.startsWith(`${requested}-`))
    : shots;
  if (!selected.length) throw Error("No matching shots");
  const timingPath = join(root, "src/audio-timing.json");
  const timing = JSON.parse(readFileSync(timingPath, "utf8")) as Record<
    string,
    unknown
  >;
  const temporary = mkdtempSync(join(tmpdir(), "shear-speech-"));
  try {
    for (const shot of selected) {
      const path = join(temporary, `${shot.id}.mp3`);
      const words = await synthesize(speech[shot.id], path);
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-xerror",
        "-i",
        path,
        "-f",
        "null",
        "-",
      ]);
      const duration = Number(
        execFileSync(
          "ffprobe",
          [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            path,
          ],
          { encoding: "utf8" },
        ).trim(),
      );
      if (!Number.isFinite(duration) || duration <= 0)
        throw Error(`Invalid audio: ${shot.id}`);
      timing[shot.id] = {
        duration,
        words,
        speech: documents[shot.id].text,
        voice,
      };
      console.log(`${shot.id}: ${duration.toFixed(3)}s; original Azure audio`);
    }
    // Publish only after every requested shot passes decoding and duration checks.
    mkdirSync(join(root, "public/narration"), { recursive: true });
    for (const shot of selected)
      copyFileSync(
        join(temporary, `${shot.id}.mp3`),
        join(root, "public/narration", `${shot.id}.mp3`),
      );
    writeFileSync(timingPath, JSON.stringify(timing, null, 2) + "\n");
    execFileSync(process.execPath, [join(root, "scripts/captions.ts")], {
      stdio: "inherit",
    });
  } finally {
    rmSync(temporary, { recursive: true });
  }
}
