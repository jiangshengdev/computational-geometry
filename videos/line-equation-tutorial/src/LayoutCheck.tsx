import { useEffect, useRef, useState } from "react";
import { DerivationPage } from "./Composition";
import { derivations } from "./derivations";
import { ChapterLayout } from "./ChapterLayout";
import { MathLines } from "./MathLines";
import { scenes } from "./intro-storyboard";

// This is a content-fit audit, not a screenshot/style snapshot. It uses the
// production components and all retained lines, including future reveals.
export const LayoutCheck = () => {
  const root = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<unknown>(null);
  useEffect(() => {
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (disposed || !root.current) return;
      const results = [
        ...root.current.querySelectorAll<HTMLElement>("[data-layout-page]"),
      ].map((page) => {
        const errors: string[] = [];
        const content = page.querySelector<HTMLElement>("[data-main-content]")!;
        const bounds = content.getBoundingClientRect();
        for (const column of content.querySelectorAll<HTMLElement>(
          "[data-math-column]",
        )) {
          const columnBounds = column.getBoundingClientRect();
          for (const group of column.querySelectorAll<HTMLElement>(
            "[data-teaching-group]",
          )) {
            const box = group.getBoundingClientRect();
            if (
              box.left < Math.max(bounds.left, columnBounds.left) - 1 ||
              box.right > Math.min(bounds.right, columnBounds.right) + 1 ||
              box.top < bounds.top - 1 ||
              box.bottom > bounds.bottom + 1
            ) {
              errors.push(
                `group ${group.dataset.teachingGroup}: exceeds content bounds`,
              );
            }
          }
        }
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
      {scenes.map((scene) => (
        <div
          key={scene.id}
          data-layout-page={scene.id}
          style={{ position: "relative", width: 1920, height: 1080 }}
        >
          <ChapterLayout
            chapter={0}
            context={[scene.kicker]}
            note={scene.note}
            content={<MathLines lines={[scene.title.replace(/\n/g, "")]} />}
          />
        </div>
      ))}
      {derivations.map((page) => (
        <div
          key={page.rows[0]}
          data-layout-page={page.rows[0]}
          style={{ position: "relative", width: 1920, height: 1080 }}
        >
          <DerivationPage
            page={page}
            step={page.steps[page.steps.length - 1]}
            chapter={Number(page.rows[0].split("-")[0]) - 189}
          />
        </div>
      ))}
    </div>
  );
};
