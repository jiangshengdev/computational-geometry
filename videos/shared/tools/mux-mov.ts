// User-only final mux; --dry-run probes inputs and prints arguments without writing.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, extname } from "node:path";

const [video, audio, output, option] = process.argv.slice(2);
if (
  !video ||
  !audio ||
  !output ||
  (option && option !== "--dry-run") ||
  process.argv.length > 6
)
  throw Error(
    "Usage: mux-mov.ts <silent-video> <timeline.wav> <output.mov> [--dry-run]",
  );
if (
  extname(output).toLowerCase() !== ".mov" ||
  existsSync(output) ||
  resolve(output) === resolve(video) ||
  resolve(output) === resolve(audio)
)
  throw Error("Use a new .mov output; existing files are never overwritten");
const probe = (path: string) =>
  JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", path],
      { encoding: "utf8" },
    ),
  );
const v = probe(video),
  a = probe(audio);
if (v.streams.length !== 1 || v.streams[0].codec_name !== "hevc")
  throw Error("Expected a checked, silent H.265 video");
if (
  a.streams.length !== 1 ||
  a.streams[0].codec_name !== "pcm_s16le" ||
  a.streams[0].sample_rate !== "48000" ||
  a.streams[0].channels !== 2 ||
  a.streams[0].bits_per_sample !== 16
)
  throw Error("Expected 48 kHz, 16 bit, stereo PCM timeline audio");
const durations = [Number(v.format.duration), Number(a.format.duration)];
if (
  durations.some((duration) => !Number.isFinite(duration) || duration <= 0) ||
  Math.abs(durations[0] - durations[1]) > 0.05
)
  throw Error(
    "Video/audio duration mismatch; verify they use the same timeline",
  );
const args = [
  "-n",
  "-i",
  video,
  "-i",
  audio,
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-c:v",
  "copy",
  "-c:a",
  "copy",
  "-tag:v",
  "hvc1",
  "-movflags",
  "+faststart",
  output,
];
if (option === "--dry-run")
  console.log(JSON.stringify({ command: "ffmpeg", args }, null, 2));
else execFileSync("ffmpeg", args, { stdio: "inherit" });
