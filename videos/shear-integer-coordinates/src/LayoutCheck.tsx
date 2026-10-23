import { useEffect, useRef, useState } from "react";
import { Sequence } from "remotion";
import { ShotScene } from "./Composition";
import { timelineFor, audioLeadFrames, fps, visualAt } from "./timeline";
import captionData from "./captions.json";
import type { Caption } from "./speech-timing";
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
        const diagram = page.querySelector<SVGElement>(
          "[data-coordinate-diagram]",
        )!;
        const unit = Number(diagram.dataset.unitX);
        if (unit !== Number(diagram.dataset.unitY))
          errors.push("Unequal coordinate units");
        if (sample.row.page !== "camera" && unit !== 65)
          errors.push("Camera changed during geometric scaling");
        const factor = Number(diagram.dataset.factor);
        const points = [
          ...page.querySelectorAll<SVGCircleElement>("[data-point]"),
        ];
        const expected = [
          [factor / 2, (-2 * factor) / 3],
          [-factor / 3, factor / 6],
        ];
        points.forEach((point, i) => {
          if (
            Number(point.dataset.x) !== expected[i][0] ||
            Number(point.dataset.y) !== expected[i][1]
          )
            errors.push("Point does not follow uniform scaling");
          const cx = point.cx.baseVal.value,
            cy = point.cy.baseVal.value;
          if (cx < 55 || cx > 770 || cy < 70 || cy > 590)
            errors.push("Point clipped");
        });
        if (sample.row.page === "camera" && factor !== 6)
          errors.push("Camera changed mathematical coordinates");
        if (sample.row.id === "216-25" && factor !== 6)
          errors.push("Scaling did not reach the sixfold endpoint");
        if (
          sample.row.page === "questionQ" &&
          (factor !== 1 || page.textContent?.includes("Q′=(-2,1)"))
        )
          errors.push("Answer leaked during exercise");
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
          for (const point of points) {
            const dot = point.getBoundingClientRect();
            if (
              Math.min(box.right, dot.right) > Math.max(box.left, dot.left) &&
              Math.min(box.bottom, dot.bottom) > Math.max(box.top, dot.top)
            )
              errors.push(
                `Label covers point ${point.dataset.point}: ${labels[i].textContent}`,
              );
          }
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
