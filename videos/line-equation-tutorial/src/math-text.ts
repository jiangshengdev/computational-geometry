// The tutorial's notation alphabet. Chinese prose and punctuation stay as text.
// This is deliberately not a general Markdown or LaTeX parser.
const notation = /[A-Za-z0-9₀-₉+−=×≠≤≥→↓↑|()[\]., /-]+/g;
const symbols: Record<string, string> = {
  "−": "-",
  "×": "\\times ",
  "≠": "\\ne ",
  "≤": "\\le ",
  "≥": "\\ge ",
  "→": "\\to ",
  "↓": "\\downarrow ",
  "↑": "\\uparrow ",
};

export const mathTextParts = (text: string, highlightDifferences = false) => {
  const parts: { text: string; latex?: string }[] = [];
  let end = 0;
  for (const match of text.matchAll(notation)) {
    const source = match[0].trim();
    if (!source) continue;
    const start = match.index + match[0].indexOf(source);
    if (start > end) parts.push({ text: text.slice(end, start) });
    let latex = source
      .replace(/[₀-₉]/g, (digit) => `_{${digit.charCodeAt(0) - 0x2080}}`)
      .replace(/[−×≠≤≥→↓↑]/g, (symbol) => symbols[symbol])
      .replace(/\b([ac])\/b\b/g, String.raw`\frac{$1}{b}`);
    if (highlightDifferences) {
      latex = latex
        .replace(
          /\(Y_\{2\} - Y_\{1\}\)/g,
          String.raw`{\color{#2563eb}(Y_{2}-Y_{1})}`,
        )
        .replace(
          /\(X_\{2\} - X_\{1\}\)/g,
          String.raw`{\color{#b35b16}(X_{2}-X_{1})}`,
        );
    }
    parts.push({ text: source, latex });
    end = start + source.length;
  }
  if (end < text.length) parts.push({ text: text.slice(end) });
  return parts;
};
