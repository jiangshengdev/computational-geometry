export type ColorMark = { term: string; color: string };

export const normalizeMath = (text: string) =>
  text
    .replace(/ᵢ/g, "_i")
    .replace(/Δ/g, "\\Delta")
    .replace(/≠/g, "\\ne ")
    .replace(/_{([12])}/g, "_$1");

export const escapePattern = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Explicit row marks only; consume commands whole to avoid coloring their letters.
export const colorMath = (
  text: string,
  _role?: string,
  marks: ColorMark[] = [],
) => {
  const selected = new Map(
    marks.map((mark) => [normalizeMath(mark.term), mark.color]),
  );
  const terms = [...selected.keys()]
    .filter((term) => !/[\u3400-\u9fff]/.test(term))
    .sort((a, b) => b.length - a.length);
  const value = normalizeMath(text);
  if (!terms.length) return value;
  const quantities = terms.map(
    (term) =>
      // Indexed coefficients may be immediately multiplied by x/y; a bare x/y
      // must not also match the base of an endpoint coordinate such as x_{A_i}.
      `${/^[A-Za-z]/.test(term) ? "(?<![A-Za-z])" : ""}${escapePattern(term)}${/[A-Za-z0-9}]$/.test(term) ? `(?![${/_[0-9]+$/.test(term) ? "0-9_" : "A-Za-z0-9_"}])` : ""}`,
  );
  const pattern = new RegExp(
    `(?:${quantities.join("|")})|\\\\(?:\\\\|[A-Za-z]+)`,
    "g",
  );
  return value.replace(pattern, (term, offset: number) => {
    if (!selected.has(term)) return term;
    // A surrounding {...} turns relations/operators into an ordinary atom.
    // textcolor is transparent to KaTeX's atom classes and spacing rules.
    const colored = `\\textcolor{${selected.get(term)}}{${term}}`;
    // A bare script such as x_T still needs one grouped argument after _/^.
    return /[_^]/.test(value[offset - 1] ?? "") ? `{${colored}}` : colored;
  });
};
