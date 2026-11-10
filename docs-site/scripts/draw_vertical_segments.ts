/** Chapter-seven illustrations. s_vis=1/2 is visual only, never the scan coefficient.
 * From docs-site/: MPLCONFIGDIR=/tmp/cg-matplotlib MATHTEXT_PYTHON=python3 PYTHONDONTWRITEBYTECODE=1 pnpm --config.verify-deps-before-run=false exec node scripts/draw_vertical_segments.ts
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {escapeXml, palettes, renderMathLabels, type SvgMathLabel} from './svg_math_labels.ts';

type Point = readonly [number, number];
const labels: SvgMathLabel[] = [];
const images: {target: URL; svg: string}[] = [];
const topics = ['main', 'overlap', 'points'] as const;
for (const [theme, palette] of Object.entries(palettes)) {
  for (const [topicIndex, topic] of topics.entries()) {
    for (const transformed of [false, true]) {
      const panel = transformed ? 2 : 1;
      const number = topicIndex * 2 + panel;
      const visualShear = transformed ? 0.5 : 0;
      const parts: string[] = [];
      const project = ([x, y]: Point): Point => [112 + 46 * x, 216 - 46 * y];
      const transform = ([x, y]: Point): Point => [x + visualShear * y, y];
      const location = (point: Point) => project(transform(point));
      const label = (at: Point, value: string, color = palette.text, size = 16) => {
        labels.push({px: at[0], py: at[1], value: `$${value}$`, color, size, anchor: 'middle', background: palette.background});
        parts.push(`<!--label-${labels.length - 1}-->`);
      };
      const line = (a: Point, b: Point, color: string, width = 1.5, dashed = false) => {
        parts.push(`<path d="M ${a.join(' ')} L ${b.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="5 4"' : ''}/>`);
      };
      const segment = (a: Point, b: Point, color: string, width = 1.5, dashed = false) => line(location(a), location(b), color, width, dashed);
      const dot = (point: Point, color: string, radius = 2.5) => {
        const [cx, cy] = location(point);
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}"/>`);
      };
      line(project([-1.6, 0]), project([3.2, 0]), palette.axis, 0.8);
      line(project([0, -0.35]), project([0, 3.8]), palette.axis, 0.8);
      const [ax, ay] = project([3.2, 0]), [bx, by] = project([0, 3.8]);
      parts.push(`<path d="M ${ax-5} ${ay-3} L ${ax} ${ay} L ${ax-5} ${ay+3} M ${bx-3} ${by+5} L ${bx} ${by} L ${bx+3} ${by+5}" fill="none" stroke="${palette.axis}"/>`);
      for (const x of [-1, 1, 2, 3]) line(project([x, -0.06]), project([x, 0.06]), palette.axis, 0.8);
      for (const y of [1, 2, 3]) line(project([-0.06, y]), project([0.06, y]), palette.axis, 0.8);
      label([100, 236], 'O', palette.axis, 14);
      label([ax+14, ay+5], transformed ? "x'" : 'x', palette.axis, 14);
      label([bx, by-9], transformed ? "y'" : 'y', palette.axis, 14);
      label([26, 25], `(${number})`);
      if (transformed) label([229, 25], 's_{\\mathrm{vis}}=1/2', palette.axis, 14);
      segment([0, 0], [0, 3], palette.blue, 1.5, topic === 'overlap');
      dot([0, 0], palette.blue);
      dot([0, 3], palette.blue);
      const top = location([0, 3]);
      label([top[0]+18, top[1]-8], 'V', palette.blue);
      if (topic === 'main') {
        for (const [y, id, color] of [[1, 'A', palette.orange], [2, 'B', palette.violet]] as const) {
          segment([-1, y], [1, y], color);
          dot([-1, y], color);
          dot([1, y], color);
          const end = location([1, y]);
          label([end[0]+18, end[1]+5], id, color);
        }
        for (const [y, id] of [[1, 'P'], [2, 'Q']] as const) {
          dot([0, y], palette.text, 3);
          const point = location([0, y]);
          label([point[0]-17, point[1]-11], transformed ? `${id}'` : id);
        }
      } else if (topic === 'overlap') {
        // A thicker solid W marks the complete intersection, at its true location on V.
        segment([0, 1], [0, 2], palette.emerald, 3);
        dot([0, 1], palette.emerald);
        dot([0, 2], palette.emerald);
        const middle = location([0, 1.5]);
        label([middle[0]+24, middle[1]+5], 'W', palette.emerald);
        for (const y of [1, 2]) {
          const point = location([0, y]);
          label([point[0]-40, point[1]+5], transformed ? (y === 1 ? '(1/2,1)' : '(1,2)') : `(0,${y})`, palette.text, 13);
        }
      } else {
        const [cx, cy] = location([0, 1]);
        parts.push(`<circle cx="${cx}" cy="${cy}" r="7" fill="none" stroke="${palette.orange}" stroke-width="1.5"/><path d="M ${cx} ${cy-11} L ${cx+11} ${cy} L ${cx} ${cy+11} L ${cx-11} ${cy} Z" fill="none" stroke="${palette.violet}" stroke-width="1.5"/>`);
        label([cx-27, cy+5], 'Z_1', palette.orange);
        label([cx+30, cy+5], 'Z_2', palette.violet);
        label([cx+29, cy-20], transformed ? "P'" : 'P');
      }
      const title = `${topic}, panel ${number}, ${transformed ? 'visual shear only: s_vis=1/2' : 'original coordinates'}`;
      images.push({target: new URL(`../static/img/segment-intersection/vertical-segments/${theme}/vertical-${topic}-${panel}-${theme}.svg`, import.meta.url),
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260" viewBox="0 0 320 260" role="img" aria-labelledby="title"><title id="title">${escapeXml(title)}</title><rect width="320" height="260" fill="${palette.background}"/>${parts.join('')}</svg>\n`});
    }
  }
}
const markup = renderMathLabels(labels);
for (const {target, svg} of images) {
  mkdirSync(new URL('./', target), {recursive: true});
  writeFileSync(target, svg.replace(/<!--label-(\d+)-->/g, (_, index) => markup[Number(index)]));
}
