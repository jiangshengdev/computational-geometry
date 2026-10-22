import { useEffect, useRef, useState } from "react";
import { TeachingPage } from "./TeachingPage";
import { shots } from "./storyboard";

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
        const contains = (outer: DOMRect, inner: DOMRect) =>
          inner.left >= outer.left - 1 &&
          inner.right <= outer.right + 1 &&
          inner.top >= outer.top - 1 &&
          inner.bottom <= outer.bottom + 1;
        const content = page.querySelector<HTMLElement>("[data-main-content]")!;
        const lines = Array.from(
          content.querySelectorAll<HTMLElement>("[data-line-ink]"),
        );
        for (const line of lines)
          if (
            !contains(
              content.getBoundingClientRect(),
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
        const labels = [
          ...page.querySelectorAll<SVGGraphicsElement>("[data-diagram-label]"),
        ];
        const boxes = labels.map((label) => label.getBoundingClientRect());
        boxes.forEach((box, i) => {
          if (
            !contains(page.querySelector("svg")!.getBoundingClientRect(), box)
          )
            errors.push(`Diagram label overflow: ${labels[i].textContent}`);
          boxes.slice(i + 1).forEach((other, j) => {
            if (
              Math.min(box.right, other.right) >
                Math.max(box.left, other.left) &&
              Math.min(box.bottom, other.bottom) > Math.max(box.top, other.top)
            )
              errors.push(
                `Diagram labels overlap: ${labels[i].textContent} / ${labels[i + j + 1].textContent}`,
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
      {shots.flatMap((shot) =>
        [0, 0.5, 1].map((progress) => (
          <div
            key={`${shot.id}-${progress}`}
            data-layout-page={`${shot.id}-${progress}`}
            style={{ position: "relative", width: 1920, height: 1080 }}
          >
            <TeachingPage shot={shot} progress={progress} />
          </div>
        )),
      )}
    </div>
  );
};
