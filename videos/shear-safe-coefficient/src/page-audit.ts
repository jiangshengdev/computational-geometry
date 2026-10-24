import {
  checkPageBounds,
  checkDiagramLabels,
  contains,
} from "../../shared/checks/dom.ts";

// Expectations come from #231/#232, independently of storyboard context data.
// Inspect rendered KaTeX source and visibility, not only panel/row existence.
const needed: Record<string, string[]> = {
  numerator: [
    "p,r\\in\\mathbb Z",
    "0<q,t\\le8M^2",
    "q,t\\in\\mathbb Z",
    "\\frac pq\\ne\\frac rt",
    "pt-rq\\ne0",
    "qt>0",
  ],
  product: [
    "p,r\\in\\mathbb Z",
    "0<q,t\\le8M^2",
    "pt-rq\\ne0",
    "qt>0",
    "\\left|\\frac pq-\\frac rt\\right|\\ge\\frac1{qt}",
  ],
  "question-reciprocal": ["M\\ge1", "0<qt\\le64M^4", "2<6"],
  bound: [
    "p,r\\in\\mathbb Z",
    "0<q,t\\le8M^2",
    "pt-rq\\ne0",
    "qt>0",
    "|pt-rq|\\ge1",
    "\\frac1{qt}\\ge\\frac1{64M^4}",
  ],
};

export function auditPage(
  page: HTMLElement,
  pageId: string,
  visibleStep: number,
  thinking: boolean,
) {
  const errors: string[] = [];
  checkPageBounds(page, errors);
  const visible = (element: HTMLElement) => {
    for (
      let e: HTMLElement | null = element;
      e && e !== page.parentElement;
      e = e.parentElement
    ) {
      const css = getComputedStyle(e);
      if (
        css.visibility !== "visible" ||
        css.display === "none" ||
        Number(css.opacity) === 0
      )
        return false;
    }
    return element.getBoundingClientRect().width > 0;
  };
  const sources = [...page.querySelectorAll<HTMLElement>(".katex")]
    .filter(visible)
    .map(
      (element) =>
        element.querySelector('annotation[encoding="application/x-tex"]')
          ?.textContent ?? "",
    );
  for (const formula of needed[pageId] ?? []) {
    if (!sources.some((source) => source.includes(formula)))
      errors.push(`Missing visible dependency: ${formula}`);
  }
  for (const line of page.querySelectorAll<HTMLElement>(
    "[data-context-line]",
  )) {
    if (
      !visible(line) ||
      !contains(
        page
          .querySelector<HTMLElement>("[data-context]")!
          .getBoundingClientRect(),
        line.getBoundingClientRect(),
      )
    )
      errors.push("Context unavailable or clipped");
  }
  [...page.querySelectorAll<HTMLElement>("[data-content-line]")].forEach(
    (line, index) => {
      if (visible(line) !== index < visibleStep)
        errors.push(`Lost earlier step or premature reveal: ${index + 1}`);
    },
  );
  if (thinking) {
    const question = page.querySelector<HTMLElement>("[data-content-line]");
    if (
      !question ||
      !visible(question) ||
      !question.textContent?.includes("先想一想") ||
      !sources.includes("2<6") ||
      visibleStep !== 1
    )
      errors.push("Question/example lost or answer revealed during silence");
  }
  checkDiagramLabels(
    [...page.querySelectorAll<HTMLElement>("[data-diagram-label]")],
    errors,
  );
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (
      /[A-Za-z0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹≠≤≥]/.test(
        walker.currentNode.textContent ?? "",
      ) &&
      !walker.currentNode.parentElement?.closest(".katex")
    )
      errors.push(`Math outside LaTeX: ${walker.currentNode.textContent}`);
  }
  return errors;
}
