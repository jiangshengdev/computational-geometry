/** Generate chapter-one SVGs with the existing Matplotlib MathText environment.
 * Run in docs-site: uv run --offline --with matplotlib==3.11.2 pnpm exec node scripts/draw_intersection_goals.ts
 * Geometry uses one scale for both axes; input segments are never displaced.
 */
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {palettes, escapeXml as escape, renderMathLabels, type Palette, type SvgMathLabel} from './svg_math_labels.ts';

const output = new URL('../static/img/segment-intersection/what-we-compute/', import.meta.url);

type Point = readonly [number, number];
type Segment = readonly [Point, Point];
const A: Segment = [[0, 0], [4, 0]];
const B: Segment = [[2, 0], [6, 0]];
const C: Segment = [[3, -1], [3, 1]];
const overlap: Segment = [[2, 0], [4, 0]];
const x = (value: number) => 66 + value * 30;
const y = (value: number) => 128 - value * 30;
const labels: SvgMathLabel[] = [];
const images: {target: URL; svg: string}[] = [];
const replacedImages: URL[] = [];
const labelScale = 0.8;

function text(px: number, py: number, value: string, color: string, size = 18, anchor = 'middle') {
  labels.push({px, py, value, color, size: size * labelScale, anchor});
  return `<!--label-${labels.length - 1}-->`;
}

function line(a: Point, b: Point, color: string, width = 2) {
  return `<line x1="${x(a[0])}" y1="${y(a[1])}" x2="${x(b[0])}" y2="${y(b[1])}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function dot(point: Point, color: string, radius = 3) {
  return `<circle cx="${x(point[0])}" cy="${y(point[1])}" r="${radius}" fill="${color}"/>`;
}

function segment(s: Segment, color: string) {
  return line(s[0], s[1], color) + dot(s[0], color) + dot(s[1], color);
}

function coordinate(point: Point, color: string, dx: number, dy: number, anchor = 'middle') {
  if (point[0] === 0 && dx === 0) {
    dx = 12;
    anchor = 'start';
  }
  return text(x(point[0]) + dx * labelScale, y(point[1]) + dy * labelScale, `$(${point.join(',')})$`, color, 22, anchor);
}

function labeledSegment(s: Segment, color: string) {
  const vertical = s[0][0] === s[1][0];
  return segment(s, color) + s.map((point, index) => vertical
    ? coordinate(point, color, 15, point[1] > 0 ? -8 : 30, 'start')
    : coordinate(point, color, 0, point[1] > 0 || (Math.abs(s[1][0] - s[0][0]) <= 2 && index === 0) ? -18 : 38)).join('');
}

function pointInput(p: Point, color: string) {
  const px = x(p[0]), py = y(p[1]);
  return `<path d="M ${px} ${py - 5} l 5 5 -5 5 -5 -5 Z" fill="${color}"/>`;
}

function axes(p: Palette) {
  let svg = line([-1.4, 0], [7.1, 0], p.axis, 1) + line([0, -1.7], [0, 1.8], p.axis, 1);
  for (const n of [-1, 1, 2, 3, 4, 5, 6]) {
    svg += line([n, -.07], [n, .07], p.axis, 1);
  }
  for (const n of [-1, 1]) {
    svg += line([-.07, n], [.07, n], p.axis, 1);
  }
  svg += `<path d="M ${x(7.1) - 6} ${y(0) - 3} L ${x(7.1)} ${y(0)} L ${x(7.1) - 6} ${y(0) + 3} M ${x(0) - 3} ${y(1.8) + 6} L ${x(0)} ${y(1.8)} L ${x(0) + 3} ${y(1.8) + 6}" fill="none" stroke="${p.axis}" stroke-width="1"/>`;
  svg += text(x(0) - 13 * labelScale, y(0) + 22 * labelScale, '$O$', p.axis, 18);
  return svg + text(x(7.1) + 9 * labelScale, y(0) + 5 * labelScale, '$x$', p.axis, 21)
    + text(x(0), y(1.8) - 9 * labelScale, '$y$', p.axis, 21);
}

function panel(p: Palette, drawing: string, label: string, summary = '') {
  return text(155, y(0) - 96 * labelScale, label, p.text, 26) + axes(p) + drawing
    + (summary ? text(155, y(0) + 104 * labelScale, summary, p.text, 23) : '');
}

function save(name: string, theme: string, p: Palette, title: string, panels: string[]) {
  const themeOutput = new URL(`${theme}/`, output);
  panels.forEach((content, index) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260" viewBox="0 0 320 260" role="img" aria-labelledby="title">
<title id="title">${escape(title)} 子图 ${index + 1}。</title>
<rect width="320" height="260" fill="${p.background}"/>
<g>${content}</g>
</svg>\n`;
    images.push({target: new URL(`intersection-goals-${name}-${index + 1}-${theme}.svg`, themeOutput), svg});
  });
  replacedImages.push(new URL(`intersection-goals-${name}-${theme}.svg`, themeOutput));
}

