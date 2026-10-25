import {
  checkPageBounds,
  checkDiagramLabels,
  contains,
} from "../../shared/checks/dom.ts";

// Expectations come from #231/#232, independently of storyboard context data.
// Inspect rendered KaTeX source and visibility, not only panel/row existence.
const needed: Record<string, string[]> = {
  product: [
    "p,r\\in\\mathbb Z",
    "0<q,t\\le8M^2",
    "pt-rq\\ne0",
    "qt>0",
    "\\left|\\frac pq-\\frac rt\\right|\\ge\\frac1{qt}",
  ],
  "question-reciprocal": ["M\\ge1", "0<qt\\le64M^4"],
  bound: [
    "p,r\\in\\mathbb Z",
    "0<q,t\\le8M^2",
    "pt-rq\\ne0",
    "qt>0",
    "|pt-rq|\\ge1",
    "\\frac1{qt}\\ge\\frac1{64M^4}",
  ],
};

// These are teaching expectations, not copied from the rendered row list.
// New objects and results must first appear in the main scene, at their step.
const firstUse: Record<
  string,
  { step: number; formula?: string; text?: string }[]
> = {
  recap: [
    { step: 4, text: "事件：输入端点与实际线段交点" },
    { step: 5, text: "表示这些坐标约分后的正分母" },
    { step: 6, formula: "0<q\\le8M^2" },
  ],
  example: [
    { step: 1, formula: "\\frac23-\\frac12=\\frac46-\\frac36=\\frac16" },
    { step: 2, formula: "2\\le3,\\quad 3\\le3" },
    { step: 3, formula: "2\\times3\\le3\\times3=9" },
    { step: 4, formula: "\\frac16\\ge\\frac1{3\\times3}=\\frac19" },
  ],
  numerator: [
    { step: 1, text: "从输入端点与实际交点中选取" },
    { step: 2, formula: "X_P=\\frac pq\\ne\\frac rt=X_Q" },
    { step: 3, formula: "p,r\\in\\mathbb Z" },
    { step: 4, text: "是约分后的正整数分母" },
    { step: 5, formula: "0<q,t\\le8M^2" },
    { step: 6, formula: "\\frac pq-\\frac rt" },
    { step: 7, formula: "\\frac{pt-rq}{qt}" },
    { step: 8, formula: "qt>0" },
    { step: 9, formula: "pt-rq\\ne0" },
    { step: 10, formula: "|pt-rq|\\ge1" },
    { step: 11, formula: "\\frac{|pt-rq|}{qt}\\ge\\frac1{qt}" },
  ],
  "question-reciprocal": [
    { step: 1, formula: "2<6" },
    { step: 2, formula: "\\frac12>\\frac16" },
    { step: 4, formula: "\\frac1{qt}\\ge\\frac1{64M^4}" },
  ],
};

export function auditPage(
  page: HTMLElement,
  pageId: string,
  visibleStep: number,
  thinking: boolean,
  caption: string,
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
  const main = page.querySelector<HTMLElement>("[data-main-content]")!;
  // Check what is being explained, independently of the configured reveal
  // step. A timeline that stays at step 0 must not pass during narration.
  const spokenSteps: Record<string, [string, number][]> = {
    recap: [
      ["端点和实际线段交点", 4],
      ["约分后的正分母", 5],
    ],
    example: [
      ["它们的分母", 2],
      ["分母乘积", 3],
    ],
    numerator: [
      ["从输入端点与实际交点中", 1],
      ["点 P 的横坐标", 2],
      ["把这两个横坐标", 2],
      ["其中 p 与 r", 3],
      ["q 与 t 是", 4],
      ["都不超过", 5],
      ["第一个分数的分子分母", 6],
      ["通分以后", 7],
      ["距离不区分正负", 8],
      ["横坐标不同，所以", 9],
      ["它是非零整数", 10],
      ["除以同一个正数", 11],
    ],
  };
  for (const [phrase, step] of spokenSteps[pageId] ?? []) {
    if (caption.includes(phrase) && visibleStep < step)
      errors.push(
        `Narration has no corresponding main-scene content: ${phrase}`,
      );
  }
  const context = page.querySelector<HTMLElement>("[data-context]");
  if (["recap", "example", "numerator"].includes(pageId) && context)
    errors.push(
      "First-use content must stay in the main scene until the next page",
    );
  const matches = (
    root: HTMLElement,
    expectation: { formula?: string; text?: string },
  ) =>
    expectation.formula
      ? [...root.querySelectorAll<HTMLElement>(".katex")].filter((element) =>
          element
            .querySelector('annotation[encoding="application/x-tex"]')
            ?.textContent?.includes(expectation.formula!),
        )
      : [
          ...root.querySelectorAll<HTMLElement>(
            "[data-content-line], [data-context-line]",
          ),
        ].filter((element) => element.textContent?.includes(expectation.text!));
  for (const expectation of firstUse[pageId] ?? []) {
    if (context && matches(context, expectation).length)
      errors.push(
        `New content placed in prior context: ${expectation.formula ?? expectation.text}`,
      );
    if (
      matches(main, expectation).some(visible) !==
      visibleStep >= expectation.step
    )
      errors.push(
        `Missing or premature main-scene introduction: ${expectation.formula ?? expectation.text}`,
      );
  }
  for (const column of main.querySelectorAll<HTMLElement>(
    "[data-main-column]",
  )) {
    for (const ink of column.querySelectorAll<HTMLElement>("[data-line-ink]")) {
      if (
        !contains(column.getBoundingClientRect(), ink.getBoundingClientRect())
      )
        errors.push(`Teaching content crosses its column: ${ink.textContent}`);
    }
  }
  if (pageId === "example") {
    const diagram = page.querySelector<HTMLElement>("[data-fraction-diagram]");
    const distance = page.querySelector<HTMLElement>(
      "[data-fraction-distance]",
    );
    if (
      !diagram ||
      !main.contains(diagram) ||
      !distance ||
      visible(distance) !== visibleStep >= 1
    )
      errors.push(
        "Example and its distance must be introduced in the main scene",
      );
  }
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
