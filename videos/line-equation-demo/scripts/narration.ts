import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scenes } from "../src/storyboard.ts";
import { synthesize } from "./azure-speech.ts";

// Uses Azure Speech and existing FFmpeg; never downloads executables.
const output = fileURLToPath(new URL("../public/narration/", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "line-equation-narration-"));
mkdirSync(output, { recursive: true });
try {
  for (const scene of scenes) {
    const source = join(temporary, `${scene.id}.mp3`);
    await synthesize(scene.narration, source);
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
          source,
        ],
        { encoding: "utf8" },
      ).trim(),
    );
    const targetDuration = scene.end - scene.start - 0.6;
    const tempo = duration / targetDuration;
    if (!Number.isFinite(tempo) || tempo < 0.5 || tempo > 2)
      throw new Error(`Voice timing out of range: ${scene.id}, ${tempo}`);
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      source,
      "-af",
      `atempo=${tempo}`,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      join(output, `${scene.id}.mp3`),
    ]);
    process.stdout.write(
      `${scene.id}: ${duration.toFixed(2)}s -> ${targetDuration.toFixed(2)}s\n`,
    );
  }
} finally {
  rmSync(temporary, { recursive: true });
}
