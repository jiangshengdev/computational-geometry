import { useEffect, useRef, useState } from "react";
import { Sequence } from "remotion";
import {
  checkDiagramLabels,
  checkPageBounds,
  contains,
} from "../../shared/checks/dom";
import { pages } from "./storyboard";
import { ShotScene } from "./Composition";
import { timelineFor, audioLeadFrames, fps, visualAt } from "./timeline";
import captionData from "./captions.json";
import type { Caption } from "../../shared/speech/timing";
const captions = captionData as Record<string, Caption[]>;
const auditPage =
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("auditPage");
if (auditPage && !pages[auditPage])
  throw Error(`Unknown audit page: ${auditPage}`);
const cases = timelineFor()
  .filter((row) => !auditPage || row.page === auditPage)
  .flatMap((row) => {
    const reveal = audioLeadFrames + Math.ceil((row.revealMs * fps) / 1000);
    const frames = new Set([
      0,
      Math.max(0, reveal - 1),
      reveal,
      audioLeadFrames + row.speechFrames,
      row.durationInFrames - 1,
    ]);
    for (const cue of captions[row.id]) {
      const start = audioLeadFrames + Math.ceil((cue.startMs * fps) / 1000);
      frames.add(Math.max(0, start - 1));
      frames.add(start);
    }
    return [...frames]
      .sort((a, b) => a - b)
      .map((frame) => ({ row, frame, id: `${row.id}-${frame}` }));
  });
export function LayoutCheck() {
  const root = useRef<HTMLDivElement>(null);
  const [batch, setBatch] = useState(0);
  const resultsRef = useRef<{ page: string | undefined; errors: string[] }[]>(
    [],
  );
  const [report, setReport] = useState<unknown>(null);
  useEffect(() => {
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (disposed || !root.current) return;
      const results = [
        ...root.current.querySelectorAll<HTMLElement>("[data-layout-page]"),
      ].map((page) => {
        const errors: string[] = [];
        const sample = cases.find((c) => c.id === page.dataset.layoutPage)!;
        const state = visualAt(sample.row, sample.frame);
        checkPageBounds(page, errors);
        const diagram = page.querySelector<SVGElement>(
          "[data-coordinate-diagram]",
        );
        if (
          diagram &&
          Number(diagram.dataset.unitX) !== Number(diagram.dataset.unitY)
        )
          errors.push("Unequal coordinate units");
        const panel = page.querySelector<HTMLElement>("[data-concept-panel]");
        if (
          pages[sample.row.page].panel ? !panel || diagram : !diagram || panel
        )
          errors.push("Missing or incorrect teaching context");
        if (panel) {
          for (const line of panel.querySelectorAll<HTMLElement>(
            "[data-panel-line]",
          ))
            if (
              !contains(
                panel.getBoundingClientRect(),
                line.getBoundingClientRect(),
              ) ||
              line.scrollWidth > line.clientWidth
            )
              errors.push(`Context panel overflow: ${line.textContent}`);
          const content = page.querySelector<HTMLElement>(
            "[data-main-content]",
          )!;
          if (
            panel.getBoundingClientRect().right >
              content.getBoundingClientRect().left ||
            panel.getBoundingClientRect().bottom >
              content.getBoundingClientRect().bottom
          )
            errors.push("Context panel overlaps teaching area");
        }
        const solved =
          sample.row.page === "verify" ||
          (sample.row.page === "ordinate" && state.visibleStep >= 4);
        if (Boolean(page.querySelector("[data-answer-label]")) !== solved)
          errors.push("Intersection answer revealed at wrong step");
        const rows = [
          ...page.querySelectorAll<HTMLElement>("[data-content-line]"),
        ];
        rows.forEach((line, index) => {
          if (
            (getComputedStyle(line).visibility === "visible") !==
            index < state.visibleStep
          )
            errors.push("Incorrect progressive reveal");
        });
        if (
          state.thinking &&
          (!page.querySelector("[data-caption-ink]")?.textContent ||
            getComputedStyle(
              page.querySelector<HTMLElement>("[data-teaching-note]")!,
            ).visibility !== "visible")
        )
          errors.push("Question missing during silence");
        const points = [...page.querySelectorAll<SVGCircleElement>("circle")];
        checkDiagramLabels(
          [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")],
          errors,
          (label, box) => {
            for (const point of points) {
              const dot = point.getBoundingClientRect();
              if (
                Math.min(box.right, dot.right) > Math.max(box.left, dot.left) &&
                Math.min(box.bottom, dot.bottom) > Math.max(box.top, dot.top)
              )
                errors.push(`Label covers point: ${label.textContent}`);
            }
          },
        );
        const text = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
        while (text.nextNode())
          if (
            /[A-Za-zΔ0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹≠≤≥]/.test(
              text.currentNode.textContent ?? "",
            ) &&
            !text.currentNode.parentElement?.closest(".katex")
          )
            errors.push(`Math outside LaTeX: ${text.currentNode.textContent}`);
        return { page: page.dataset.layoutPage, errors };
      });
      resultsRef.current.push(...results);
      if (batch + 1 < cases.length) setBatch(batch + 1);
      else
        setReport({
          ok: resultsRef.current.every((r) => !r.errors.length),
          results: resultsRef.current,
        });
    });
    return () => {
      disposed = true;
    };
  }, [batch]);
  // Visit every production state with bounded DOM size; retain complete pages
  // for screenshots after all states have been checked.
  const visibleCases =
    report === null
      ? cases.slice(batch, batch + 1)
      : cases.filter(
          (sample, index) => cases[index + 1]?.row.page !== sample.row.page,
        );
  return (
    <div
      ref={root}
      data-layout-progress={`${batch}/${cases.length}`}
      style={{ width: 1920, height: 1080, overflow: "auto" }}
    >
      <output data-layout-report hidden>
        {report === null ? "pending" : JSON.stringify(report)}
      </output>
      {visibleCases.map(({ row, frame, id }) => (
        <div
          key={report === null ? "audit" : id}
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
}
