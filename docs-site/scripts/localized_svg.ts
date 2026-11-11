import {mkdirSync, writeFileSync} from 'node:fs';

// Figure geometry and MathText are generated once. Only the accessible title is
// localized; visible explanations live in each language's article and captions.
const titles: Record<string, string> = {
  '三份输入分别显示在相同的几何位置；所有小图坐标尺度相同。': 'The three inputs are shown separately at the same geometric position; every panel uses the same coordinate scale.',
  '加入 C 前后，A 与 B 的交集始终为从 (2,0) 到 (4,0) 的完整区间。': 'Before and after adding C, the intersection of A and B remains the complete interval from (2,0) to (4,0).',
  '横线段、竖线段和原点输入分别展示；同一个原点对应三对不同输入的结果。': 'The horizontal segment, vertical segment, and point input at the origin are shown separately; the same origin is the result for three distinct input pairs.',
  'A 结束、B 开始，共享闭端点 P。': 'A ends and B begins at the shared, included endpoint P.',
  'B 的起点 P 严格位于 C 内部。': 'The start point P of B lies strictly inside C.',
  'A 结束、B 开始、C 与 D 严格穿过同一位置 P。': 'A ends, B begins, and C and D pass through the same position P in their interiors.',
  '点输入 Z_1 位于 C 内部的 P，没有移开其坐标。': 'Point input Z_1 is at P inside C, without displacing its coordinates.',
  '另一份点输入 Z_2 也位于 C 内部的同一坐标 P。': 'A separate point input Z_2 is also at the same coordinate P inside C.',
  'P 左侧只显示旧成员，从下到上的顺序为 D、A、C。': 'Only the old members are shown to the left of P; their bottom-to-top order is D, A, C.',
  'P 右侧只显示新成员，从下到上的顺序为 C、B、D。': 'Only the new members are shown to the right of P; their bottom-to-top order is C, B, D.',
  'x=0：只有 F 提供水平覆盖，最远右端为 2，候选不被覆盖。': 'At x=0, only F provides horizontal coverage, whose rightmost endpoint is 2; the candidate is not covered.',
  'x=1：G 加入后水平覆盖延长到 7，必须补检同一邻组。': 'At x=1, adding G extends horizontal coverage to 7, so the same neighboring group must be checked again.',
  'I 与 J 在原位分离；空隙中的 W 只与 K 相交。': 'I and J remain separated at their original positions; W in the gap intersects only K.',
  '四份原始输入；P、Q 同列，R 在右方。': 'The four original inputs: P and Q have the same x coordinate, and R is to their right.',
  'P 前：低处与高处均未处理。': 'Before P: neither the lower nor the upper position has been processed.',
  'P 后、Q 前：低处已更新，高处仍保留原状态。': 'After P and before Q: the lower position has been updated, while the upper position retains its old state.',
  'Q 后：新邻居 S0、S3 发现 R。': 'After Q: the new neighbors S0 and S3 discover R.',
  'R 后：S3、S0 已换序，外侧成员不变。': 'After R: S3 and S0 have exchanged order; the outside members are unchanged.',
  '主案例的四条输入线段，尚未标注交点。': 'The four input segments in the main example, before intersections are marked.',
  '从 2 到 10，全程 8，走过四分之一即 2，到达 4。': 'From 2 to 10, the full distance is 8; moving one quarter of it, or 2, reaches 4.',
  '从 u 到 v，全程 v-u，走过比例 t 时到达 u+t(v-u)。示意位置不限定横坐标的正负。': 'From u to v, the full distance is v-u; moving a fraction t reaches u+t(v-u). The positions in the diagram do not restrict the signs of the x coordinates.',
  '反证假设推出三线共点的矛盾；这不是本章允许的输入。': 'The assumption for contradiction implies that three lines share a point, contradicting this chapter\'s allowed inputs.',
  '暂时假设 W 在 r 处夹在 U、V 中间，只画出 W 在 r 附近的部分；尚未假定其在 p 处的高度。': 'Temporarily assume that W lies between U and V at r. Only the part of W near r is drawn; its height at p has not been assumed.',
  '由反证假设推得：在 s 形成邻接并检查 U_*、V_*，发现并登记未来位置 p_*；箭头不表示立即跳到 p_*。': 'The assumption for contradiction implies that U_* and V_* become neighbors and are checked at s, discovering and scheduling the future position p_*. The arrow does not mean an immediate jump to p_*.',
  '由反证假设推得：已登记的真实未来交点一直保留，扫描按位置到达 p_* 并报告，与漏点假设矛盾。': 'The assumption for contradiction implies that the scheduled real future intersection is retained. The sweep reaches p_* in position order and reports it, contradicting the assumption that it was missed.',
};

