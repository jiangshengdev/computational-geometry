/** Chapter-five teaching diagrams, not execution traces.
 * MATHTEXT_PYTHON=/path/to/existing/python pnpm exec node scripts/draw_overlapping_segments.ts
 * Reuses the article MathText renderer and shared light/dark palettes.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {escapeXml, palettes, renderMathLabels, type SvgMathLabel} from './svg_math_labels.ts';

type Point = readonly [number, number];
type Segment = {id: string; from: Point; to: Point; color: 'blue' | 'orange' | 'violet' | 'emerald'; label: Point};
type Frame = {
  name: string; index: number; title: string; heading: string; summary: string;
  segments: readonly Segment[];
  eventX?: number;
  mark?: {point: Point; label: string; at: Point; pointInput?: string};
};

const A: Segment = {id: 'A', from: [0, 0], to: [6, 0], color: 'blue', label: [3, 0.9]};
const B: Segment = {id: 'B', from: [2, 0], to: [8, 0], color: 'orange', label: [6.5, 0.9]};
const C: Segment = {id: 'C', from: [3, 0], to: [4, 0], color: 'violet', label: [3.5, 0.9]};
const D: Segment = {id: 'D', from: [1, -4], to: [9, 4], color: 'emerald', label: [8.3, 2]};
const F: Segment = {id: 'F', from: [0, 0], to: [2, 0], color: 'blue', label: [1, 0.9]};
const G: Segment = {id: 'G', from: [1, 0], to: [7, 0], color: 'orange', label: [6, 0.9]};
const H: Segment = {id: 'H', from: [-1, 5], to: [6, -2], color: 'emerald', label: [1.6, 3.5]};
const frames: readonly Frame[] = [
  ...[A, B, C].map((segment, i): Frame => ({
    name: 'members', index: i + 1, title: `${segment.id} 在 y=0 上的原始位置。`,
    heading: String.raw`${segment.id}\;\in\;G_0`, summary: String.raw`${segment.from[0]}\leq x\leq${segment.to[0]}`,
    segments: [segment],
  })),
  ...[A, B].map((segment, i): Frame => ({
    name: 'crossing', index: i + 1, title: `${segment.id}、D 与点输入 Z 共同包含 P=(5,0)。`,
    heading: `${segment.id},D,Z`, summary: 'P=(5,0)', segments: [segment, D], eventX: 5,
    mark: {point: [5, 0], label: 'P', at: [4.3, -1], pointInput: 'Z'},
  })),
  {name: 'extension', index: 1, title: 'x=0：只有 F 提供水平覆盖，最远右端为 2，候选不被覆盖。',
    heading: 'x=0', summary: 'R_{G_2}=2<4', segments: [F, H], eventX: 0,
    mark: {point: [4, 0], label: 'Q_1', at: [4.8, 0.9]}},
  {name: 'extension', index: 2, title: 'x=1：G 加入后水平覆盖延长到 7，必须补检同一邻组。',
    heading: 'x=1', summary: String.raw`4\leq R_{G_2}=7`, segments: [G, H], eventX: 1,
    mark: {point: [4, 0], label: 'Q_1', at: [4.8, 0.9]}},
  {name: 'gap', index: 1, title: 'I 与 J 在原位分离；空隙中的 W 只与 K 相交。',
    heading: '1<x<3', summary: 'Q_2=(2,0)', segments: [
      {id: 'I', from: [0, 0], to: [1, 0], color: 'blue', label: [0.5, 0.9]},
      {id: 'J', from: [3, 0], to: [7, 0], color: 'orange', label: [5, 0.9]},
      {id: 'K', from: [-1, 3], to: [6, -4], color: 'emerald', label: [4.7, -2]},
    ], eventX: 2, mark: {point: [2, 0], label: 'Q_2', at: [2.9, 0.9], pointInput: 'W'}},
];

// One equal-unit coordinate system for all panels; per-case labels stay in data.
const project = ([x, y]: Point): Point => [73 + 21 * x, 151 - 21 * y];
const labels: SvgMathLabel[] = [];
const images: {target: URL; svg: string}[] = [];
for (const [theme, p] of Object.entries(palettes)) {
  for (const frame of frames) {
    const shapes: string[] = [];
    const label = (at: Point, value: string, color = p.text, size = 16) => {
      labels.push({px: at[0], py: at[1], value: `$${value}$`, color, size, anchor: 'middle', background: p.background});
      shapes.push(`<!--label-${labels.length - 1}-->`);
    };
    const line = (from: Point, to: Point, color: string, dashed = false) => {
      const a = project(from), b = project(to);
      shapes.push(`<path d="M ${a.join(' ')} L ${b.join(' ')}" fill="none" stroke="${color}" stroke-width="${color === p.axis ? 0.8 : 1.5}"${dashed ? ' stroke-dasharray="4 4"' : ''}/>`);
    };
    line([-1.8, 0], [10.3, 0], p.axis);
    line([0, -4.3], [0, 5.5], p.axis);
    const [ax, ay] = project([10.3, 0]);
    const [bx, by] = project([0, 5.5]);
    shapes.push(`<path d="M ${ax-5} ${ay-3} L ${ax} ${ay} L ${ax-5} ${ay+3} M ${bx-3} ${by+5} L ${bx} ${by} L ${bx+3} ${by+5}" fill="none" stroke="${p.axis}"/>`);
    for (let n = -1; n <= 10; n++) if (n !== 0) line([n, -0.1], [n, 0.1], p.axis);
    for (let n = -4; n <= 5; n++) if (n !== 0) line([-0.1, n], [0.1, n], p.axis);
    label([60, 170], 'O', p.axis);
    label([302, 156], 'x', p.axis);
    label([73, 24], 'y', p.axis);
    label([192, 23], frame.heading, p.text, 18);
    if (frame.eventX !== undefined) line([frame.eventX, -4.3], [frame.eventX, 5.3], p.axis, true);
    for (const segment of frame.segments) {
      const color = p[segment.color];
      line(segment.from, segment.to, color);
      for (const point of [segment.from, segment.to]) {
        const [cx, cy] = project(point);
        shapes.push(`<circle cx="${cx}" cy="${cy}" r="2.5" fill="${color}"/>`);
      }
      label(project(segment.label), segment.id, color);
      // Label horizontal endpoints to make each coverage boundary readable.
      if (segment.from[1] === 0 && segment.to[1] === 0) {
        for (const point of [segment.from, segment.to]) {
          if (point[0] !== 0) label(project([point[0], -0.85]), String(point[0]), p.axis, 14);
        }
      }
    }
    if (frame.mark) {
      const {point, at, pointInput} = frame.mark;
      const [cx, cy] = project(point);
      shapes.push(pointInput
        ? `<path d="M ${cx} ${cy-5} l 5 5 -5 5 -5 -5 Z" fill="${p.background}" stroke="${p.text}" stroke-width="1.2"/>`
        : `<circle cx="${cx}" cy="${cy}" r="4" fill="${p.background}" stroke="${p.text}" stroke-width="1.2"/>`);
      label(project(at), frame.mark.label);
      if (pointInput) label(project([point[0]-0.65, point[1]+1.1]), pointInput);
    }
    label([180, 256], frame.summary, p.text, 17);
    images.push({
      target: new URL(`../static/img/segment-intersection/overlapping-segments/${theme}/overlap-${frame.name}-${frame.index}-${theme}.svg`, import.meta.url),
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260" viewBox="0 0 320 260" role="img" aria-labelledby="title"><title id="title">${escapeXml(frame.title)}</title><rect width="320" height="260" fill="${p.background}"/>${shapes.join('')}</svg>\n`,
    });
  }
}
const markup = renderMathLabels(labels);
for (const {target, svg} of images) {
  mkdirSync(new URL('./', target), {recursive: true});
  writeFileSync(target, svg.replace(/<!--label-(\d+)-->/g, (_, index) => markup[Number(index)]));
}
