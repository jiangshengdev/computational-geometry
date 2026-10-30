export const contains = (outer: DOMRect, inner: DOMRect) =>
  inner.left >= outer.left - 1 &&
  inner.right <= outer.right + 1 &&
  inner.top >= outer.top - 1 &&
  inner.bottom <= outer.bottom + 1;

export function checkPageBounds(
  page: HTMLElement,
  errors: string[],
  beforeSubtitle?: () => void,
) {
  const content = page.querySelector<HTMLElement>("[data-main-content]");
  for (const group of content?.querySelectorAll<HTMLElement>(
    "[data-teaching-group]",
  ) ?? []) {
    if (
      !contains(content!.getBoundingClientRect(), group.getBoundingClientRect())
    )
      errors.push(
        `Teaching group ${group.dataset.teachingGroup}: exceeds content bounds`,
      );
  }
  const lines = Array.from(
    content?.querySelectorAll<HTMLElement>("[data-line-ink]") ?? [],
  );
  for (const line of lines) {
    if (
      !contains(content!.getBoundingClientRect(), line.getBoundingClientRect())
    )
      errors.push(`Content overflow: ${line.textContent}`);
    const column = line.closest<HTMLElement>("[data-main-column]");
    if (
      column &&
      !contains(column.getBoundingClientRect(), line.getBoundingClientRect())
    )
      errors.push(`Text column overflow: ${line.textContent}`);
  }
  const diagram = content?.querySelector<HTMLElement>(
    '[data-teaching-group="lesson-diagram"]',
  );
  if (diagram && getComputedStyle(diagram).visibility !== "hidden") {
    const box = diagram.getBoundingClientRect();
    for (const line of lines.filter(
      (line) => getComputedStyle(line).visibility !== "hidden",
    )) {
      for (const ink of line.getClientRects()) {
        if (
          Math.min(box.right, ink.right) > Math.max(box.left, ink.left) &&
          Math.min(box.bottom, ink.bottom) > Math.max(box.top, ink.top)
        ) {
          errors.push(`Text overlaps diagram: ${line.textContent}`);
          break;
        }
      }
    }
  }
  const blocks = [...page.querySelectorAll<HTMLElement>("[data-page-block]")];
  for (const block of blocks)
    if (!contains(page.getBoundingClientRect(), block.getBoundingClientRect()))
      errors.push(`Page overflow: ${block.textContent}`);
  beforeSubtitle?.();
  const subtitle = page.querySelector<HTMLElement>("[data-subtitle]")!;
  const ink = page.querySelector<HTMLElement>("[data-caption-ink]")!;
  if (!contains(subtitle.getBoundingClientRect(), ink.getBoundingClientRect()))
    errors.push("Subtitle overflow");
}

export function checkDiagramLabels(
  labels: HTMLElement[],
  errors: string[],
  inspectLabel?: (label: HTMLElement, box: DOMRect) => void,
) {
  const boxes = labels.map((label) => label.getBoundingClientRect());
  boxes.forEach((box, i) => {
    if (!contains(labels[i].closest("svg")!.getBoundingClientRect(), box))
      errors.push(`Diagram label overflow: ${labels[i].textContent}`);
    inspectLabel?.(labels[i], box);
    boxes.slice(i + 1).forEach((other, j) => {
      if (
        Math.min(box.right, other.right) > Math.max(box.left, other.left) &&
        Math.min(box.bottom, other.bottom) > Math.max(box.top, other.top)
      )
        errors.push(
          `Diagram labels overlap: ${labels[i].textContent} / ${labels[i + j + 1].textContent}; bounds=${JSON.stringify([box.toJSON(), other.toJSON()])}`,
        );
    });
  });
}
