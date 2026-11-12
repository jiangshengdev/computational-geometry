/** Chapter-eight teaching diagrams: original geometry, visual shear, and group order.
 * Run with the maintainer-provisioned Python/Matplotlib environment:
 * MPLCONFIGDIR=/tmp/cg382/mpl MATHTEXT_PYTHON=python PYTHONDONTWRITEBYTECODE=1 node scripts/draw_complete_sweep.ts
 */
import {writeLocalizedSvg} from './localized_svg.ts';
import {escapeXml, palettes, renderMathLabels, type SvgMathLabel} from './svg_math_labels.ts';

type Point = readonly [number, number];
type Input = 'A' | 'B' | 'C' | 'D' | 'V' | 'H';
const segments: Record<Input, readonly [Point, Point]> = {
  A: [[0, 0], [2, 0]], B: [[1, 0], [4, 0]], C: [[6, 0], [8, 0]],
  D: [[-1, 4], [7, -4]], V: [[3, -1], [3, 2]], H: [[2, 3], [7, -2]],
};
const topics = ['input', 'extension', 'crossing', 'endpoint', 'gap'] as const;
const labels: SvgMathLabel[] = [];
const images: {target: URL; svg: string}[] = [];
for (const [theme, palette] of Object.entries(palettes)) {
  const colors = {A: palette.blue, B: palette.orange, C: palette.violet, D: palette.emerald, V: palette.red, H: palette.cyan, Z: palette.pink, G: palette.orange};
  for (const [topicIndex, topic] of topics.entries()) {
    for (const panel of [1, 2]) {
      const number = 2 * topicIndex + panel;
      const parts: string[] = [];
      const label = (px: number, py: number, value: string, color = palette.text, size = 15) => {
        labels.push({px, py, value: `$${value}$`, color, size, anchor: 'middle', background: palette.background});
        parts.push(`<!--label-${labels.length - 1}-->`);
      };
      const line = (a: Point, b: Point, color: string, width = 1.5, dashed = false) => {
        parts.push(`<path d="M ${a.join(' ')} L ${b.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="4 3"' : ''}/>`);
      };
      label(23, 23, `(${number})`);
      if (topic === 'crossing' || (topic === 'endpoint' && panel === 2)) {
        const order = topic === 'endpoint' ? ['D', 'G[B]', 'H'] : panel === 1 ? ['V', 'G[B]', 'D', 'H'] : ['D', 'G[B]', 'V', 'H'];
        label(180, 28, topic === 'endpoint' ? "Q':\\mathrm{after}" : `P':\\mathrm{${panel === 1 ? 'before' : 'after'}}`);
        line([72, 225], [72, 55], palette.axis, 1);
        line([72, 55], [68, 63], palette.axis, 1);
        line([72, 55], [76, 63], palette.axis, 1);
        for (const [index, value] of order.entries()) {
          const y = 215 - index * 46;
          const color = colors[value[0] as keyof typeof colors];
          line([100, y], [240, y], color, 1.5);
          label(170, y - 7, value, color, 18);
        }
        if (topic === 'crossing') {
          parts.push(`<rect x="90" y="98" width="162" height="128" rx="6" fill="none" stroke="${palette.axis}" stroke-dasharray="4 3"/>`);
        }
      } else {
        const visualShear = topic === 'input' && panel === 2 ? 1 / 8 : 0;
        const local = topic === 'endpoint';
        const scale = local ? 48 : 23;
        const project = ([x, y]: Point): Point => local ? [82 + (x - 2) * scale, 205 - y * scale] : [65 + (x + visualShear * y) * scale, 135 - y * scale];
        const axes = (point: Point): Point => local ? [82 + (point[0] - 2) * scale, 205 - point[1] * scale] : [65 + point[0] * scale, 135 - point[1] * scale];
        const dot = (p: Point, color: string, hollow = false) => {
          const [cx, cy] = project(p);
          parts.push(`<circle cx="${cx}" cy="${cy}" r="3" fill="${hollow ? palette.background : color}" stroke="${color}" stroke-width="1.5"/>`);
        };
        // The endpoint close-up has no coordinate axes: its frame is explicitly local.
        if (!local) {
          line(axes([-1.8, 0]), axes([9, 0]), palette.axis, 0.7);
          line(axes([0, -4.5]), axes([0, 4.6]), palette.axis, 0.7);
          const [ax, ay] = axes([9, 0]), [bx, by] = axes([0, 4.6]);
          line([ax - 5, ay - 3], [ax, ay], palette.axis, 0.7);
          line([ax - 5, ay + 3], [ax, ay], palette.axis, 0.7);
          line([bx - 3, by + 5], [bx, by], palette.axis, 0.7);
          line([bx + 3, by + 5], [bx, by], palette.axis, 0.7);
          for (let x = -1; x <= 8; x++) line(axes([x, -.08]), axes([x, .08]), palette.axis, .7);
          for (let y = -4; y <= 4; y++) line(axes([-.08, y]), axes([.08, y]), palette.axis, .7);
          label(54, 151, 'O', palette.axis, 13);
          label(ax + 12, ay + 4, visualShear ? "x'" : 'x', palette.axis, 13);
          label(bx - 14, by + 5, visualShear ? "y'" : 'y', palette.axis, 13);
        }
        const selected: Input[] = topic === 'input' ? ['B', 'A', 'C', 'D', 'V', 'H'] : topic === 'extension' ? (panel === 1 ? ['A', 'D'] : ['B', 'A', 'D']) : topic === 'gap' ? (panel === 1 ? ['B', 'C', 'H'] : ['C', 'H']) : ['V', 'H'];
        const labelAt: Record<Input, Point> = local ? {A:[0,0], B:[0,0], C:[0,0], D:[0,0], V:[153,199], H:[222,138]} : {
          A:[78,119], B:[162,153], C:[227,120], D:[91,69], V:[150,180], H:[205,83],
        };
        for (const id of selected) {
          let [a, b] = segments[id];
          if (local && id === 'H') [a,b] = [[2,3],[5,0]];
          const dashed = (id === 'A' && selected.includes('B')) || (topic === 'gap' && panel === 1 && id === 'C');
          line(project(a), project(b), colors[id], 1.6, dashed);
          dot(a, colors[id]);
          if (!(local && id === 'H')) dot(b, colors[id]);
          label(...labelAt[id], id, colors[id]);
        }
        if (topic === 'input' || local) {
          const [cx, cy] = project([3,2]);
          parts.push(`<path d="M ${cx} ${cy-6} L ${cx+6} ${cy} L ${cx} ${cy+6} L ${cx-6} ${cy} Z" fill="none" stroke="${colors.Z}" stroke-width="1.5"/>`);
          label(cx + 19, cy - 12, 'Z', colors.Z);
          if (local) label(190, 45, 'Q=(3,2)', palette.text, 15);
        }
        if (topic === 'extension') {
          dot([3,0], palette.text, true);
          const [cx,cy] = project([3,0]); label(cx, cy-13, 'P');
          label(190, 250, panel === 1 ? 'R_G=2<3' : '3\\leq R_G=4');
          label(170, 24, panel === 1 ? 'E_2' : 'E_3');
        }
        if (topic === 'gap') {
          dot([5,0], palette.text, true);
          const [cx,cy] = project([5,0]); label(cx,cy-13,'R');
          label(170, 24, panel === 1 ? 'E_8' : 'E_{10}');
          label(190, 230, panel === 1 ? 'R_G=4<5' : '5<6');
        }
        if (visualShear) label(211, 24, 's_{\\mathrm{vis}}=1/8', palette.axis, 14);
      }
      const title = `完整扫描示意图 ${number}。`;
      images.push({target: new URL(`../static/img/segment-intersection/complete-sweep/${theme}/complete-${topic}-${panel}-${theme}.svg`, import.meta.url), svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260" viewBox="0 0 320 260" role="img" aria-labelledby="title"><title id="title">${escapeXml(title)}</title><rect width="320" height="260" fill="${palette.background}"/>${parts.join('')}</svg>\n`});
    }
  }
}
const markup = renderMathLabels(labels);
for (const {target, svg} of images) writeLocalizedSvg(target, svg.replace(/<!--label-(\d+)-->/g, (_, index) => markup[Number(index)]));
