import { colors, inputColors } from "../../colors.ts";

export type ColorMark = { term: string; color: string };
const marks = (color: string, ...terms: string[]): ColorMark[] =>
  terms.map((term) => ({ term, color }));
const first = (...terms: string[]) => marks(inputColors[0], ...terms);
const second = (...terms: string[]) => marks(inputColors[1], ...terms);
const result = (...terms: string[]) => marks(colors.violet, ...terms);
const focus = (...terms: string[]) => marks(colors.amber, ...terms);
const inputs = [
  ...first("S_1", "A_1", "B_1", "a_1", "b_1", "c_1"),
  ...second("S_2", "A_2", "B_2", "a_2", "b_2", "c_2"),
];
const point = [...first("E", "F"), ...second("T", "T_1", "T_2", "T_3")];
const candidate = result("P", "x_P", "y_P");
const bounds = result("L", "R");

/** Selected teaching rows only: persistent identities, never global letter colors. */
export const objectMarks: Record<string, ColorMark[]> = {
  CI02: inputs,
  CI09: point,
  CI10: second("T"),
  CI11: [...first("x_E", "x_F", "y_E", "y_F"), ...second("x_T", "y_T")],
  CI12: first("E", "F"),
  CI14: [...first("x_E", "x_F"), ...second("x_T")],
  CI15: [...first("y_E", "y_F"), ...second("y_T")],
  CI16: point,
  CI17: second("T_2"),
  CI18: second("T_3"),
  CI19: inputs,
  CI25: candidate,
  CI26: candidate,
  CI27: candidate,
  CI28: inputs,
  CI29: candidate,
  CI30: candidate,
  CI31: inputs,
  CI32: inputs,
  CI33: candidate,
  CI34: inputs,
  CI35: candidate,
  CI37: [...first("a_1", "b_1", "c_1"), ...second("x_{A_2}", "y_{A_2}")],
  CI40: inputs,
  CI41: second("A_2"),
  CI44: result("L"),
  CI45: result("R"),
  CI46: inputs,
  CI47: [...first("A_1"), ...second("A_2"), ...result("L")],
  CI48: [...first("B_1"), ...second("B_2"), ...result("R")],
  CI49: bounds,
  CI50: bounds,
  CI51: bounds,
  CI52: bounds,
  CI53: inputs,
  CI54: bounds,
  CI61: bounds,
  CI62: inputs,
};

/** Caption-sized semantic windows use the existing provisional reading clock. */
export const focusMarks: Record<string, ColorMark[][]> = {
  CI04: [
    focus("x_{A_i}", "x_{B_i}"),
    [],
    focus("y_{A_i}", "y_{B_i}"),
    focus("\\iff"),
  ],
  CI05: [focus("两份都是点", "恰好一份是点", "两份都非点")],
  CI06: [focus("两个端点不同"), focus("两个端点不同"), focus("唯一直线")],
  CI08: [focus("两坐标分别相等", "该点"), focus("空")],
  CI11: [
    focus("(x_F-x_E)(y_T-y_E)"),
    focus("(y_F-y_E)(x_T-x_E)"),
    focus("\\omega_{EF}(T)"),
    [],
  ],
  CI12: [focus("判断式为零才共线"), [], []],
  CI13: [[], focus("先确认共线")],
  CI14: [focus("x_E\\ne x_F"), focus("\\min", "\\max"), focus("\\le")],
  CI15: [focus("x_E=x_F"), focus("\\le"), []],
  CI17: [focus("共线"), focus("越过端点")],
  CI18: [[], focus("共线且在闭范围内"), []],
  CI20: [[], focus("a_i", "y_{B_i}-y_{A_i}"), focus("b_i", "x_{A_i}-x_{B_i}")],
  CI21: [
    focus("a_i x_{A_i}", "b_i y_{A_i}"),
    focus("c_i"),
    focus("x", "y"),
    [],
  ],
  CI22: [focus("a_1b_2", "a_2b_1"), focus("\\Delta")],
  CI23: [[], focus("Δ≠0", "唯一交点"), focus("Δ=0", "平行或重合")],
  CI24: [focus("合法直线"), focus("不要求整数系数"), []],
  CI25: [focus("\\Delta\\ne0"), []],
  CI26: [[], focus("c_1b_2-c_2b_1"), focus("\\Delta")],
  CI27: [focus("a_1c_2"), focus("a_2c_1", "\\Delta"), []],
  CI28: [[], [], focus("分别使用闭范围检查")],
  CI29: [[], [], focus("任意一份排除")],
  CI30: [focus("两份都通过"), focus("交集恰好")],
  CI33: [focus("\\Delta=8"), [], [], []],
  CI35: [[], focus("5>4"), []],
  CI36: [focus("\\Delta=0"), []],
  CI37: [[], [], focus("\\stackrel{?}{=}")],
  CI38: [[], [], focus("不成立", "成立")],
  CI39: [[], [], focus("不能单独证明")],
  CI41: [focus("Δ=0"), focus("不满足第一条方程"), [], []],
  CI42: [focus("均非点", "已经确认共线"), []],
  CI43: [focus("横坐标", "纵坐标"), [], []],
  CI44: [focus("更靠后"), []],
  CI45: [focus("更靠前"), [], []],
  CI49: [focus("完整闭区间"), focus("完整闭区间")],
  CI50: [focus("后", "交集为空"), []],
  CI51: [focus("同点"), focus("交集为点")],
  CI52: [focus("前", "完整非零长度闭区间"), [], []],
  CI55: [focus("整段"), focus("不把结果拆碎"), []],
  CI56: [[], focus("相同或不同"), []],
  CI57: [focus("Δ"), [], []],
  CI58: [focus("前", "同点", "后"), focus("每条路径都有出口"), []],
  CI59: [[], focus("比较位置", "共线且在闭范围内"), []],
  CI60: [[], focus("非零求候选"), focus("零则区分平行与共线")],
};

export const pathObjectMarks = [[], candidate, bounds];
export const pathFocusMarks = [
  [[], focus("比较位置", "共线且在闭范围内"), focus("条件满足", "否则")],
  [focus("Δ"), focus("Δ≠0", "两份闭范围"), focus("Δ=0", "端点代入")],
  [focus("后", "同点", "前"), [], []],
];

export const normalizeMath = (text: string) =>
  text
    .replace(/ᵢ/g, "_i")
    .replace(/Δ/g, "\\Delta")
    .replace(/≠/g, "\\ne ")
    .replace(/_{([12])}/g, "_$1");

export const escapePattern = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Labels opt in at their diagram call site, independently of prose/captions. */
export function labelColor(text: string) {
  const value = normalizeMath(text);
  if (/A_1=B_2|S_1,S_2/.test(value)) return "#172c45";
  if (/^(?:P|L|R)(?:=|$)/.test(value)) return colors.violet;
  if (/^(?:T(?:_[123])?|[AB]_2|S_2)(?:[=(,]|$)/.test(value))
    return inputColors[1];
  if (/^(?:E|F|[AB]_1|S_1)(?:[=(,]|$)/.test(value)) return inputColors[0];
  if (/^[xy]_[EF]$/.test(value)) return inputColors[0];
  if (/^[xy]_T$/.test(value)) return inputColors[1];
  return "#172c45";
}
