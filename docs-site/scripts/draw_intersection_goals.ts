/** Generate chapter-one SVGs without additional drawing dependencies.
 * Run in docs-site: pnpm exec node scripts/draw_intersection_goals.ts
 * Geometry uses one scale for both axes; input segments are never displaced.
 */
import {writeFileSync} from 'node:fs';

type Point = readonly [number, number];
type Segment = readonly [Point, Point];
type Palette = {background: string; text: string; axis: string; a: string; b: string; result: string};
// Match the existing line-equation and shear figures' light/dark colors.
const palettes: Record<string, Palette> = {
  light: {background: '#ffffff', text: '#172033', axis: '#475569', a: '#1d4ed8', b: '#c2410c', result: '#7c3aed'},
  dark: {background: '#1b1b1d', text: '#e3e3e3', axis: '#cbd5e1', a: '#93c5fd', b: '#fdba74', result: '#c4b5fd'},
};
const A: Segment = [[0, 0], [4, 0]];
const B: Segment = [[2, 0], [6, 0]];
const C: Segment = [[3, -1], [3, 1]];
const overlap: Segment = [[2, 0], [4, 0]];
const x = (value: number) => 66 + value * 30;
const y = (value: number) => 128 - value * 30;
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function text(px: number, py: number, value: string, color: string, size = 18, anchor = 'middle') {
  return `<text x="${px}" y="${py}" fill="${color}" font-size="${size}" text-anchor="${anchor}">${escape(value)}</text>`;
}

function line(a: Point, b: Point, color: string, width = 5) {
  return `<line x1="${x(a[0])}" y1="${y(a[1])}" x2="${x(b[0])}" y2="${y(b[1])}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function dot(point: Point, color: string, radius = 4) {
  return `<circle cx="${x(point[0])}" cy="${y(point[1])}" r="${radius}" fill="${color}"/>`;
}

function segment(s: Segment, color: string) {
  return line(s[0], s[1], color) + dot(s[0], color) + dot(s[1], color);
}

function pointInput(p: Point, color: string) {
  const px = x(p[0]), py = y(p[1]);
  return `<path d="M ${px} ${py - 7} l 7 7 -7 7 -7 -7 Z" fill="${color}"/>`;
}

function axes(p: Palette) {
  let svg = line([-1.4, 0], [7.1, 0], p.axis, 1) + line([0, -1.7], [0, 1.8], p.axis, 1);
  for (const n of [-1, 0, 1, 2, 3, 4, 5, 6]) {
    svg += line([n, -.07], [n, .07], p.axis, 1);
    svg += text(x(n), y(0) + 23, String(n), p.axis, 14);
  }
  for (const n of [-1, 1]) {
    svg += line([-.07, n], [.07, n], p.axis, 1);
    svg += text(x(0) - 13, y(n) + 5, String(n), p.axis, 14);
  }
  return svg + text(x(7.3), y(0) + 5, 'x', p.axis, 16) + text(x(0), y(2.1), 'y', p.axis, 16);
}

function panel(p: Palette, title: string, drawing: string, note: string, coordinateAxes = true) {
  return text(155, 32, title, p.text, 20) + (coordinateAxes ? axes(p) : '') + drawing + text(155, 218, note, p.text, 17);
}

function save(name: string, theme: string, p: Palette, title: string, panels: string[], columns = 3) {
  const width = columns * 320, height = Math.ceil(panels.length / columns) * 240;
  const content = panels.map((item, i) => `<g transform="translate(${(i % columns) * 320},${Math.floor(i / columns) * 240})">${item}</g>`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
<title id="title">${escape(title)}</title>
<rect width="${width}" height="${height}" fill="${p.background}"/>
<g font-family="system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif">${content}</g>
</svg>\n`;
  writeFileSync(new URL(`../static/img/intersection-goals-${name}-${theme}.svg`, import.meta.url), svg);
}