const intersectionKinds: Record<string, string> = {
  '不相交': 'No intersection',
  '内部交叉': 'Interior crossing',
  '端点接触': 'Endpoint contact',
  '区间重叠': 'Overlapping interval',
  '点输入在线段上': 'Point input on the segment',
  '点输入在线段外': 'Point input outside the segment',
};

function englishTitle(source: string): string {
  if (titles[source]) return titles[source];
  const panel = /^(.*) 子图 (\d+)。$/.exec(source);
  if (panel) return `${englishTitle(panel[1])} Panel ${panel[2]}.`;
  const intersection = /^(.*)：分别展示输入和完整交集，所有小图坐标尺度相同。$/.exec(source);
  if (intersection && intersectionKinds[intersection[1]]) {
    return `${intersectionKinds[intersection[1]]}: the inputs and their complete intersection are shown separately; every panel uses the same coordinate scale.`;
  }
  const original = /^([ABC]) 在 y=0 上的原始位置。$/.exec(source);
  if (original) return `The original position of ${original[1]} on y=0.`;
  const crossing = /^([AB])、D 与点输入 Z 共同包含 P=\(5,0\)。$/.exec(source);
  if (crossing) return `${crossing[1]}, D, and point input Z all contain P=(5,0).`;
  const order = /^处理横坐标 (\d+) 的事件后，活动顺序从下到上为 (.*)。$/.exec(source);
  if (order) return `After processing the event at x=${order[1]}, the bottom-to-top active order is ${order[2]}.`;
  const height = /^固定按 C 减 A，在 x=(\d+) 处的高度差为 (-?\d+)。$/.exec(source);
  if (height) return `Always subtracting A from C, the height difference at x=${height[1]} is ${height[2]}.`;
  throw new Error(`Missing English figure title: ${source}`);
}

function localizedTitles(source: string): {en: string; zh: string} {
  const vertical = /^(main|overlap|points), panel (\d+), (original coordinates|visual shear only: s_vis=1\/2)$/.exec(source);
  if (vertical) {
    const topic = {main: ['Main example', '主案例'], overlap: ['Overlapping inputs', '重叠输入'], points: ['Point inputs', '点输入']}[vertical[1]]!;
    const transformed = vertical[3] !== 'original coordinates';
    return {
      en: `${topic[0]}, panel ${vertical[2]}: ${transformed ? 'visual shear only, s_vis=1/2' : 'original coordinates'}.`,
      zh: `${topic[1]}，子图 ${vertical[2]}：${transformed ? '仅用于放大示意的剪切，s_vis=1/2' : '原始坐标'}。`,
    };
  }
  return {en: englishTitle(source), zh: source};
}

/** The existing generators call this after rendering shared mathematical labels. */
export function writeLocalizedSvg(target: URL, svg: string): void {
  const match = /<title id="title">([^<]*)<\/title>/.exec(svg);
  if (!match) throw new Error(`Missing accessible SVG title: ${target.pathname}`);
  const localized = localizedTitles(match[1]);
  for (const [locale, title] of Object.entries(localized)) {
    const destination = locale === 'en' ? target : new URL(target.href.replace('/static/img/', '/static/img/zh-Hans/'));
    if (destination.href === target.href && locale !== 'en') throw new Error('Unexpected figure output path');
    mkdirSync(new URL('./', destination), {recursive: true});
    const escaped = title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    writeFileSync(destination, svg.replace(match[0], `<title id="title">${escaped}</title>`)
      .replace('<svg ', `<svg xml:lang="${locale === 'en' ? 'en' : 'zh-Hans'}" `));
  }
}
