// Object identity is stable across chapters, retained equations and diagrams.
export const objectColors = {
  a: "#2563eb",
  b: "#b45309",
  line: "#087f73",
  dx: "#7c3db5",
  dy: "#b73568",
  check: "#b73568",
  distance: "#7c3db5",
} as const;
export type TeachingObject = keyof typeof objectColors;

// Narration-local meaning, not a guess based on the numeric value of a term.
export const teachingObject = (
  row: string,
  at: number,
  line: string,
  index: number,
): TeachingObject => {
  if (row === "190-2") return at < 6.5 ? "a" : "b";
  if (row === "190-4" || row === "190-5") return "check";
  if (row === "191-2") return "a";
  if (row === "193-1") return index === 0 && at === 0 ? "line" : "a";
  if (row === "191-3" || (row === "191-4" && at === 0))
    return index === 0 ? "a" : "b";
  if (row === "193-2") return index === 0 && at === 0 ? "line" : "b";
  if (row === "193-3")
    return at === 0 ? (index === 0 ? "a" : "b") : at < 9 ? "a" : "b";
  if (row === "191-6") return at < 9 ? "dx" : "dy";
  if (row === "191-7" && at === 0) return index === 0 ? "a" : "b";
  if (row === "192-3") return "dy";
  if (row === "192-4" || row === "192-5") return "dx";
  if (row === "192-7") return index === 0 ? "dy" : "dx";
  if (row === "193-4") return "dy";
  if (row === "193-5") return "dx";
  if (row === "193-6" && at > 0) return "a";
  if (row === "195-1") return index === 0 ? "a" : "b";
  if (row === "195-3" && at === 0) return "a";
  if (row.startsWith("196-") && Number(row.split("-")[1]) <= 5)
    return "distance";
  if (/^(?:a =|\|a\|)/.test(line)) return "dy";
  if (/^(?:b =|\|b\|)/.test(line)) return "dx";
  if (/^c =/.test(line)) return "a";
  return "line";
};

// One quiet entrance, then a steady mark; seeking does not depend on history.
export const emphasisProgress = (elapsedFrames: number) =>
  Math.max(0, Math.min(1, elapsedFrames / 12));

// Apply after equality columns are split, so color groups never cross cells.
export const colorObjectNotation = (latex: string) =>
  latex.replace(
    /[XY]_\{[12]\}|\b[AB]\b|\((?:1, 3|3, 7|2, 1|2, 4|4, 3)\)/g,
    (token) => {
      const object =
        token === "A" ||
        token.includes("{1}") ||
        token === "(1, 3)" ||
        token === "(2, 1)"
          ? "a"
          : "b";
      return `{\\color{${objectColors[object]}}${token}}`;
    },
  );