for (const [theme, p] of Object.entries(palettes)) {
  save('identity', theme, p, '三份输入分别显示，再显示共同的几何位置；所有小图坐标尺度相同。', [
    panel(p, '输入 1', segment(A, p.a), '(0,0) → (4,0)'),
    panel(p, '输入 2', segment(A, p.b), '(0,0) → (4,0)'),
    panel(p, '输入 3', segment(A, p.result), '(4,0) → (0,0)'),
    panel(p, '共同的几何位置', segment(A, p.text), '位置相同，仍有 3 份输入'),
  ], 2);

  const examples: {name: string; title: string; other: Segment; result: Point | Segment | null; note: string}[] = [
    {name: 'empty', title: '不相交', other: [[0, 1], [4, 1]], result: null, note: '没有公共点'},
    {name: 'crossing', title: '内部交叉', other: [[2, -1], [2, 1]], result: [2, 0], note: '交集是点 (2,0)'},
    {name: 'touch', title: '端点接触', other: [[4, 0], [6, 0]], result: [4, 0], note: '交集是点 (4,0)'},
    {name: 'overlap', title: '区间重叠', other: B, result: overlap, note: '从 (2,0) 到 (4,0)，包含两端'},
    {name: 'point-on', title: '点输入在线段上', other: [[2, 0], [2, 0]], result: [2, 0], note: '交集是点 (2,0)'},
    {name: 'point-off', title: '点输入在线段外', other: [[5, 0], [5, 0]], result: null, note: '没有公共点'},
  ];
  for (const item of examples) {
    const isPoint = item.other[0][0] === item.other[1][0] && item.other[0][1] === item.other[1][1];
    let result = text(155, 93, '空交集', p.result, 23);
    if (item.result !== null) {
      result = typeof item.result[0] === 'number'
        ? dot(item.result as Point, p.result, 6)
        : segment(item.result as Segment, p.result);
    }
    save(item.name, theme, p, `${item.title}：分别展示输入和完整交集，所有小图坐标尺度相同。`, [
      panel(p, '输入 A', segment(A, p.a), '(0,0) 到 (4,0)'),
      panel(p, isPoint ? '另一份输入：一个点' : '另一条输入', isPoint ? pointInput(item.other[0], p.b) : segment(item.other, p.b),
        isPoint ? `(${item.other[0].join(',')})` : `(${item.other[0].join(',')}) 到 (${item.other[1].join(',')})`),
      panel(p, '这对输入的完整交集', result, item.note),
    ]);
  }

  save('third-segment', theme, p, '加入 C 前后，A 与 B 的交集始终为从 (2,0) 到 (4,0) 的完整区间。', [
    panel(p, '加入 C 前：输入 A', segment(A, p.a), '(0,0) 到 (4,0)'),
    panel(p, '加入 C 后：输入 A 与 C', segment(A, p.a) + segment(C, p.b), 'C：x = 3，−1 ≤ y ≤ 1'),
    panel(p, '加入 C 前：输入 B', segment(B, p.a), '(2,0) 到 (6,0)'),
    panel(p, '加入 C 后：输入 B 与 C', segment(B, p.a) + segment(C, p.b), 'C：x = 3，−1 ≤ y ≤ 1'),
    panel(p, '加入 C 前：A、B 的交集', segment(overlap, p.result), '(2,0) 到 (4,0)'),
    panel(p, '加入 C 后：A、B 的交集', segment(overlap, p.result), '仍然完整，不在 x = 3 处切开'),
  ], 2);

  const horizontal: Segment = [[-1, 0], [1, 0]];
  const vertical: Segment = [[0, -1], [0, 1]];
  const origin: Point = [0, 0];
  save('three-pairs', theme, p, '横线段、竖线段和原点输入分别展示；同一个原点对应三对不同输入的结果。', [
    panel(p, '输入 1：水平线段', segment(horizontal, p.a), '(−1,0) 到 (1,0)'),
    panel(p, '输入 2：竖直线段', segment(vertical, p.b), '(0,−1) 到 (0,1)'),
    panel(p, '输入 3：只有原点', pointInput(origin, p.result), '(0,0)'),
    panel(p, '放回同一坐标系', segment(horizontal, p.a) + segment(vertical, p.b) + pointInput(origin, p.result), '三份输入都包含原点'),
    panel(p, '公共位置', dot(origin, p.result, 6), '只有一个几何位置：(0,0)'),
    panel(p, '按输入对保留结果',
      text(155, 90, '1 与 2 → 点 (0,0)', p.text) + text(155, 128, '1 与 3 → 点 (0,0)', p.text) + text(155, 166, '2 与 3 → 点 (0,0)', p.text),
      '3 对输入，3 条结果', false),
  ]);
}
