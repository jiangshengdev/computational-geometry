import { colors, inputColors } from "../../colors.ts";
import type { ColorMark } from "../../../shared/math/semantic-colors";

const marks = (color: string, ...terms: string[]): ColorMark[] =>
  terms.map((term) => ({ term, color }));
const first = (...terms: string[]) => marks(inputColors[0], ...terms);
const second = (...terms: string[]) => marks(inputColors[1], ...terms);
const result = (...terms: string[]) => marks(colors.violet, ...terms);
const focus = (...terms: string[]) => marks(colors.amber, ...terms);
const eventPositions = [
  ...first("H", "x_H", "y_H"),
  ...second("K", "x_K", "y_K"),
];
const recordPositions = [
  ...result("P", "x_P", "y_P"),
  ...second("Q", "x_Q", "y_Q"),
];
const future = result("x_P", "f_P");

/** Only selected teaching rows retain identity colors, matching their diagrams. */
export const objectMarks: Record<string, ColorMark[]> = {
  ES10: eventPositions,
  ES11: [...first("x_H"), ...second("x_K")],
  ES13: recordPositions,
  ES14: recordPositions,
  ES20: future,
  ES21: result("f_P"),
  ES22: future,
  ES23: result("f_P"),
  ES25: future,
  ES31: [...first("y_1(x)"), ...second("y_2(x)"), ...result("d_{21}(x)")],
  ES32: [
    ...first("a_1", "b_1", "c_1"),
    ...second("a_2", "b_2", "c_2"),
    ...result("d_{21}(x)"),
  ],
  ES37: result("d_{21}", "x_P"),
  ES40: [...first("m_1"), ...second("m_2")],
};

/** One window per measured subtitle phrase; no reading estimates or word pulses. */
export const focusMarks: Record<string, ColorMark[][]> = {
  ES01: [[], focus("扫描判断"), []],
  ES02: [
    focus("有长度", "不竖直"),
    focus("无重叠", "端点接触", "多线共点"),
    [],
  ],
  ES03: [focus("不同事件横坐标各异"), focus("原始无序输入对"), []],
  ES04: [focus("给定有理数端点"), focus("精确求交", "精确比较"), []],
  ES05: [focus("加、减、乘"), focus("已确认非零"), []],
  ES06: [focus("比较数值"), focus("不比较分式的写法"), [], []],
  ES07: [focus("一对邻居"), focus("交集为空", "真实交点"), []],
  ES08: [focus("判空", "不登记"), focus("真实交点", "未来", "重复"), []],
  ES09: [focus("凭空换序"), focus("凭空换序"), focus("没有待处理记录")],
  ES10: [[], [], []],
  ES11: [[], focus("<"), []],
  ES12: [focus("先处理右侧", "尚未完成"), focus("尚未完成"), []],
  ES13: [[], [], []],
  ES14: [focus("x_P=x_Q", "y_P=y_Q"), focus("\\iff"), []],
  ES15: [focus("再次发现同一交叉"), focus("保留原记录", "不添第二份"), []],
  ES16: [focus("重复报告", "重复换序"), [], []],
  ES17: [focus("位置", "原始输入对"), [], [], [], focus("原始输入对")],
  ES18: [[], focus("不处理", "统一扫描更新"), []],
  ES19: [focus("x_0"), [], []],
  ES20: [[], [], focus("f_P")],
  ES21: [focus(">0"), [], []],
  ES22: [focus("f_P=0", "x_P=x_0"), [], []],
  ES23: [focus("<0"), [], []],
  ES24: [focus("允许等号"), []],
  ES25: [focus("x_0=x_P", "f_P=0"), focus("f_P=0"), focus("f_P=0")],
  ES26: [focus("真实正差", "近似成零", "被排除"), focus("真实正差"), []],
  ES27: [
    focus("决定能否加入"),
    focus("决定何时取出"),
    focus("同一个精确横坐标"),
  ],
  ES28: [focus("正确位置"), focus("从下到上"), []],
  ES29: [[], focus("a_i", "b_i", "c_i"), []],
  ES30: [
    focus("x"),
    focus("y_i(x)"),
    focus("b_i\\ne0"),
    focus("c_i-a_ix", "b_i"),
    [],
  ],
  ES31: [focus("y_2(x)", "y_1(x)"), focus("d_{21}(x)"), []],
  ES32: [[], focus("d_{21}(x)"), focus("b_2", "b_1")],
  ES33: [
    focus("正", "第二份在上", "负", "第二份在下"),
    focus("零", "等高"),
    [],
  ],
  ES34: [focus("开始端点不落在其他线段上"), focus("不等高"), []],
  ES35: [focus("上下比较错", "插入位置错"), focus("真邻居可能被隔开"), []],
  ES36: [focus("高度比较"), focus("活动顺序", "检查对象"), focus("检查对象")],
  ES37: [[], focus("x_P"), focus("=0"), []],
  ES38: [focus("m_i"), focus("-\\frac{a_i}{b_i}"), []],
  ES39: [focus("两条斜率的差", "右侧高低"), [], []],
  ES40: [focus(">0"), [], []],
  ES41: [focus("交换原有相邻两条"), focus("外侧顺序"), []],
  ES42: [focus("固定小数偏移", "越过下一个事件"), [], [], []],
  ES43: [[], focus("归属", "真实记录"), focus("先后", "左侧事件先处理")],
  ES44: [focus("同点", "避免重复"), focus("严格未来", "不重入当前位置"), []],
  ES45: [
    focus("高度及两侧关系"),
    focus("真正的活动顺序", "应检查的新邻居"),
    [],
  ],
  ES46: [focus("精确运算"), focus("正确条件", "扫描规则"), []],
  ES47: [[], focus("求交", "清单比较", "高度比较"), focus("数值长度")],
  ES48: [focus("少检查输入对", "不等于", "固定耗时"), [], []],
  ES49: [focus("空、点或完整区间"), focus("判断、行动及其前提"), []],
  ES50: [focus("多份输入在同一点"), [], []],
};

/** Existing diagram gestures pinpoint objects within a longer subtitle phrase. */
export const gestureMarks: Record<string, Record<string, ColorMark[]>> = {
  ES10: { h: focus("H", "x_H", "y_H"), k: focus("K", "x_K", "y_K") },
  ES13: { "record-p": focus("P"), "record-q": focus("Q") },
  ES20: {
    candidate: focus("x_P"),
    current: focus("x_0"),
    difference: focus("f_P"),
  },
  ES31: { height2: focus("y_2(x)"), height1: focus("y_1(x)") },
};

export function activeTeachingMarks(
  id: string,
  activeCaption: number | null,
  target: string | null,
): ColorMark[] {
  if (activeCaption === null) return [];
  return (
    (target && gestureMarks[id]?.[target]) ||
    focusMarks[id]?.[activeCaption] ||
    []
  );
}
