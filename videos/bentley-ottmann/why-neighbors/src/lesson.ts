import type { Reference } from "./storyboard.ts";
import { storyboard } from "./storyboard.ts";
import { left } from "../../../shared/math/math-lines.ts";
export { references } from "./storyboard.ts";
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
      groups: [left(page.steps.length)],
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
