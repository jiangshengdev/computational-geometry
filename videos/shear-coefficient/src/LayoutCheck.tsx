import { checkDiagramLabels, checkPageBounds } from "../../shared/checks/dom";
import { useEffect, useRef, useState } from "react";
import { Sequence } from "remotion";
import { ShotScene } from "./Composition";
import { timelineFor, audioLeadFrames, fps, visualAt } from "./timeline";
import captionData from "./captions.json";
import type { Caption } from "../../shared/speech/timing";
import { pages } from "./storyboard";
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
  if (row.motionTiming?.midpoint !== undefined) {
    const midpoint =
      Math.round((row.motionTiming.midpoint * fps) / 1000) + audioLeadFrames;
    frames.add(midpoint - 1);
    frames.add(midpoint);
    frames.add(midpoint + 1);
  }
  for (const interval of [row.motionTiming]) {
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
          pages[sample.row.page].noteFromStep !== undefined &&
          visualAt(sample.row, sample.frame).visibleStep <
            pages[sample.row.page].noteFromStep! &&
          getComputedStyle(note).visibility !== "hidden"
        )
          errors.push("Calculation conclusion revealed early");
        if (
          !page
            .querySelector("[data-scale-note]")
            ?.textContent?.includes("不等比例示意")
        )
          errors.push("Missing unequal-scale notice");
        const a = page.querySelector('[data-point="A"]')!;
        const b = page.querySelector('[data-point="B"]')!;
        if (
          a.getAttribute("data-y") !== "200" ||
          b.getAttribute("data-y") !== "0" ||
          b.getAttribute("data-x") !== "1"
        )
          errors.push("Point height or stationary B changed");
        if (
          sample.row.page.startsWith("question") &&
          a.getAttribute("data-x") !== "0"
        )
          errors.push("Answer position leaked during prediction");
        const expectedFinalX: Record<string, number> = {
          "210-25": 2,
          "211-08": 1,
          "213-05": 0.8,
          "213-10": 1,
          "213-15": 1.2,
        };
        if (
          sample.frame === sample.row.durationInFrames - 1 &&
          expectedFinalX[sample.row.id] !== undefined &&
          Number(a.getAttribute("data-x")) !== expectedFinalX[sample.row.id]
        )
          errors.push(
            "Rendered point does not match the calculated coordinate",
          );
        if (
          sample.row.pauseAfter &&
          sample.frame >= audioLeadFrames + sample.row.speechFrames
        ) {
          if (
            !note?.textContent ||
            getComputedStyle(note).visibility !== "visible" ||
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
