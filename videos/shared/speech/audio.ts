import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const audioSha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

export function verifyPcmSource(path: string) {
  const { streams } = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_name,sample_rate,bits_per_sample,channels",
        "-of",
        "json",
        path,
      ],
      { encoding: "utf8" },
    ),
  );
  if (
    streams.length !== 1 ||
    streams[0].codec_name !== "pcm_s16le" ||
    streams[0].sample_rate !== "48000" ||
    streams[0].bits_per_sample !== 16 ||
    streams[0].channels !== 1
  )
    throw Error(`Expected 48 kHz, 16 bit, mono PCM source: ${path}`);
}
export function decodeAudio(path: string) {
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
}
export function measureAudio(path: string) {
  return Number(
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
}
