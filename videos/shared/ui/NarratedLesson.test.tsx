import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createNarratedLesson } from "./NarratedLesson";

function playback() {
  const sequences: {
    from?: number;
    durationInFrames?: number;
    name?: string;
  }[] = [];
  const sources: { src: string }[] = [];
  const runtime = {
    Audio(props: { src: string }) {
      sources.push(props);
      return null;
    },
    Sequence({
      children,
      ...props
    }: {
      from?: number;
      durationInFrames?: number;
      name?: string;
      children?: ReactNode;
    }) {
      sequences.push(props);
      return <>{children}</>;
    },
    staticFile: (file: string) => `/assets/${file}`,
    useCurrentFrame: () => 42,
  };
  return { runtime, sequences, sources };
}

test("episodes select their rows while common playback retains full audio, offsets and names", () => {
  const { runtime, sequences, sources } = playback();
  const rows = [
    { id: "a", from: 0, durationInFrames: 120 },
    { id: "b", from: 120, durationInFrames: 180 },
  ];
  const scenes: unknown[] = [];
  const { LessonVideo, ShotScene } = createNarratedLesson({
    runtime,
    timelineFor: (issue) => {
      assert.equal(issue, "selected");
      return rows;
    },
    visualAt: (row, frame) => ({ id: row.id, frame }),
    renderPage: (row, state) => {
      scenes.push([row.id, state]);
      return null;
    },
    audio: {
      a: { duration: 1, audioFile: "a.wav" },
      b: { duration: 2 },
    },
    audioLeadFrames: 12,
    sequenceName: (row) => `lesson ${row.id}`,
  });
  renderToStaticMarkup(<LessonVideo issue="selected" />);
  assert.deepEqual(sequences, [
    { from: 0, durationInFrames: 120, name: "lesson a" },
    { from: 12 },
    { from: 120, durationInFrames: 180, name: "lesson b" },
    { from: 12 },
  ]);
  assert.deepEqual(sources, [
    { src: "/assets/narration/a.wav" },
    { src: "/assets/narration/b.mp3" },
  ]);
  assert.deepEqual(scenes, [
    ["a", { id: "a", frame: 42 }],
    ["b", { id: "b", frame: 42 }],
  ]);
  sources.length = sequences.length = scenes.length = 0;
  renderToStaticMarkup(<ShotScene row={rows[0]} audioEnabled={false} />);
  assert.equal(scenes.length, 1);
  assert.deepEqual(sources, []);
  assert.deepEqual(sequences, []);
});

test("an episode with direct narration retains its audio without an extra sequence", () => {
  const { runtime, sequences, sources } = playback();
  const { LessonVideo } = createNarratedLesson({
    runtime,
    timelineFor: () => [{ id: "direct", from: 5, durationInFrames: 60 }],
    visualAt: () => null,
    renderPage: () => null,
    audio: { direct: { duration: 1, audioFile: "direct.wav" } },
  });
  renderToStaticMarkup(<LessonVideo />);
  assert.deepEqual(sequences, [
    { from: 5, durationInFrames: 60, name: "direct" },
  ]);
  assert.deepEqual(sources, [{ src: "/assets/narration/direct.wav" }]);
});
