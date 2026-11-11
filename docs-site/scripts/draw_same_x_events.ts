import {writeLocalizedSvg} from './localized_svg.ts';
/** Chapter-six teaching diagrams, not execution traces.
 * MATHTEXT_PYTHON=/path/to/existing/python pnpm exec node scripts/draw_same_x_events.ts
 */
import {escapeXml, palettes, renderMathLabels, type SvgMathLabel} from './svg_math_labels.ts';

type Point = readonly [number, number];
const segments = [
  {id: 'S_0', slope: 1, intercept: -2, color: 'blue'},
  {id: 'S_1', slope: -1, intercept: -2, color: 'orange'},
  {id: 'S_2', slope: 1, intercept: 2, color: 'violet'},
  {id: 'S_3', slope: -1, intercept: 2, color: 'emerald'},
] as const;
type Frame = {name: string; index: number; number: number; order?: readonly number[]; afterLow?: boolean; afterHigh?: boolean; later?: boolean; title: string};
const frames: readonly Frame[] = [
  {name: 'input', index: 1, number: 0, title: '四份原始输入；P、Q 同列，R 在右方。'},
  {name: 'stages', index: 1, number: 1, order: [0, 1, 2, 3], title: 'P 前：低处与高处均未处理。'},
  {name: 'stages', index: 2, number: 2, order: [1, 0, 2, 3], afterLow: true, title: 'P 后、Q 前：低处已更新，高处仍保留原状态。'},
  {name: 'stages', index: 3, number: 3, order: [1, 0, 3, 2], afterLow: true, afterHigh: true, title: 'Q 后：新邻居 S0、S3 发现 R。'},
  {name: 'later', index: 1, number: 4, order: [1, 3, 0, 2], later: true, title: 'R 后：S3、S0 已换序，外侧成员不变。'},
];
const labels: SvgMathLabel[] = [];
const images: {target: URL; svg: string}[] = [];
for (const [theme, p] of Object.entries(palettes)) {
  for (const frame of frames) {
    const parts: string[] = [];
    const scale = frame.name === 'stages' ? 28 : 19;
    const project = ([x, y]: Point): Point => [frame.order ? 78 + scale * x : 120 + scale * x, 132 - scale * y];
    const label = (at: Point, value: string, color = p.text, size = 16) => {
      labels.push({px: at[0], py: at[1], value: `$${value}$`, color, size, anchor: 'middle', background: p.background});
      parts.push(`<!--label-${labels.length - 1}-->`);
    };
    const line = (a: Point, b: Point, color: string, dashed = false, width = 1.5) => {
      parts.push(`<path d="M ${a.join(' ')} L ${b.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="4 4"' : ''}/>`);
    };
    const yLimit = frame.name === 'stages' ? 3.5 : 5.5;
    const xLimit = frame.name === 'stages' ? 1.6 : 3.8;
    line(project([-1.5, 0]), project([xLimit, 0]), p.axis, false, 0.8);
    line(project([0, -yLimit]), project([0, yLimit]), p.axis, false, 0.8);
    const [ax, ay] = project([xLimit, 0]), [bx, by] = project([0, yLimit]);
    parts.push(`<path d="M ${ax-5} ${ay-3} L ${ax} ${ay} L ${ax-5} ${ay+3} M ${bx-3} ${by+5} L ${bx} ${by} L ${bx+3} ${by+5}" fill="none" stroke="${p.axis}"/>`);
    for (let n = -1; n < xLimit; n++) if (n) line(project([n, -0.1]), project([n, 0.1]), p.axis, false, 0.8);
    for (let n = Math.ceil(-yLimit); n < yLimit; n++) if (n) line(project([-0.1, n]), project([0.1, n]), p.axis, false, 0.8);
    label([project([0, 0])[0] - 12, 149], 'O', p.axis, 14);
    label([ax + 10, ay + 5], 'x', p.axis, 14);
    label([bx, by - 8], 'y', p.axis, 14);
    label([25, 24], `(${frame.number})`);
    for (const [i, s] of segments.entries()) {
      const after = i < 2 ? frame.afterLow : frame.afterHigh;
      const from = frame.later ? 2 : frame.order ? (after ? 0 : -0.9) : -1;
      const to = frame.later ? 2.65 : frame.order ? (after ? 0.9 : 0) : 3;
      const a: Point = [from, s.slope * from + s.intercept];
      const b: Point = [to, s.slope * to + s.intercept];
      line(project(a), project(b), p[s.color]);
      if (!frame.order) {
        for (const pt of [a, b]) {
          const [cx, cy] = project(pt);
          parts.push(`<circle cx="${cx}" cy="${cy}" r="2.5" fill="${p[s.color]}"/>`);
        }
        label([project(b)[0]+26, project(b)[1]+5], s.id, p[s.color]);
      } else {
        const end = after || frame.later ? b : a;
        label([project(end)[0] + (after || frame.later ? 18 : -18), project(end)[1]+5], s.id, p[s.color], 14);
      }
    }
    const points: readonly {at: Point; id: string; offset: Point}[] = frame.later
      ? [{at: [2, 0], id: 'R', offset: [-10, -10]}]
      : [{at: [0, -2], id: 'P', offset: [0, 22]}, {at: [0, 2], id: 'Q', offset: [0, -12]},
        ...(!frame.order ? [{at: [2, 0] as Point, id: 'R', offset: [0, -12] as Point}] : [])];
    for (const {at, id, offset} of points) {
      const [cx, cy] = project(at);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="3" fill="${p.text}"/>`);
      label([cx+offset[0], cy+offset[1]], id);
    }
    if (frame.order) {
      // The right rail is a separate ordinal diagram, not a second coordinate axis.
      line([258, 218], [258, 52], p.axis, false, 0.8);
      line([258, 52], [254, 59], p.axis, false, 0.8);
      line([258, 52], [262, 59], p.axis, false, 0.8);
      for (const [rank, id] of frame.order.entries()) {
        const s = segments[id];
        label([235, 206-rank*44], s.id, p[s.color], 18);
      }
      if (frame.afterHigh) {
        parts.push(`<path d="M 272 111 h 7 v 59 h -7" fill="none" stroke="${p.text}"/>`);
        label([294, 145], 'R', p.text, 16);
      }
    }
    images.push({target: new URL(`../static/img/segment-intersection/same-x-events/${theme}/same-x-${frame.name}-${frame.index}-${theme}.svg`, import.meta.url),
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260" viewBox="0 0 320 260" role="img" aria-labelledby="title"><title id="title">${escapeXml(frame.title)}</title><rect width="320" height="260" fill="${p.background}"/>${parts.join('')}</svg>\n`});
  }
}
const markup = renderMathLabels(labels);
for (const {target, svg} of images) {
  writeLocalizedSvg(target, svg.replace(/<!--label-(\d+)-->/g, (_, index) => markup[Number(index)]));
}
