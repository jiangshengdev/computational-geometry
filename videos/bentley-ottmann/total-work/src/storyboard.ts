import data from "./lesson.json" with { type: "json" };
import { left } from "../../../shared/math/math-lines.ts";
export const pageList = data;
export const pages = Object.fromEntries(
  pageList.map((p) => [
    p.id,
    {
      ...p,
      lines: p.steps.map((s) => ({ math: s.math, text: s.text })),
      groups: [left(p.steps.length)],
    },
  ]),
);
export const shots = pageList.flatMap((p) =>
  p.steps.map((s, i) => ({ ...s, page: p.id, step: i + 1 })),
);
