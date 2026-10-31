import assert from "node:assert/strict";
import katex from "katex";
import {
  storyboard,
  references,
  type ReferenceId,
  type Reference,
} from "../src/storyboard.ts";
import { pages } from "../src/lesson.ts";
import { timelineFor, visualAt, fps, audio } from "../src/timeline.ts";
import originalCaptions from "../src/captions.json" with { type: "json" };
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  audioSha256,
  verifyPcmSource,
  decodeAudio,
} from "../../../shared/speech/audio.ts";
import {
  narrationFile,
  synthesisFormat,
} from "../../../shared/speech/source.ts";
import { buildSpeechDocument, verifyAlignment } from "./azure-speech.ts";
const speech = JSON.parse(
  readFileSync(new URL("../src/speech-text.json", import.meta.url), "utf8"),
);
const introduced = new Set<ReferenceId>(["example"]);
const ids = new Set<string>();
for (const page of storyboard) {
  assert(!ids.has(page.id), `Duplicate page ${page.id}`);
  ids.add(page.id);
  for (const id of page.basis)
    assert(introduced.has(id), `${page.id}: reference ${id} not introduced`);
  const local = new Set(page.basis);
  for (const step of page.steps) {
    for (const id of step.use ?? [])
      assert(local.has(id), `${page.id}: source ${id} not on current page`);
    if (step.publish) {
      introduced.add(step.publish);
      local.add(step.publish);
    }
    assert(step.caption, `${page.id}: missing teaching explanation`);
    if (step.math) katex.renderToString(step.math, { throwOnError: true });
    for (const term of step.focus ?? [])
      assert(step.math?.includes(term), `${page.id}: target emphasis absent`);
  }
  for (const line of pages[page.id].lines)
    if (line.math) katex.renderToString(line.math, { throwOnError: true });
}
for (const source of Object.values(references) as Reference[])
  if (source.math) katex.renderToString(source.math, { throwOnError: true });
const rows = timelineFor();
for (const [index, row] of rows.entries()) {
  const recording = audio[row.id];
  const path = fileURLToPath(
    new URL(
      `../public/narration/${narrationFile(row.id, recording)}`,
      import.meta.url,
    ),
  );
  const document = buildSpeechDocument(speech[row.id], row.id);
  assert.equal(recording.speech, document.text, `${row.id}: stale text`);
  assert.equal(
    recording.fingerprint,
    document.fingerprint,
    `${row.id}: stale SSML`,
  );
  assert.equal(
    recording.audioSha256,
    audioSha256(path),
    `${row.id}: changed WAV`,
  );
  assert.equal(recording.outputFormat, synthesisFormat);
  verifyAlignment(recording, path);
  if (process.argv.includes("--decode")) {
    verifyPcmSource(path);
    decodeAudio(path);
  }
  assert.equal(
    row.captions.map((cue) => cue.text).join(""),
    row.caption,
    `${row.id}: incomplete subtitle`,
  );
  assert.equal(row.stages[0].frame, 0);
  assert.equal(row.speechFrames, Math.ceil(recording.duration * fps));
  assert.deepEqual(
    row.captions,
    originalCaptions[row.id as keyof typeof originalCaptions],
    "Subtitles must retain original audio times",
  );
  assert.equal(
    row.from,
    index ? rows[index - 1].from + rows[index - 1].durationInFrames : 0,
    "Timeline gap/overlap",
  );
  for (const stage of row.stages) {
    const previous = row.stages[stage.step - 2];
    if (previous) {
      assert(
        previous.speechEndMs <= stage.ms && previous.frame < stage.frame,
        "Next teaching step precedes the end of the previous explanation",
      );
    }
    const nextFrame = row.stages[stage.step]?.frame ?? row.speechFrames;
    assert(
      stage.frame < Math.floor((stage.speechStartMs * fps) / 1000),
      "Teaching row must precede speech",
    );
    assert(
      stage.speechEndMs > stage.speechStartMs &&
        stage.speechEndMs <= (nextFrame * 1000) / fps,
      "Speech outside step",
    );
    assert.equal(
      visualAt(row, Math.ceil((stage.speechEndMs * fps) / 1000)).cueActive,
      false,
      "Cue outlives its speech",
    );
    assert.equal(visualAt(row, stage.frame).visibleStep, stage.step);
    if (stage.frame > 0)
      assert.equal(visualAt(row, stage.frame - 1).visibleStep, stage.step - 1);
    for (const frame of [
      stage.frame,
      Math.ceil((stage.speechEndMs * fps) / 1000),
      nextFrame - 1,
    ])
      assert.equal(
        visualAt(row, frame).visibleStep,
        stage.step,
        "Cue reset hides teaching content",
      );
  }
  const page = pages[row.page];
  // A phrase cue introduces an object once, then retains it after emphasis.
  // Exercise the measured start/end boundaries, not a second timing table.
  for (const cue of row.diagramCues) {
    const startFrame = Math.ceil((cue.start * fps) / 1000);
    const endFrame = Math.ceil((cue.end * fps) / 1000);
    assert(cue.end > cue.start, `${row.id}: empty diagram cue ${cue.id}`);
    assert(
      !visualAt(row, startFrame - 1).diagramState.shown.includes(cue.id),
      `${row.id}: premature diagram object ${cue.id}`,
    );
    assert(
      visualAt(row, startFrame).diagramState.shown.includes(cue.id),
      `${row.id}: missing diagram object ${cue.id}`,
    );
    assert(
      visualAt(row, endFrame).diagramState.shown.includes(cue.id),
      `${row.id}: diagram object disappears after emphasis ${cue.id}`,
    );
    assert.notEqual(visualAt(row, endFrame).diagramState.active, cue.id);
    assert(
      visualAt(row, row.durationInFrames - 1).diagramState.shown.includes(
        cue.id,
      ),
      `${row.id}: page hold loses diagram object ${cue.id}`,
    );
  }
  assert.equal(
    row.durationInFrames - row.speechFrames,
    Math.max(page.reading === "dense" ? 2 : 1, page.thinkingSeconds ?? 0) * fps,
    "Page hold must follow reading category and preserve thinking time without stacking",
  );
  assert.deepEqual(
    visualAt(row, row.speechFrames),
    visualAt(row, row.durationInFrames - 1),
    "Page hold changes completed content",
  );
}
console.log(
  `PASS: ${storyboard.length} pages, ${storyboard.reduce((n, p) => n + p.steps.length, 0)} steps; measured timeline ${rows.reduce((n, r) => n + r.durationInFrames, 0) / fps}s; listening and rendered-film acceptance remain separate.`,
);
