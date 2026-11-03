import { createShotLayoutCheck } from "../../../shared/checks/ShotLayoutCheck";
import {
  checkPageBounds,
  checkDiagramLabels,
} from "../../../shared/checks/dom";
import {
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  type TimelineRow,
} from "./timeline";
import { TeachingPage } from "./TeachingPage";
import { objectMarks, activeTeachingMarks } from "./teaching-colors";
import { pageReferences } from "./references";

function SceneAtFrame({ row, frame }: { row: TimelineRow; frame: number }) {
  return <TeachingPage row={row} state={visualAt(row, frame)} />;
}
export const LayoutCheck = createShotLayoutCheck({
  rows,
  visualAt,
  fps,
  audioLeadFrames,
  SceneAtFrame,
  captions: Object.fromEntries(
    rows.map((row) => [
      row.id,
      row.captions.map((c) => ({
        text: c.text,
        startMs: ((c.start - audioLeadFrames) / fps) * 1000,
        endMs: ((c.end - audioLeadFrames) / fps) * 1000,
        timestampMs: null,
        confidence: null,
      })),
    ]),
  ),
  extraFrames: (row) =>
    [...row.gestures, ...row.captions].flatMap((g) => [
      g.start - 1,
      g.start,
      Math.floor((g.start + g.end) / 2),
      g.end - 1,
      g.end,
    ]),
  auditPage(page, _pageId, visibleStep) {
    const errors: string[] = [];
    checkPageBounds(page, errors);
    checkDiagramLabels(
      [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")],
      errors,
    );
    const shown = [
      ...page.querySelectorAll<HTMLElement>("[data-content-line]"),
    ].filter((line) => getComputedStyle(line).visibility !== "hidden");
    if (shown.length !== visibleStep)
      errors.push("Missing retained teaching line or premature reveal");
    const match = page.dataset.layoutPage?.match(/^(ES\d+)-(\d+)$/);
    const row = rows.find((entry) => entry.id === match?.[1]);
    if (row && match) {
      const state = visualAt(row, Number(match[2]));
      for (const reference of pageReferences[row.page] ?? []) {
        const element = page.querySelector<HTMLElement>(
          `[data-reference="${reference.id}"]`,
        );
        const visible = visibleStep >= (reference.visibleFrom ?? 1);
        if (
          !element ||
          (getComputedStyle(element).visibility !== "hidden") !== visible
        )
          errors.push(
            `${row.id}: missing source or premature reference ${reference.id}`,
          );
        const active =
          visible &&
          state.activeCaption !== null &&
          Boolean(reference.uses[row.id]?.includes(state.activeCaption));
        if (element?.dataset.referenceActive !== String(active))
          errors.push(
            `${row.id}: source emphasis out of sync: ${reference.id}`,
          );
      }
      const active = activeTeachingMarks(
        row.id,
        state.activeCaption,
        state.target,
      );
      // Require the selected semantic colors in the production line, rather than
      // accepting the current-row background as proof of local emphasis.
      const selected = active.length ? active : (objectMarks[row.id] ?? []);
      const ink = shown[visibleStep - 1];
      const actual = [...(ink?.querySelectorAll<HTMLElement>("[style]") ?? [])]
        .map((element) => element.style.color)
        .filter(Boolean);
      for (const color of new Set(selected.map((mark) => mark.color))) {
        const swatch = document.createElement("span");
        swatch.style.color = color;
        if (!actual.includes(swatch.style.color))
          errors.push(
            `${row.id}: selected teaching color is missing from the current line`,
          );
      }
    }
    if (page.querySelector(".katex-error")) errors.push("Invalid math");
    if (page.querySelector("audio,video"))
      errors.push("Visual-stage composition must be silent");
    return errors;
  },
});
