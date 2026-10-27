import {
  checkDiagramLabels,
  checkPageBounds,
} from "../../../shared/checks/dom";
import { useEffect, useRef, useState } from "react";
import { Sequence } from "remotion";
import { ShotScene } from "./Composition";
import { timelineFor, audioLeadFrames, fps, visualAt } from "./timeline";
import captionData from "./captions.json";
import type { Caption } from "../../../shared/speech/timing";
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
    for (
      let frame = Math.ceil((interval.start * fps) / 1000) + audioLeadFrames;
      frame <= Math.ceil((interval.end * fps) / 1000) + audioLeadFrames;
      frame += 12
    )
      frames.add(frame);
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
        );
        const points = [
          ...page.querySelectorAll<SVGCircleElement>("[data-point]"),
        ];
        const kind = pages[sample.row.page].diagram;
        if (!diagram && !page.querySelector("[data-number-line]"))
          errors.push("Teaching diagram missing");
        if (diagram) {
          const unit = Number(diagram.dataset.unitX);
          if (unit !== Number(diagram.dataset.unitY))
            errors.push("Unequal coordinate units");
          const integerView = kind === "integer" || kind === "range";
          if (sample.row.page !== "camera" && !integerView && unit !== 250)
            errors.push("Camera changed during geometric scaling");
          if (
            integerView &&
            (unit !== 62.5 || Number(diagram.dataset.factor) !== 6)
          )
            errors.push(
              "Integer endpoint view changed coordinates or projection",
            );
          if (sample.row.page === "camera") {
            const progress = sample.row.motion
              ? visualAt(sample.row, sample.frame).progress
              : 1;
            if (unit !== 250 / (1 + 3 * progress))
              errors.push("Camera did not expand the visible range fourfold");
          }
          const factor = Number(diagram.dataset.factor);
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
            if (
              Math.abs(cx - (415 + unit * expected[i][0])) > 0.001 ||
              Math.abs(cy - (380 - unit * expected[i][1])) > 0.001
            )
              errors.push("Point projection differs from coordinate units");
            const outside =
              Math.abs(cx - 415) > 285 || Math.abs(cy - 380) > 285;
            const arrow = page.querySelector(
              `[data-offscreen="${point.dataset.point}"]`,
            );
            if (
              outside !== (point.dataset.outside === "true") ||
              outside !== Boolean(arrow)
            )
              errors.push("Offscreen point must have a direction indicator");
            if (
              outside &&
              (!point.closest("[data-clipped-geometry]") ||
                getComputedStyle(point).visibility !== "hidden")
            )
              errors.push("Offscreen point leaks out of the viewport");
            if (!outside && getComputedStyle(point).visibility !== "visible")
              errors.push("Visible endpoint is hidden");
            if (
              ((sample.row.page !== "scaling" &&
                sample.row.page !== "camera") ||
                (sample.row.page === "camera" && !sample.row.motion)) &&
              outside
            )
              errors.push("Endpoint missing from initial or final view");
          });
          const originals = [
            ...page.querySelectorAll<SVGCircleElement>("[data-original-point]"),
          ];
          if (originals.length !== (factor > 1 ? 2 : 0))
            errors.push("Original comparison endpoints missing");
          originals.forEach((point, i) => {
            const coordinates = [
              [1 / 2, -2 / 3],
              [-1 / 3, 1 / 6],
            ][i];
            if (
              Math.abs(point.cx.baseVal.value - (415 + unit * coordinates[0])) >
                0.001 ||
              Math.abs(point.cy.baseVal.value - (380 - unit * coordinates[1])) >
                0.001
            )
              errors.push("Original point moved during geometric scaling");
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
            sample.row.page === "questionM" &&
            page.textContent?.includes("M=4")
          )
            errors.push("Range answer leaked during exercise");
          if (
            kind === "range" &&
            visualAt(sample.row, sample.frame).visibleStep >= 3
          ) {
            const box = page.querySelector<SVGRectElement>("[data-range-box]");
            if (
              !box ||
              box.width.baseVal.value !== 8 * unit ||
              box.height.baseVal.value !== 8 * unit
            )
              errors.push(
                "Coordinate range box does not span minus four to four",
              );
          }
        }
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
        checkPageBounds(page, errors, () => {
          const textNodes = document.createTreeWalker(
            page,
            NodeFilter.SHOW_TEXT,
          );
          while (textNodes.nextNode()) {
            const node = textNodes.currentNode;
            if (
              /[₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹≤≥|]/.test(node.textContent ?? "") &&
              !node.parentElement?.closest(".katex")
            )
              errors.push(`Math notation outside LaTeX: ${node.textContent}`);
          }
        });
        const labels = [
          ...page.querySelectorAll<HTMLElement>(
            "[data-diagram-label], [data-scale-note]",
          ),
        ];
        checkDiagramLabels(labels, errors, (label, box) => {
          for (const point of points) {
            if (point.dataset.outside === "true") continue;
            const dot = point.getBoundingClientRect();
            if (
              Math.min(box.right, dot.right) > Math.max(box.left, dot.left) &&
              Math.min(box.bottom, dot.bottom) > Math.max(box.top, dot.top)
            )
              errors.push(
                `Label covers point ${point.dataset.point}: ${label.textContent}`,
              );
          }
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
