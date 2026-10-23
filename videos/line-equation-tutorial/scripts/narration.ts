import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, basename, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  buildSpeechDocument,
  synthesize,
  voice,
  type WordBoundary,
} from "./azure-speech.ts";
import { captionPhrases, createCaptions } from "./captions.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const chapters = JSON.parse(
  readFileSync(join(root, "src/narration.json"), "utf8"),
) as {
  issue: number;
  rows: { id: string; start: number; end: number; narration: string }[];
}[];
const speech: Record<string, unknown> = JSON.parse(
  readFileSync(join(root, "src/speech-text.json"), "utf8"),
);
const rows = chapters.flatMap((chapter) => chapter.rows);
if (Object.keys(speech).length !== rows.length)
  throw new Error("Speech text must match tutorial row IDs exactly");
const documents: Record<string, ReturnType<typeof buildSpeechDocument>> = {};
for (const row of rows) {
  const document = buildSpeechDocument(speech[row.id], row.id);
  if (Boolean(document.text.trim()) !== Boolean(row.narration))
    throw new Error(`Missing or invalid speech text: ${row.id}`);
  documents[row.id] = document;
  captionPhrases(row.narration, document.text);
}
if (process.argv.includes("--dry-run")) {
  process.stdout.write(
    JSON.stringify({ voice, speech, documents }, null, 2) + "\n",
  );
  process.exit(0);
}
if (process.argv.includes("--captions-only")) {
  const words: Record<string, WordBoundary[]> = JSON.parse(
    readFileSync(join(root, "src/word-timing.json"), "utf8"),
  );
  const captions = Object.fromEntries(
    rows.map((row) => [
      row.id,
      createCaptions(row.narration, documents[row.id].text, words[row.id]),
    ]),
  );
  writeFileSync(
    join(root, "src/captions.json"),
    JSON.stringify(captions, null, 2) + "\n",
  );
  process.exit(0);
}
const output = join(root, "public/narration");
const resume = process.argv
  .find((arg) => arg.startsWith("--resume="))
  ?.slice(9);
const temporary = resume ?? mkdtempSync(join(tmpdir(), "line-equation-"));
if (
  dirname(realpathSync(temporary)) !== realpathSync(tmpdir()) ||
  !basename(temporary).startsWith("line-equation-")
)
  throw Error("Resume requires a line-equation temporary directory");
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
const report: Record<
  string,
  { duration: number; silenceAfter: number; frames: number }
> = {};
const wordTimings: Record<string, Awaited<ReturnType<typeof synthesize>>> = {};
const captions: Record<string, ReturnType<typeof createCaptions>> = {};
mkdirSync(output, { recursive: true });
let published = false;
try {
  process.stdout.write(`Azure voice: ${voice}\n`);
  process.stdout.write(`Staging: ${temporary}\n`);
  for (const chapter of chapters)
    for (const row of chapter.rows) {
      if (!row.narration) {
        wordTimings[row.id] = [];
        captions[row.id] = [];
        report[row.id] = {
          duration: 0,
          silenceAfter: 4,
          frames: 120,
        };
        continue;
      }
      const destination = join(temporary, `${row.id}.mp3`);
      const metadata = join(temporary, `${row.id}.json`);
      const cached =
        existsSync(metadata) && existsSync(destination)
          ? (JSON.parse(readFileSync(metadata, "utf8")) as {
              ssml: string;
              audioSha256: string;
              words: WordBoundary[];
            })
          : null;
      const reusable =
        cached?.ssml === documents[row.id].ssml &&
        cached.audioSha256 ===
          createHash("sha256").update(readFileSync(destination)).digest("hex");
      const words = reusable
        ? cached.words
        : await synthesize(speech[row.id], destination);
      wordTimings[row.id] = words;
      captions[row.id] = createCaptions(
        row.narration,
        documents[row.id].text,
        words,
      );
      // Questions end exactly four seconds before the answer; other rows retain a short breath.
      const silenceAfter = questions.has(row.id)
        ? 4
        : row.id === "196-1"
          ? 0
          : 0.4;
      const duration = measure(destination);
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-xerror",
        "-i",
        destination,
        "-f",
        "null",
        "-",
      ]);
      if (!Number.isFinite(duration) || duration <= 0)
        throw Error(`Invalid audio duration ${row.id}`);
      if (
        words.some((word) => word.startMs + word.durationMs > duration * 1000)
      )
        throw Error(`Word timing exceeds audio duration: ${row.id}`);
      writeFileSync(
        metadata,
        JSON.stringify(
          {
            ssml: documents[row.id].ssml,
            audioSha256: createHash("sha256")
              .update(readFileSync(destination))
              .digest("hex"),
            words,
          },
          null,
          2,
        ) + "\n",
      );
      report[row.id] = {
        duration,
        silenceAfter,
        frames: Math.ceil((0.2 + duration + silenceAfter) * 30),
      };
      process.stdout.write(
        `${row.id}: ${duration.toFixed(2)}s, ${reusable ? "reused verified" : "original Azure"} audio\n`,
      );
    }
  for (const chapter of chapters)
    for (const row of chapter.rows)
      if (row.narration)
        copyFileSync(
          join(temporary, `${row.id}.mp3`),
          join(output, `${row.id}.mp3`),
        );
  writeFileSync(
    join(root, "src/audio-timing.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  writeFileSync(
    join(root, "src/word-timing.json"),
    JSON.stringify(wordTimings, null, 2) + "\n",
  );
  writeFileSync(
    join(root, "src/captions.json"),
    JSON.stringify(captions, null, 2) + "\n",
  );
  published = true;
} finally {
  if (published) rmSync(temporary, { recursive: true });
  else
    console.error(
      `Synthesis stopped; staged audio retained. Resume with --resume=${temporary}`,
    );
}
