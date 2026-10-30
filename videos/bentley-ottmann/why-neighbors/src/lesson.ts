import type { Reference } from "./storyboard.ts";
import { storyboard } from "./storyboard.ts";
import {
  equals,
  left,
  type TeachingGroup,
} from "../../../shared/math/math-lines.ts";
export { references } from "./storyboard.ts";
// Explicit teaching groups: inequalities, explanations and independent
// judgments do not acquire equation alignment merely by containing an '='.
const alignedGroups: Record<string, TeachingGroup[]> = {
  "define-ca": [equals(3)],
  "signs-example": [equals(3), left(1)],
  subtract: [equals(4)],
  substitution: [left(1), equals(2)],
  grouping: [equals(3)],
  "end-difference": [equals(4)],
  replace: [equals(2), left(1)],
  "zero-equation": [equals(4)],
  division: [left(2), equals(2)],
  "negative-range": [equals(2), left(2)],
  midpoint: [left(1), equals(2), left(1)],
  squeeze: [left(1), equals(2), left(1)],
};
export const pages = Object.fromEntries(
  storyboard.map((page) => [
    page.id,
    {
      ...page,
      lines: page.steps.map((step) => {
        const source: Reference | undefined = step.publish
          ? references[step.publish]
          : undefined;
        const number = source?.number;
        return step.math
          ? { math: step.math + (number ? `\\qquad (${number})` : "") }
          : {
              text: (number ? `(${number}) ${source!.name}：` : "") + step.text,
            };
      }),
      groups: alignedGroups[page.id] ?? [left(page.steps.length)],
      holdAfterSeconds: page.hold,
    },
  ]),
);
export const shots = storyboard.map((page) => ({
  id: `V-${page.id}`,
  page: page.id,
  step: page.steps.length,
  caption: page.steps.map((step) => step.caption).join(""),
  action: page.title,
}));
export type Shot = (typeof shots)[number];
import { references } from "./storyboard.ts";
