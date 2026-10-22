import { useEffect, useRef, useState } from "react";
import { Sequence } from "remotion";
import { ShotScene } from "./Composition";
import { timelineFor, audioLeadFrames, fps } from "./timeline";
import captionData from "./captions.json";
import type { Caption } from "./speech-timing";
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
        const contains = (outer: DOMRect, inner: DOMRect) =>
          inner.left >= outer.left - 1 &&
          inner.right <= outer.right + 1 &&
          inner.top >= outer.top - 1 &&
          inner.bottom <= outer.bottom + 1;
        const content = page.querySelector<HTMLElement>("[data-main-content]");
        for (const group of content?.querySelectorAll<HTMLElement>(
          "[data-teaching-group]",
        ) ?? []) {
          if (
            !contains(
              content!.getBoundingClientRect(),
              group.getBoundingClientRect(),
            )
          )
            errors.push(
              `Teaching group ${group.dataset.teachingGroup}: exceeds content bounds`,
            );
        }
        const lines = Array.from(
          content?.querySelectorAll<HTMLElement>("[data-line-ink]") ?? [],
        );
        for (const line of lines)
          if (
            !contains(
              content!.getBoundingClientRect(),
              line.getBoundingClientRect(),
            )
          )
            errors.push(`Content overflow: ${line.textContent}`);
        const blocks = [
          ...page.querySelectorAll<HTMLElement>("[data-page-block]"),
        ];
        for (const block of blocks)
          if (
            !contains(
              page.getBoundingClientRect(),
              block.getBoundingClientRect(),
            )
          )
            errors.push(`Page overflow: ${block.textContent}`);
        const subtitle = page.querySelector<HTMLElement>("[data-subtitle]")!;
        const ink = page.querySelector<HTMLElement>("[data-caption-ink]")!;
        if (
          !contains(
            subtitle.getBoundingClientRect(),
            ink.getBoundingClientRect(),
          )
        )
          errors.push("Subtitle overflow");
        const labels = [
          ...page.querySelectorAll<HTMLElement>("[data-diagram-label]"),
        ];
        const boxes = labels.map((label) => label.getBoundingClientRect());
        boxes.forEach((box, i) => {
          if (!contains(labels[i].closest("svg")!.getBoundingClientRect(), box))
            errors.push(`Diagram label overflow: ${labels[i].textContent}`);
          boxes.slice(i + 1).forEach((other, j) => {
            if (
              Math.min(box.right, other.right) >
                Math.max(box.left, other.left) &&
              Math.min(box.bottom, other.bottom) > Math.max(box.top, other.top)
            )
              errors.push(
                `Diagram labels overlap: ${labels[i].textContent} / ${labels[i + j + 1].textContent}; bounds=${JSON.stringify([box.toJSON(), other.toJSON()])}`,
              );
          });
        });
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
