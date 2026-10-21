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

const root = fileURLToPath(new URL("../", import.meta.url));
const chapters = JSON.parse(
  readFileSync(join(root, "src/narration.json"), "utf8"),
) as {
  issue: number;
  rows: { id: string; start: number; end: number; narration: string }[];
}[];
const output = join(root, "public/narration");
const temporary = mkdtempSync(join(tmpdir(), "line-equation-"));
const questions = new Set(["190-4", "192-4"]);
const measure = (path: string) =>
  Number(
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
// Spell mathematical notation for the existing Mandarin voice, without changing meaning.
const spoken = (text: string) =>
  text
    .replace(
      /([XY])([₁₂])/g,
      (_, letter, index) => `${letter}下标${index === "₁" ? "一" : "二"}`,
    )
    .replace(/([=（(])−/g, "$1负")
    .replace(/≠/g, "不等于")
    .replace(/=/g, "等于")
    .replace(/[−-]/g, "减")
    .replace(/\+/g, "加")
    .replace(/×/g, "乘")
    .replace(/([abcXY]),/g, "$1，");
const report: Record<
  string,
  { duration: number; tempo: number; silenceAfter: number; frames: number }
> = {};
mkdirSync(output, { recursive: true });
try {
  for (const name of [
    "01-intersection",
    "02-equations",
    "03-endpoints",
    "04-line",
  ]) {
    copyFileSync(
      join(root, "../line-equation-demo/public/narration", `${name}.mp3`),
      join(output, `${name}.mp3`),
    );
  }
  for (const chapter of chapters.slice(1))
    for (const row of chapter.rows) {
      if (!row.narration) {
        report[row.id] = {
          duration: 0,
          tempo: 1,
          silenceAfter: 4,
          frames: 120,
        };
        continue;
      }
      const source = join(temporary, `${row.id}.aiff`);
      execFileSync("say", [
        "-v",
        "Tingting (中文（中国大陆）)",
        "-r",
        "240",
        "-o",
        source,
        spoken(row.narration),
      ]);
      // Questions end exactly four seconds before the answer; other rows retain a short breath.
      const silenceAfter = questions.has(row.id)
        ? 4
        : row.id === "196-1"
          ? 0
          : 0.4;
      const window = row.end - row.start;
      const target = window - 0.2 - silenceAfter;
      const tempo = Math.max(0.65, measure(source) / target);
      if (!Number.isFinite(tempo) || tempo > 2)
        throw Error(`Unsafe speech tempo ${row.id}: ${tempo}`);
      const destination = join(output, `${row.id}.mp3`);
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
        destination,
      ]);
      const duration = measure(destination);
      if (duration > target + 0.15)
        throw Error(`Audio exceeds window ${row.id}`);
      report[row.id] = {
        duration,
        tempo,
        silenceAfter,
        frames: Math.ceil((0.2 + duration + silenceAfter) * 30),
      };
      process.stdout.write(
        `${row.id}: ${duration.toFixed(2)}s, tempo ${tempo.toFixed(2)}\n`,
      );
    }
  writeFileSync(
    join(root, "src/audio-timing.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
} finally {
  rmSync(temporary, { recursive: true });
}
