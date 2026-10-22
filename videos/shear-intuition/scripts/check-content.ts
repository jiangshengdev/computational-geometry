import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { shots, pages } from "../src/storyboard.ts";
import { buildSpeechDocument, voice } from "./azure-speech.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name: string) =>
  JSON.parse(readFileSync(`${root}src/${name}.json`, "utf8"));
const speech = read("speech-text") as Record<string, unknown>;
const timing = read("audio-timing") as Record<
  string,
  { duration: number; speech: string; voice: string }
>;
const captions = read("captions") as Record<
  string,
  { text: string; startMs: number; endMs: number }[]
>;
const expectedIds = shots.map((shot) => shot.id).sort();
const equalIds = (ids: string[]) =>
  JSON.stringify(ids.sort()) === JSON.stringify(expectedIds);
for (const [name, data] of [
  ["speech", speech],
  ["timing", timing],
  ["captions", captions],
] as const) {
  if (!equalIds(Object.keys(data)))
    throw Error(`${name}: shot IDs do not match`);
}
if (
  !equalIds(
    readdirSync(`${root}public/narration`)
      .filter((name) => name.endsWith(".mp3"))
      .map((name) => name.slice(0, -4)),
  )
)
  throw Error("Audio file IDs do not match");
let frames = 0;
const pauses: { id: string; seconds: number }[] = [];
for (const shot of shots) {
  if (
    !pages[shot.page] ||
    shot.step < 1 ||
    shot.step > pages[shot.page].lines.length
  )
    throw Error(`Invalid teaching step: ${shot.id}`);
  const doc = buildSpeechDocument(speech[shot.id], shot.id);
  const audio = timing[shot.id];
  if (
    doc.text !== audio.speech ||
    audio.voice !== voice ||
    !(audio.duration > 0)
  )
    throw Error(`Stale audio: ${shot.id}`);
  const cue = captions[shot.id];
  if (
    cue.length !== 1 ||
    cue[0].text !== shot.caption ||
    cue[0].startMs !== 0 ||
    cue[0].endMs !== audio.duration * 1000
  )
    throw Error(`Stale captions: ${shot.id}`);
  if (process.argv.includes("--decode")) {
    const file = `${root}public/narration/${shot.id}.mp3`;
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-xerror",
      "-i",
      file,
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
          file,
        ],
        { encoding: "utf8" },
      ).trim(),
    );
    if (Math.abs(duration - audio.duration) > 0.001)
      throw Error(`Duration mismatch: ${shot.id}`);
  }
  frames +=
    12 +
    Math.ceil(audio.duration * 60) +
    Math.round((shot.pauseAfter ?? 0.4) * 60);
  if (shot.pauseAfter) pauses.push({ id: shot.id, seconds: shot.pauseAfter });
}
if (
  JSON.stringify(pauses) !==
  JSON.stringify([
    { id: "204-12", seconds: 4 },
    { id: "207-01", seconds: 4 },
  ])
)
  throw Error("Both questions must have four-second thinking windows");
console.log(
  JSON.stringify(
    {
      shots: shots.length,
      pages: Object.keys(pages).length,
      frames,
      seconds: frames / 60,
      pauses,
      audioDecoded: process.argv.includes("--decode"),
    },
    null,
    2,
  ),
);
