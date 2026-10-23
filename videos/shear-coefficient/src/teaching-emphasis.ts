// Identity colors are shared by diagrams, derivations and mathematical prose.
export const objectColors = {
  original: "#2563eb",
  movement: "#b45309",
  coordinates: "#7c3db5",
} as const;
export type TeachingRole = keyof typeof objectColors;
export type MathMark = { text: string; role: TeachingRole };

export const pageRoles: Record<string, TeachingRole> = {
  opening: "original",
  formula: "movement",
  notation: "original",
  calculateA: "original",
  calculateB: "coordinates",
  crossing: "original",
};
const a = (text: string): MathMark => ({ text, role: "original" });
const b = (text: string): MathMark => ({ text, role: "coordinates" });
const coefficient = (text: string): MathMark => ({ text, role: "movement" });
export const lineMarks: Record<string, MathMark[][]> = {
  opening: [[a("A=(0,200)")], [b("B=(1,0)")], [a("0"), b("1")]],
  notation: [
    [a("0"), a("200")],
    [b("1"), b("0")],
  ],
  calculateA: [
    [coefficient("s=0.01=\\frac{1}{100}")],
    [a("0"), coefficient("\\frac{1}{100}"), a("200")],
    [a("0+2")],
    [a("2")],
  ],
  calculateB: [
    [coefficient("s=0.01=\\frac{1}{100}")],
    [b("1"), coefficient("\\frac{1}{100}"), b("0")],
    [b("1+0")],
    [b("1")],
  ],
  crossing: [
    [a("0"), b("1")],
    [a("(2,200)"), b("(1,0)")],
    [a("2"), b("1")],
  ],
};
export const lineNumberRoles: Record<string, Record<number, TeachingRole[]>> = {
  crossing: { 3: ["movement"] },
};
const A: TeachingRole = "original";
const B: TeachingRole = "coordinates";
const S: TeachingRole = "movement";
export const captionNumberRoles: Record<string, TeachingRole[]> = {
  "210-01": [S, A, A],
  "210-02": [B, B],
  "210-04": [A, B],
  "210-10": [A],
  "210-11": [B],
  "210-14": [S],
  "210-15": [A],
  "210-16": [A, S, A, A],
  "210-17": [A, A],
  "210-19": [B, B],
  "210-20": [B],
  "210-21": [B, B],
  "210-23": [A, A],
  "210-24": [A, B],
  "210-25": [S],
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
      /\\[A-Za-z]+|sy['′]?|[AB]['′]?|[xy]['′]?_\{?[AB]\}?|[xy]['′]?|s|\d+(?:\.\d+)?/g,
      (token) => {
        if (token.startsWith("\\")) return token;
        if (/^\d/.test(token)) {
          const role = numberRoles[number++];
          return role ? paintMath(token, role) : token;
        }
        const role =
          token.startsWith("A") || /_\{?A\}?$/.test(token)
            ? "original"
            : token.startsWith("B") || /_\{?B\}?$/.test(token)
              ? "coordinates"
              : token === "s" || token.startsWith("sy")
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
