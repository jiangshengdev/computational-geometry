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
import { alignAudio, verifyAlignment } from "./azure-alignment.ts";
import {
  createCaptions,
  validateCaptionClauses,
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
    validateCaptionClauses(shot.caption, doc.text);
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
  const requestedShots = process.argv
    .find((arg) => arg.startsWith("--shots="))
    ?.slice("--shots=".length)
    .split(",");
  if (requestedShots && process.argv.some((arg) => arg.startsWith("--issue=")))
    throw Error("Use either --issue or --shots, not both");
  if (
    requestedShots &&
    (new Set(requestedShots).size !== requestedShots.length ||
      requestedShots.some((id) => !ids.has(id)))
  )
    throw Error("--shots requires unique, known shot IDs");
  const selected = requestedShots
    ? shots.filter((shot) => requestedShots.includes(shot.id))
    : requested
      ? shots.filter((shot) => shot.id.startsWith(`${requested}-`))
      : shots;
  if (!selected.length) throw Error("No matching shots");
  const timingPath = join(root, "src/audio-timing.json");
  const timing = JSON.parse(
    existsSync(timingPath) ? readFileSync(timingPath, "utf8") : "{}",
  ) as Record<string, AudioTiming>;
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
        ...(cached?.fingerprint === documents[shot.id].fingerprint &&
        cached.alignment
          ? { alignment: cached.alignment }
          : {}),
      };
      writeFileSync(metadata, JSON.stringify(timing[shot.id], null, 2) + "\n");
      verifyAlignment(timing[shot.id], path);
      if (
        words.some(
          (word) => word.durationMs === 0 && /[\p{L}\p{N}]/u.test(word.text),
        )
      ) {
        console.log(
          `${shot.id}: aligning existing audio; zero-duration spoken words`,
        );
        timing[shot.id] = await alignAudio(timing[shot.id], path);
        writeFileSync(
          metadata,
          JSON.stringify(timing[shot.id], null, 2) + "\n",
        );
      }
      createCaptions(shot.caption, timing[shot.id]);
      if (shot.reveal) phraseTime(timing[shot.id], shot.reveal, "start");
      if (shot.motion) {
        const start = phraseTime(timing[shot.id], shot.motion.start, "start");
        const end = phraseTime(timing[shot.id], shot.motion.end, "end");
        if (end <= start) throw Error(`Invalid motion interval: ${shot.id}`);
      }
      console.log(`${shot.id}: ${duration.toFixed(3)}s; original Azure audio`);
    }
    // Publish only after every requested shot passes decoding and duration checks.
    // captions.ts rebuilds all cues, so validate untouched shots before any copy.
    for (const shot of shots) createCaptions(shot.caption, timing[shot.id]);
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
