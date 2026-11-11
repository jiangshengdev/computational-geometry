import {writeLocalizedSvg} from './localized_svg.ts';
/** Authored chapter-four diagrams, not algorithm execution traces.
 * Run in docs-site with the existing MathText environment:
 * MATHTEXT_PYTHON=/path/to/existing/python pnpm exec node scripts/draw_same_point_events.ts
 */
import {escapeXml, palettes, renderMathLabels, type SvgMathLabel} from './svg_math_labels.ts';

type Point = readonly [number, number];
type SegmentId = 'A' | 'B' | 'C' | 'D';
type Segment = {start: Point; end: Point; label: Point; palette: 'blue' | 'orange' | 'violet' | 'emerald'};
type Frame = {
  name: string;
  index: number;
  segments: readonly SegmentId[];
  title: string;
  heading: string;
  summary: string;
  side?: 'before' | 'after';
  pointInput?: 'Z_1' | 'Z_2';
};

const meeting: Point = [4, 4];
const segments: Record<SegmentId, Segment> = {
  A: {start: [0, 4], end: meeting, label: [84, 137], palette: 'blue'},
  B: {start: meeting, end: [8, 8], label: [231, 71], palette: 'orange'},
  C: {start: [1, 7], end: [9, -1], label: [84, 80], palette: 'violet'},
  D: {start: [2, 0], end: [7, 10], label: [213, 45], palette: 'emerald'},
};
const frames: readonly Frame[] = [
  {name: 'endpoint', index: 1, segments: ['A', 'B'], title: 'A 结束、B 开始，共享闭端点 P。', heading: 'A,B', summary: 'P=(4,4)'},
  {name: 'interior', index: 1, segments: ['B', 'C'], title: 'B 的起点 P 严格位于 C 内部。', heading: 'B,C', summary: 'P=(4,4)'},
  {name: 'meeting', index: 1, segments: ['A', 'B', 'C', 'D'], title: 'A 结束、B 开始、C 与 D 严格穿过同一位置 P。', heading: 'A,B,C,D', summary: 'P=(4,4)'},
  {name: 'points', index: 1, segments: ['C'], pointInput: 'Z_1', title: '点输入 Z_1 位于 C 内部的 P，没有移开其坐标。', heading: 'C,Z_1', summary: 'Z_1=P=(4,4)'},
  {name: 'points', index: 2, segments: ['C'], pointInput: 'Z_2', title: '另一份点输入 Z_2 也位于 C 内部的同一坐标 P。', heading: 'C,Z_2', summary: 'Z_2=P=(4,4)'},
  {name: 'order', index: 1, segments: ['A', 'C', 'D'], side: 'before', title: 'P 左侧只显示旧成员，从下到上的顺序为 D、A、C。', heading: 'x<4', summary: 'D,A,C'},
  {name: 'order', index: 2, segments: ['B', 'C', 'D'], side: 'after', title: 'P 右侧只显示新成员，从下到上的顺序为 C、B、D。', heading: 'x>4', summary: 'C,B,D'},
];
// Equal scales on both axes; all panels retain the same origin and bounds.
const project = ([x, y]: Point): Point => [68 + 18 * x, 218 - 18 * y];
const labels: SvgMathLabel[] = [];
const images: {target: URL; svg: string}[] = [];

for (const [theme, palette] of Object.entries(palettes)) {
  for (const frame of frames) {
    const parts: string[] = [];
    const line = (from: Point, to: Point, color: string, width = 1, dashed = false) => {
      parts.push(`<line x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="4 4"' : ''}/>`);
    };
    const label = (at: Point, formula: string, color = palette.text, size = 16) => {
      labels.push({px: at[0], py: at[1], value: `$${formula}$`, color, size, anchor: 'middle', background: palette.background});
      parts.push(`<!--label-${labels.length - 1}-->`);
    };
    const dot = (point: Point, color: string) => {
      const [cx, cy] = project(point);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="2.7" fill="${color}"/>`);
    };
    const arrow = (from: Point, to: Point) => {
      line(from, to, palette.axis);
      const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
      for (const offset of [-0.55, 0.55]) {
        line(to, [to[0] - 6 * Math.cos(angle + offset), to[1] - 6 * Math.sin(angle + offset)], palette.axis);
      }
    };

    arrow(project([-1, 0]), project([11.5, 0]));
    arrow(project([0, -1.3]), project([0, 10.5]));
    for (let tick = 1; tick <= 11; tick++) line(project([tick, -0.1]), project([tick, 0.1]), palette.axis);
    for (let tick = -1; tick <= 10; tick++) {
      if (tick !== 0) line(project([-0.1, tick]), project([0.1, tick]), palette.axis);
    }
    label([55, 237], 'O', palette.axis);
    label([290, 224], 'x', palette.axis);
    label([68, 17], 'y', palette.axis);
    label([190, 23], frame.heading, palette.text, 18);
    // The dashed event line is a locator, not a sampled offset from the event.
    line(project([4, -1.2]), project([4, 10.3]), palette.axis, 1, true);
    for (const id of frame.segments) {
      const segment = segments[id];
      const color = palette[segment.palette];
      const start = frame.side === 'after' ? meeting : segment.start;
      const end = frame.side === 'before' ? meeting : segment.end;
      line(project(start), project(end), color, 1.5);
      dot(start, color);
      dot(end, color);
      // Side panels label only the portion that is actually shown.
      const at = frame.side === 'before' && id === 'D' ? [96, 200] as const
        : frame.side === 'after' && id === 'C' ? [245, 239] as const : segment.label;
      label(at, id, color);
    }
    dot(meeting, palette.text);
    label([122, 166], 'P');
    if (frame.pointInput) {
      const [cx, cy] = project(meeting);
      parts.push(`<path d="M ${cx} ${cy - 5} l 5 5 -5 5 -5 -5 Z" fill="${palette.background}" stroke="${palette.text}" stroke-width="1.4"/>`);
      label([166, 137], frame.pointInput);
    }
    label([168, 255], frame.summary, palette.text, 17);
    images.push({
      target: new URL(`../static/img/segment-intersection/same-point-events/${theme}/same-point-${frame.name}-${frame.index}-${theme}.svg`, import.meta.url),
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260" viewBox="0 0 320 260" role="img" aria-labelledby="title"><title id="title">${escapeXml(frame.title)}</title><rect width="320" height="260" fill="${palette.background}"/>${parts.join('')}</svg>\n`,
    });
  }
}

const markup = renderMathLabels(labels);
for (const {target, svg} of images) {
  writeLocalizedSvg(target, svg.replace(/<!--label-(\d+)-->/g, (_, index) => markup[Number(index)]));
}
