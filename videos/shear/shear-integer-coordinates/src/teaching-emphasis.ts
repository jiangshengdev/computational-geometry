export const objectColors = {
  original: "#2563eb",
  movement: "#b45309",
  coordinates: "#7c3db5",
} as const;
export type TeachingRole = keyof typeof objectColors;
export type MathMark = { text: string; role: TeachingRole };
export const pageRoles: Record<string, TeachingRole> = {
  opening: "original",
  denominator: "movement",
  formula: "movement",
  calculateP: "original",
  questionQ: "coordinates",
  answerQ: "coordinates",
  scaling: "movement",
  camera: "movement",
  absolute: "movement",
  questionM: "movement",
  answerM: "movement",
  range: "movement",
  indices: "movement",
  coefficients: "movement",
  calculateA: "original",
  calculateB: "coordinates",
  distance: "movement",
  bounds: "movement",
  conclusion: "movement",
};
export const lineMarks: Record<string, MathMark[][]> = {
  opening: [
    [{ text: "P=(\\frac12,-\\frac23)", role: "original" }],
    [{ text: "Q=(-\\frac13,\\frac16)", role: "coordinates" }],
  ],
  scaling: [
    [],
    [{ text: "P'=(3,-4)", role: "original" }],
    [{ text: "Q'=(-2,1)", role: "coordinates" }],
  ],
  camera: [
    [{ text: "P'=(3,-4)", role: "original" }],
    [{ text: "Q'=(-2,1)", role: "coordinates" }],
  ],
};
export const lineNumberRoles: Record<
  string,
  Record<number, TeachingRole[]>
> = {};
export const paintMath = (text: string, role: TeachingRole) =>
  `{\\color{${objectColors[role]}}${text}}`;
// Color only explicit teaching annotations; keep other symbols neutral.
export const colorMath = (
  source: string,
  _operation?: TeachingRole,
  marks: MathMark[] = [],
) => {
  let cursor = 0;
  let result = "";
  for (const mark of marks) {
    const from = source.indexOf(mark.text, cursor);
    if (from < 0) throw Error(`Missing math annotation: ${mark.text}`);
    result += source.slice(cursor, from) + paintMath(mark.text, mark.role);
    cursor = from + mark.text.length;
  }
  return result + source.slice(cursor);
};
