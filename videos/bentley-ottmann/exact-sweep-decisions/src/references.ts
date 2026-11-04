import { shots } from "./storyboard.ts";

function taughtMath(id: string) {
  const math = shots.find((shot) => shot.id === id)?.math;
  if (!math) throw Error(`Missing previously taught formula: ${id}`);
  return math;
}

export type FormulaReference = {
  id: string;
  name: string;
  math: string;
  /** Reserve space, but introduce this page's symbols in the main scene first. */
  visibleFrom?: number;
};

const future: FormulaReference = {
  id: "future-difference",
  name: "未来差定义",
  math: taughtMath("ES20"),
};
const height: FormulaReference = {
  id: "height",
  name: "高度公式",
  math: `${taughtMath("ES30")},\\quad i=1,2`,
};
const difference: FormulaReference = {
  id: "height-difference",
  name: "固定相减次序",
  math: taughtMath("ES31"),
};
const lines: FormulaReference = {
  id: "line-equations",
  name: "原直线方程",
  math: taughtMath("ES29"),
};
const slopes: FormulaReference = {
  id: "slopes",
  name: "斜率公式",
  math: taughtMath("ES38"),
};
// Why-neighbors: d(x)=alpha(x-p), alpha=m_V-m_U. Substitute this
// episode's already-introduced names; do not introduce alpha or reprove it.
const crossing: FormulaReference = {
  id: "crossing-difference",
  name: "第二章换序依据",
  math: "d_{21}(x)=(m_2-m_1)(x-x_P)",
};

/** Only sources required by this page, with no thought-window answer leakage. */
export const pageReferences: Record<string, FormulaReference[]> = {
  "future-zero": [future],
  "future-consequence": [future],
  "height-difference": [height],
  "crossing-height": [
    difference,
    height,
    lines,
    { ...crossing, visibleFrom: 3 },
  ],
  "crossing-action": [slopes, crossing, height],
};
