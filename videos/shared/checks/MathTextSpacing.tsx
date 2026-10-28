import { createMathText } from "../ui/MathText";

const { MathText, SvgMathText } = createMathText((text) => text, {
  split: /([0-9\s]+)/g,
  math: /[0-9]/,
});

/** Exercise the shared renderer directly, without a caller-provided wrapper. */
export function MathTextSpacingCases() {
  return (
    <div
      data-math-spacing-cases
      aria-hidden
      style={{
        position: "absolute",
        left: -10000,
        top: 0,
        width: 600,
        fontSize: 28,
      }}
    >
      {(["block", "flex", "grid"] as const).map((display) => (
        <div key={display} data-spacing-case={display} style={{ display }}>
          <MathText>1 与 2</MathText>
        </div>
      ))}
      <svg width={300} height={80}>
        <g data-spacing-case="svg">
          <SvgMathText x={100} y={50}>
            1 与 2
          </SvgMathText>
        </g>
      </svg>
    </div>
  );
}

export function checkMathTextSpacing(root: HTMLElement): string[] {
  const errors: string[] = [];
  const cases = root.querySelectorAll<HTMLElement>("[data-spacing-case]");
  if (cases.length !== 4) errors.push("Missing math spacing cases");
  for (const sample of cases) {
    const name = sample.dataset.spacingCase;
    const formulas = sample.querySelectorAll<HTMLElement>(".katex");
    const walker = document.createTreeWalker(sample, NodeFilter.SHOW_TEXT);
    let prose: Text | undefined;
    while (walker.nextNode()) {
      if (
        walker.currentNode.textContent?.includes("与") &&
        !walker.currentNode.parentElement?.closest(".katex")
      ) {
        prose = walker.currentNode as Text;
        break;
      }
    }
    if (formulas.length !== 2 || !prose) {
      errors.push(`${name}: expected two formulas and Chinese prose`);
      continue;
    }
    const range = document.createRange();
    const offset = prose.data.indexOf("与");
    range.setStart(prose, offset);
    range.setEnd(prose, offset + 1);
    const chinese = range.getBoundingClientRect();
    const first = formulas[0].getBoundingClientRect();
    const second = formulas[1].getBoundingClientRect();
    // Check that whitespace survives layout, not a preferred spacing width.
    if (chinese.left <= first.right || second.left <= chinese.right)
      errors.push(
        `${name}: whitespace between math and Chinese is not visible`,
      );
    if (
      Math.max(first.top, chinese.top, second.top) >=
      Math.min(first.bottom, chinese.bottom, second.bottom)
    )
      errors.push(`${name}: mixed text was split across layout rows`);
  }
  return errors;
}
