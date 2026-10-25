import {
  checkPageBounds,
  checkDiagramLabels,
  contains,
} from "../../shared/checks/dom.ts";
export function auditPage(
  page: HTMLElement,
  pageId: string,
  visibleStep: number,
  thinking: boolean,
  caption: string,
) {
  const errors: string[] = [];
  checkPageBounds(page, errors);
  const visible = (e: HTMLElement) =>
    getComputedStyle(e).visibility === "visible";
  const lines = [...page.querySelectorAll<HTMLElement>("[data-content-line]")];
  lines.forEach((line, i) => {
    if (visible(line) !== i < visibleStep)
      errors.push(`Premature or missing row ${i + 1}`);
  });
  const main = page.querySelector<HTMLElement>("[data-main-column]")!;
  for (const ink of main.querySelectorAll<HTMLElement>("[data-line-ink]"))
    if (!contains(main.getBoundingClientRect(), ink.getBoundingClientRect()))
      errors.push(`Column overflow: ${ink.textContent}`);
  if (thinking) {
    if (
      !pageId.startsWith("question") ||
      visibleStep !== 1 ||
      !caption.includes("想一想")
    )
      errors.push("Question missing during silence");
    if (page.querySelector("[data-result]"))
      errors.push("Answer leaked during silence");
  }
  checkDiagramLabels(
    [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")],
    errors,
  );
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  while (walker.nextNode())
    if (
      /[A-Za-z0-9₀-₉≠≤≥]/.test(walker.currentNode.textContent ?? "") &&
      !walker.currentNode.parentElement?.closest(".katex")
    )
      errors.push(`Math outside LaTeX: ${walker.currentNode.textContent}`);
  return errors;
}
