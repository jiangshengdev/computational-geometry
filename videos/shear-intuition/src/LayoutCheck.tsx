import { checkDiagramLabels, checkPageBounds } from "../../shared/checks/dom";
import { useEffect, useRef, useState } from "react";
import { Sequence } from "remotion";
import { ShotScene } from "./Composition";
import { timelineFor, audioLeadFrames, fps } from "./timeline";
import captionData from "./captions.json";
import type { Caption } from "../../shared/speech/timing";
const captions = captionData as Record<string, Caption[]>;
const cases = timelineFor().flatMap((row) => {
  const end = row.durationInFrames - 1;
  const frames = new Set([0, end, audioLeadFrames + row.speechFrames]);
  const reveal = Math.ceil((row.revealMs * fps) / 1000) + audioLeadFrames;
  frames.add(Math.max(0, reveal - 1));
  frames.add(reveal);
  for (const cue of captions[row.id])
    frames.add(Math.ceil((cue.startMs * fps) / 1000) + audioLeadFrames);
  if (row.motionTiming)
    frames.add(
      Math.round(
        (((row.motionTiming.start + row.motionTiming.end) / 2) * fps) / 1000,
      ) + audioLeadFrames,
    );
  for (const interval of [
    row.motionTiming,
    ...(row.comparisonTiming ?? []),
    ...(row.walkTiming ?? []),
  ]) {
    if (!interval) continue;
    frames.add(Math.ceil((interval.start * fps) / 1000) + audioLeadFrames);
    frames.add(Math.ceil((interval.end * fps) / 1000) + audioLeadFrames);
  }
  return [...frames]
    .sort((a, b) => a - b)
    .map((frame) => ({ row, frame, id: row.id + "-" + frame }));
});

export const LayoutCheck = () => {
  const root = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<unknown>(null);
  useEffect(() => {
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (disposed || !root.current) return;
      const results = Array.from(
        root.current.querySelectorAll<HTMLElement>("[data-layout-page]"),
      ).map((page) => {
        const errors: string[] = [];
        const sample = cases.find((c) => c.id === page.dataset.layoutPage)!;
        const note = page.querySelector<HTMLElement>("[data-teaching-note]")!;
        if (
          sample.row.page === "vertical" &&
          sample.row.step < 6 &&
          getComputedStyle(note).visibility !== "hidden"
        )
          errors.push("Coordinate answer revealed before derivation");
        if (
          sample.row.pauseAfter &&
          sample.frame >= audioLeadFrames + sample.row.speechFrames
        ) {
          if (
            page.querySelector('[data-thinking="true"]') === null ||
            !page.querySelector("[data-caption-ink]")?.textContent
          )
            errors.push("Thinking prompt or question caption missing");
        }
        checkPageBounds(page, errors);
        const labels = [
          ...page.querySelectorAll<HTMLElement>("[data-diagram-label]"),
        ];
        checkDiagramLabels(labels, errors);
        return { page: page.dataset.layoutPage, errors };
      });
      setReport({
        ok: results.every((result) => !result.errors.length),
        results,
      });
    });
    return () => {
      disposed = true;
    };
  }, []);
  return (
    <div ref={root} style={{ width: 1920, height: 1080, overflow: "auto" }}>
      <output data-layout-report hidden>
        {report === null ? "pending" : JSON.stringify(report)}
      </output>
      {cases.map(({ row, frame, id }) => (
        <div
          key={id}
          data-layout-page={id}
          style={{ position: "relative", width: 1920, height: 1080 }}
        >
          <Sequence from={-frame} layout="none">
            <ShotScene row={row} audioEnabled={false} />
          </Sequence>
        </div>
      ))}
    </div>
  );
};
