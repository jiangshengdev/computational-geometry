import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { shots } from "../src/storyboard.ts";
import { buildSpeechDocument, synthesize, voice } from "./azure-speech.ts";
import {
  createCaptions,
  phraseTime,
  type AudioTiming,
} from "../src/speech-timing.ts";

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
    for (const anchor of [
      ...Object.values(shot.motion ?? {}),
      ...(shot.reveal ? [shot.reveal] : []),
    ]) {
      if (
        doc.text.indexOf(anchor) < 0 ||
        doc.text.indexOf(anchor) !== doc.text.lastIndexOf(anchor)
      )
        throw Error(
          `${shot.id}: missing or ambiguous speech anchor: ${anchor}`,
        );
    }
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
    AudioTiming
  >;
  const resume = process.argv
    .find((arg) => arg.startsWith("--resume="))
    ?.slice(9);
  const temporary = resume ?? mkdtempSync(join(tmpdir(), "shear-speech-"));
  if (
    dirname(realpathSync(temporary)) !== realpathSync(tmpdir()) ||
    !basename(temporary).startsWith("shear-speech-")
  )
    throw Error("Resume requires a shear-speech temporary directory");
  let published = false;
  try {
    for (const shot of selected) {
      const path = join(temporary, `${shot.id}.mp3`);
      const metadata = join(temporary, `${shot.id}.json`);
      const cached =
        existsSync(metadata) && existsSync(path)
          ? (JSON.parse(readFileSync(metadata, "utf8")) as AudioTiming)
          : null;
      const words =
        cached?.fingerprint === documents[shot.id].fingerprint
          ? cached.words
          : await synthesize(speech[shot.id], path);
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
        fingerprint: documents[shot.id].fingerprint,
      };
      writeFileSync(metadata, JSON.stringify(timing[shot.id], null, 2) + "\n");
      createCaptions(shot.caption, timing[shot.id]);
      if (shot.motion) {
        const start = phraseTime(timing[shot.id], shot.motion.start, "start");
        const end = phraseTime(timing[shot.id], shot.motion.end, "end");
        if (end <= start) throw Error(`Invalid motion interval: ${shot.id}`);
      }
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
    published = true;
  } finally {
    if (published) rmSync(temporary, { recursive: true });
    else
      console.error(
        `Synthesis stopped; original assets retained. Diagnostics: ${temporary}`,
      );
  }
}
