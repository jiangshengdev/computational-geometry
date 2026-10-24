import { execFileSync } from "node:child_process";
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
