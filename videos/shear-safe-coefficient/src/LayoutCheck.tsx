import { useEffect, useRef, useState } from "react";
import { Sequence } from "remotion";
import { ShotScene } from "./Composition";
import { timelineFor, visualAt, fps, audioLeadFrames } from "./timeline";
import { auditPage } from "./page-audit";
import captions from "./captions.json";
import type { Caption } from "../../shared/speech/timing";
const cues = captions as Record<string, Caption[]>;
const query = new URLSearchParams(
  typeof window === "undefined" ? "" : window.location.search,
);
const auditShot = query.get("auditShot");
const allRows = timelineFor();
const rows = allRows.filter((row) => row.id === (auditShot ?? allRows[0].id));
if (!rows.length) throw Error("LayoutCheck requires a valid auditShot");
const cases = rows.flatMap((row) => {
  const reveal = audioLeadFrames + Math.ceil((row.revealMs * fps) / 1000);
  const endSpeech = audioLeadFrames + row.speechFrames;
  const frames = new Set([
    0,
    Math.max(0, reveal - 1),
    reveal,
    endSpeech,
    row.durationInFrames - 1,
  ]);
  for (const stage of row.stages) {
    const frame = audioLeadFrames + Math.ceil((stage.ms * fps) / 1000);
    frames.add(Math.max(0, frame - 1));
    frames.add(frame);
  }
  if (row.pauseAfter) {
    // Inspect every frame's production props, mounting again only when they
    // change. Identical props produce the same static TeachingPage DOM.
    let previous = "";
    for (let frame = endSpeech; frame < row.durationInFrames; frame++) {
      const state = JSON.stringify(visualAt(row, frame));
      if (state !== previous) frames.add(frame);
      previous = state;
    }
  }
  for (const cue of cues[row.id]) {
    const frame = audioLeadFrames + Math.ceil((cue.startMs * fps) / 1000);
    frames.add(Math.max(0, frame - 1));
    frames.add(frame);
  }
  return [...frames].sort((a, b) => a - b).map((frame) => ({ row, frame }));
});

export function LayoutCheck() {
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const results = useRef<{ page: string; errors: string[] }[]>([]);
  const [report, setReport] = useState<unknown>(null);
  const { row, frame } = cases[index];
  useEffect(() => {
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (disposed || !root.current) return;
      const state = visualAt(row, frame);
      const errors = auditPage(
        root.current.querySelector<HTMLElement>("[data-layout-page]")!,
        row.page,
        state.visibleStep,
        state.thinking,
      );
      results.current.push({ page: `${row.id}-${frame}`, errors });
      if (index + 1 < cases.length) setIndex(index + 1);
      else
        setReport({
          ok: results.current.every((result) => !result.errors.length),
          results: results.current,
        });
    });
    return () => {
      disposed = true;
    };
  }, [index, row, frame]);
  return (
    <div ref={root} style={{ width: 1920, height: 1080 }}>
      <output data-layout-report hidden>
        {report === null ? "pending" : JSON.stringify(report)}
      </output>
      <div
        data-layout-page={`${row.id}-${frame}`}
        style={{ position: "relative", width: 1920, height: 1080 }}
      >
        <Sequence from={-frame} layout="none">
          <ShotScene row={row} audioEnabled={false} />
        </Sequence>
      </div>
    </div>
  );
}
