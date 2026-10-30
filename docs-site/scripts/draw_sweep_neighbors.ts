/** Generate fixed-size chapter-two panels. Run with pnpm exec node and the
 * maintainer-provisioned MATHTEXT_PYTHON, as for draw_intersection_goals.ts.
 * These are authored teaching states, not algorithm execution traces.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {palettes, escapeXml, renderMathLabels, type SvgMathLabel} from './svg_math_labels.ts';

type Point = readonly [number, number];
type Segment = {id: string; a: Point; b: Point; color: string};
type Frame = {name: string; x: number | null; order: string; known: readonly string[]; reported: readonly string[]};
const frames: Frame[] = [
  {name: 'input', x: null, order: '', known: [], reported: []},
  {name: 'start', x: 2, order: 'A,B,C', known: [], reported: []},
  {name: 'end', x: 3, order: 'A,C', known: ['P'], reported: []},
  {name: 'insert', x: 4, order: 'D,A,C', known: ['P', 'Q'], reported: []},
  {name: 'cross', x: 5, order: 'A,D,C', known: ['P', 'Q', 'R'], reported: ['Q']},
  {name: 'next', x: 6, order: 'A,C,D', known: ['P', 'Q', 'R'], reported: ['Q', 'R']},
  {name: 'last', x: 7, order: 'C,A,D', known: ['P', 'Q', 'R'], reported: ['Q', 'R', 'P']},
];
const intersections: Record<string, {point: Point; offset: Point}> = {
  P: {point: [7, 1], offset: [22, -8]},
  Q: {point: [5, 1], offset: [-18, -9]},
  R: {point: [6, 2], offset: [0, -22]},
};
const labels: SvgMathLabel[] = [];
const images: {target: URL; svg: string}[] = [];
const x = (value: number) => 55 + value * 22;
const y = (value: number) => 188 - value * 22;
function line(a: Point, b: Point, color: string, width = 1, dashed = false) {
  return `<line x1="${x(a[0])}" y1="${y(a[1])}" x2="${x(b[0])}" y2="${y(b[1])}" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="4 4"' : ''}/>`;
}

for (const [theme, p] of Object.entries(palettes)) {
  function text(px: number, py: number, value: string, color: string, size = 15) {
    labels.push({px, py, value, color, size, anchor: 'middle', background: p.background});
    return `<!--label-${labels.length - 1}-->`;
  }
  const segments: Segment[] = [
    {id: 'A', a: [0, 1], b: [10, 1], color: p.a},
    {id: 'B', a: [1, 3], b: [3, 3], color: p.b},
    {id: 'C', a: [2, 6], b: [9, -1], color: p.result},
    {id: 'D', a: [4, 0], b: [8, 4], color: p.emerald},
  ];
  for (const frame of frames) {
    let svg = line([-1, 0], [11, 0], p.axis) + line([0, -1.5], [0, 7], p.axis);
    svg += `<path d="M ${x(11) - 5} ${y(0) - 3} L ${x(11)} ${y(0)} L ${x(11) - 5} ${y(0) + 3} M ${x(0) - 3} ${y(7) + 5} L ${x(0)} ${y(7)} L ${x(0) + 3} ${y(7) + 5}" fill="none" stroke="${p.axis}"/>`;
    for (let n = 1; n <= 10; n++) svg += line([n, -.09], [n, .09], p.axis);
    for (let n = -1; n <= 6; n++) if (n !== 0) svg += line([-.09, n], [.09, n], p.axis);
    svg += text(x(0) - 12, y(0) + 17, '$O$', p.axis)
      + text(x(11) + 10, y(0) + 4, '$x$', p.axis)
      + text(x(0), y(7) - 8, '$y$', p.axis);
    for (const s of segments) {
      const active = frame.x === null || (s.a[0] <= frame.x && frame.x < s.b[0]);
      svg += `<g opacity="${active ? 1 : .3}">${line(s.a, s.b, s.color, 2.5)}`;
      for (const point of [s.a, s.b]) svg += `<circle cx="${x(point[0])}" cy="${y(point[1])}" r="2.5" fill="${s.color}"/>`;
      svg += '</g>';
    }
    if (frame.x !== null) svg += line([frame.x, -1.5], [frame.x, 7], p.axis, 1.2, true);
    // Labels stay legible even when their segment is not active.
    svg += text(x(10) + 13, y(1) + 5, '$A$', p.a)
      + text(x(2), y(3) - 9, '$B$', p.b)
      + text(x(2) - 12, y(6) - 6, '$C$', p.result)
      + text(x(8) + 13, y(4) + 4, '$D$', segments[3].color);
    for (const id of frame.known) {
      const {point, offset} = intersections[id];
      svg += `<circle cx="${x(point[0])}" cy="${y(point[1])}" r="3.8" fill="${frame.reported.includes(id) ? p.text : p.background}" stroke="${p.text}" stroke-width="1.2"/>`;
      svg += text(x(point[0]) + offset[0], y(point[1]) + offset[1], `$${id}$`, p.text);
    }
    svg += text(170, 24, frame.x === null ? '$A, B, C, D$' : `$x=${frame.x}$`, p.text, 17);
    if (frame.order) svg += text(170, 252, `$${frame.order.replaceAll(',', '\\,,\\,')}$`, p.text, 15);
    const title = frame.x === null ? '主案例的四条输入线段，尚未标注交点。' : `处理横坐标 ${frame.x} 的事件后，活动顺序从下到上为 ${frame.order}。`;
    images.push({
      target: new URL(`../static/img/segment-intersection/why-neighbors/${theme}/sweep-neighbors-${frame.name}-1-${theme}.svg`, import.meta.url),
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260" viewBox="0 0 320 260" role="img" aria-labelledby="title"><title id="title">${escapeXml(title)}</title><rect width="320" height="260" fill="${p.background}"/>${svg}</svg>\n`,
    });
  }
}
const markup = renderMathLabels(labels);
for (const {target, svg} of images) {
  mkdirSync(new URL('./', target), {recursive: true});
  writeFileSync(target, svg.replace(/<!--label-(\d+)-->/g, (_, index) => markup[Number(index)]));
}
