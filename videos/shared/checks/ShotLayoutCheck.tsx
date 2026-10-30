import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { Caption } from "../speech/timing";
import { MathTextSpacingCases, checkMathTextSpacing } from "./MathTextSpacing";
type AuditRow = {
  id: string;
  page: string;
  from: number;
  revealMs: number;
  durationInFrames: number;
  pauseAfter?: number;
  stages: { ms: number }[];
  mainShift?: { start: number; end: number } | null;
  motionTiming?: { start: number; end: number } | null;
} & (
  | { speechFrames: number; readingFrames?: never }
  | { readingFrames: number; speechFrames?: never }
);
type Visual = { visibleStep: number; thinking: boolean; caption: string };
export function createShotLayoutCheck<R extends AuditRow>({
  rows: allRows,
  visualAt,
  fps,
  audioLeadFrames,
  captions: cues,
  SceneAtFrame,
  auditPage,
  extraFrames,
}: {
  rows: R[];
  visualAt: (row: R, frame: number) => Visual;
  fps: number;
  audioLeadFrames: number;
  captions: Record<string, Caption[]>;
  SceneAtFrame: ComponentType<{ row: R; frame: number }>;
  extraFrames?: (row: R) => number[];
  auditPage: (
    page: HTMLElement,
    pageId: string,
    visibleStep: number,
    thinking: boolean,
    caption: string,
  ) => string[];
}) {
  const query = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const auditShot = query.get("auditShot");
  const rows = allRows.filter((row) => row.id === (auditShot ?? allRows[0].id));
  if (!rows.length) throw Error("LayoutCheck requires a valid auditShot");
  const cases = rows.flatMap((row) => {
    const reveal = audioLeadFrames + Math.ceil((row.revealMs * fps) / 1000);
    const endSpeech = audioLeadFrames + (row.readingFrames ?? row.speechFrames);
    const frames = new Set([
      0,
      Math.max(0, reveal - 1),
      reveal,
      endSpeech,
      row.durationInFrames - 1,
      ...(extraFrames?.(row) ?? []),
    ]);
    for (const stage of row.stages) {
      const frame = audioLeadFrames + Math.ceil((stage.ms * fps) / 1000);
      frames.add(Math.max(0, frame - 1));
      frames.add(frame);
    }
    if (row.motionTiming) {
      const { start, end } = row.motionTiming;
      for (const ms of [start, (start + end) / 2, end])
        frames.add(audioLeadFrames + Math.ceil((ms * fps) / 1000));
    }
    if (row.mainShift) {
      const { start, end } = row.mainShift;
      for (const absolute of [
        start - 1,
        start,
        Math.floor((start + end) / 2),
        end,
        end + 1,
      ]) {
        const frame = absolute - row.from;
        if (frame >= 0 && frame < row.durationInFrames) frames.add(frame);
      }
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
    const requestedFrame = query.get("auditFrame");
    if (requestedFrame !== null) {
      const frame = Number(requestedFrame);
      if (
        !Number.isInteger(frame) ||
        frame < 0 ||
        frame >= row.durationInFrames
      )
        throw Error("Invalid auditFrame");
      return [{ row, frame }];
    }
    return [...frames].sort((a, b) => a - b).map((frame) => ({ row, frame }));
  });

  return function LayoutCheck() {
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
        if (index === 0)
          results.current.push({
            page: "MathText-spacing",
            errors: checkMathTextSpacing(root.current),
          });
        const errors = auditPage(
          root.current.querySelector<HTMLElement>("[data-layout-page]")!,
          row.page,
          state.visibleStep,
          state.thinking,
          state.caption,
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
        <MathTextSpacingCases />
        <output data-layout-report hidden>
          {report === null ? "pending" : JSON.stringify(report)}
        </output>
        <div
          data-layout-page={`${row.id}-${frame}`}
          style={{ position: "relative", width: 1920, height: 1080 }}
        >
          <SceneAtFrame row={row} frame={frame} />
        </div>
      </div>
    );
  };
}