for (const [theme, p] of Object.entries(palettes)) {
  save('identity', theme, p, '三份输入分别显示在相同的几何位置；所有小图坐标尺度相同。', [
    panel(p, labeledSegment(A, p.a), '$S_1$', '$(0,0) \\to (4,0)$'),
    panel(p, labeledSegment(A, p.b), '$S_2$', '$(0,0) \\to (4,0)$'),
    panel(p, labeledSegment(A, p.result), '$S_3$', '$(4,0) \\to (0,0)$'),
  ]);

  const examples: {name: string; title: string; other: Segment; result: Point | Segment | null}[] = [
    {name: 'empty', title: '不相交', other: [[0, 1], [4, 1]], result: null},
    {name: 'crossing', title: '内部交叉', other: [[2, -1], [2, 1]], result: [2, 0]},
    {name: 'touch', title: '端点接触', other: [[4, 0], [6, 0]], result: [4, 0]},
    {name: 'overlap', title: '区间重叠', other: B, result: overlap},
    {name: 'point-on', title: '点输入在线段上', other: [[2, 0], [2, 0]], result: [2, 0]},
    {name: 'point-off', title: '点输入在线段外', other: [[5, 0], [5, 0]], result: null},
  ];
  for (const item of examples) {
    const isPoint = item.other[0][0] === item.other[1][0] && item.other[0][1] === item.other[1][1];
    let result = text(155, 94, '$\\varnothing$', p.result, 30);
    if (item.result !== null) {
      result = typeof item.result[0] === 'number'
        ? dot(item.result as Point, p.result, 4) + coordinate(item.result as Point, p.result, 0, 38)
        : labeledSegment(item.result as Segment, p.result);
    }
    save(item.name, theme, p, `${item.title}：分别展示输入和完整交集，所有小图坐标尺度相同。`, [
      panel(p, labeledSegment(A, p.a), '$A$'),
      panel(p, isPoint ? pointInput(item.other[0], p.b) + coordinate(item.other[0], p.b, 0, 38) : labeledSegment(item.other, p.b), '$B$'),
      panel(p, result, '$A\\cap B$'),
    ]);
  }

  save('third-segment', theme, p, '加入 C 前后，A 与 B 的交集始终为从 (2,0) 到 (4,0) 的完整区间。', [
    panel(p, labeledSegment(A, p.a), '$A$'),
    panel(p, labeledSegment(A, p.a) + labeledSegment(C, p.b), '$A,\\ C$'),
    panel(p, labeledSegment(B, p.a), '$B$'),
    panel(p, labeledSegment(B, p.a) + labeledSegment(C, p.b), '$B,\\ C$'),
    panel(p, labeledSegment(overlap, p.result), '$A\\cap B$', '$2\\leq x\\leq4,\\quad y=0$'),
    panel(p, labeledSegment(overlap, p.result), '$A\\cap B$', '$2\\leq x\\leq4,\\quad y=0$'),
  ]);

  const horizontal: Segment = [[-1, 0], [1, 0]];
  const vertical: Segment = [[0, -1], [0, 1]];
  const origin: Point = [0, 0];
  save('three-pairs', theme, p, '横线段、竖线段和原点输入分别展示；同一个原点对应三对不同输入的结果。', [
    panel(p, labeledSegment(horizontal, p.a), '$S_1$'),
    panel(p, labeledSegment(vertical, p.b), '$S_2$'),
    panel(p, pointInput(origin, p.result) + coordinate(origin, p.result, 25, 38, 'start'), '$S_3$'),
    panel(p, segment(horizontal, p.a) + segment(vertical, p.b) + pointInput(origin, p.result), '$S_1,\\ S_2,\\ S_3$', '$O=(0,0)$'),
  ]);
}

// All visible labels are mathematical; prose belongs in the article.
const markup = renderMathLabels(labels);
for (const {target, svg} of images) {
  mkdirSync(new URL('./', target), {recursive: true});
  writeFileSync(target, svg.replace(/<!--label-(\d+)-->/g, (_, index) => markup[Number(index)]));
}
// Remove only the superseded composite outputs after every panel was generated.
for (const target of replacedImages) {
  rmSync(target, {force: true});
}
