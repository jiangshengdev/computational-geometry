// Identity colors are shared by diagrams, derivations and mathematical prose.
export const objectColors = {
  original: "#2563eb",
  movement: "#b45309",
  coordinates: "#7c3db5",
} as const;
export type TeachingRole = keyof typeof objectColors;
export type MathMark = { text: string; role: TeachingRole };

export const pageRoles: Record<string, TeachingRole> = {
  opening: "movement",
  positive: "movement",
  formula: "movement",
  question1: "movement",
  negative: "movement",
  compareMove: "movement",
  readOriginal: "original",
  coordinates: "coordinates",
  inverse: "coordinates",
  horizontalExample: "coordinates",
  horizontal: "coordinates",
  vertical: "coordinates",
  oblique: "coordinates",
  question2: "coordinates",
  compareRead: "coordinates",
  // The shared formula has no single operation; each comparison panel overrides it.
  ending: "original",
};

const original = (text: string): MathMark => ({ text, role: "original" });
const movement = (text: string): MathMark => ({ text, role: "movement" });
const coordinates = (text: string): MathMark => ({ text, role: "coordinates" });

// Numeric values get their meaning from their authored occurrence, never their value.
export const lineMarks: Record<string, MathMark[][]> = {
  positive: [
    [original("(2,2)")],
    [movement("\\frac12"), original("2")],
    [original("2")],
    [],
  ],
  question1: [[original("(-1,-1)")]],
  negative: [
    [original("-1"), original("(-1)")],
    [original("-1")],
    [original("-\\frac22")],
    [],
  ],
  compareMove: [[original("(2,2)")]],
  coordinates: [[original("(2,2)")]],
  question2: [[original("(2,2)")]],
  compareRead: [[original("(2,2)")]],
  horizontal: [
    [coordinates("0"), original("0")],
    [movement("s\\times0")],
    [movement("0")],
  ],
  horizontalExample: [
    [],
    [],
    [coordinates("2"), movement("s\\times0"), original("2")],
    [original("(2,0)"), coordinates("(x',y')")],
  ],
  vertical: [
    [movement("\\frac12")],
    [],
    [],
    [movement("\\frac12\\times2")],
    [movement("1"), original("-1")],
    [original("(-1,2)")],
  ],
};

export const lineNumberRoles: Record<string, Record<number, TeachingRole[]>> = {
  compareMove: { 2: ["movement", "movement"] },
  oblique: { 3: ["coordinates"] },
};
export const noteNumberRoles: Record<string, TeachingRole[]> = {
  horizontalExample: ["original"],
  vertical: ["coordinates", "coordinates", "original", "original"],
};
export const titleNumberRoles: Record<string, TeachingRole[]> = {
  horizontalExample: ["coordinates"],
  vertical: ["coordinates"],
};

export const paintMath = (text: string, role: TeachingRole) =>
  `{\\color{${objectColors[role]}}${text}}`;

/** Color symbols without matching letters inside LaTeX commands. */
export const colorMath = (
  source: string,
  operation: TeachingRole | undefined,
  marks: MathMark[] = [],
  numberRoles: (TeachingRole | undefined)[] = [],
): string => {
  const ranges: { from: number; to: number; role: TeachingRole }[] = [];
  let cursor = 0;
  for (const mark of marks) {
    const from = source.indexOf(mark.text, cursor);
    if (from < 0)
      throw new Error(`Missing math annotation: ${mark.text} in ${source}`);
    ranges.push({ from, to: from + mark.text.length, role: mark.role });
    cursor = from + mark.text.length;
  }
  let number = 0;
  const symbols = (text: string) =>
    text.replace(
      /\\[A-Za-z]+|sy['′]?|[xyPQ]['′]?|s|\d+(?:\.\d+)?/g,
      (token) => {
        if (token.startsWith("\\")) return token;
        if (/^\d/.test(token)) {
          const role = numberRoles[number++];
          return role ? paintMath(token, role) : token;
        }
        const role =
          token === "s" || token.startsWith("sy")
            ? "movement"
            : /['′]$/.test(token)
              ? operation
              : "original";
        return role ? paintMath(token, role) : token;
      },
    );
  let end = 0;
  let result = "";
  for (const range of ranges) {
    result += symbols(source.slice(end, range.from));
    result += paintMath(source.slice(range.from, range.to), range.role);
    end = range.to;
  }
  return result + symbols(source.slice(end));
};

const O: TeachingRole = "original";
const M: TeachingRole = "movement";
const C: TeachingRole = "coordinates";
// One entry for each Arabic number in the full, unchanged caption (including tuples).
// Short captions take a slice of this mapping using their position in that full text.
export const captionNumberRoles: Record<string, TeachingRole[]> = {
  "204-04": [O],
  "204-05": [O, M],
  "204-06": [M, O, M],
  "204-07": [M, M],
  "204-12": [O],
  "204-13": [O, O],
  "204-14": [O],
  "204-15": [O],
  "204-16": [M],
  "205-01a": [O],
  "205-01b": [O],
  "205-04": [C, C],
  "205-05": [C],
  "205-06": [O, O, C, C],
  "206-06a": [C, C],
  "206-06c": [C, O],
  "206-06d": [C, C],
  "206-07": [C],
  "206-11": [C, C],
  "206-12": [C, O],
  "206-13": [C],
  "206-14": [M, M, O],
  "206-15": [M, M],
  "206-19": [C, C],
  "207-01": [O, O, C, C],
  "207-02": [M],
  "207-03": [C, C],
  "207-05": [O, O],
  // The shared result belongs to both panels: keep it neutral instead of choosing a mode.
};

export const captionNumbers = (
  full: string,
  cue: string,
  roles: TeachingRole[],
) => {
  const start = full.indexOf(cue);
  if (start < 0) throw new Error(`Caption is not part of its source: ${cue}`);
  const offset = [...full.slice(0, start).matchAll(/\d+(?:\.\d+)?/g)].length;
  return roles.slice(
    offset,
    offset + [...cue.matchAll(/\d+(?:\.\d+)?/g)].length,
  );
};
