/** Authored teaching diagrams, not algorithm traces. Generate with
 * MATHTEXT_PYTHON=/path/to/existing/python pnpm exec node scripts/draw_sweep_proof.ts.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {escapeXml, palettes, renderMathLabels, type Palette, type SvgMathLabel} from './svg_math_labels.ts';

type Point = readonly [number, number];
const labels: SvgMathLabel[] = [];
const images: {target: URL; svg: string}[] = [];

class Panel {
  private parts: string[] = [];
  readonly palette: Palette;

  constructor(palette: Palette) {
    this.palette = palette;
  }

  line(from: Point, to: Point, color = this.palette.axis, dashed = false, width = 1) {
    this.parts.push(`<line x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="4 4"' : ''}/>`);
  }

  label(at: Point, formula: string, color = this.palette.text, size = 16) {
    labels.push({px: at[0], py: at[1], value: `$${formula}$`, color, size, anchor: 'middle', background: this.palette.background});
    this.parts.push(`<!--label-${labels.length - 1}-->`);
  }

  dot(at: Point, color = this.palette.text, hollow = false) {
    this.parts.push(`<circle cx="${at[0]}" cy="${at[1]}" r="3" fill="${hollow ? this.palette.background : color}" stroke="${color}" stroke-width="1.2"/>`);
  }

  arrow(from: Point, to: Point, color = this.palette.axis, dashed = false) {
    this.line(from, to, color, dashed);
    const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    for (const offset of [-0.55, 0.55]) {
      this.line(to, [to[0] - 6 * Math.cos(angle + offset), to[1] - 6 * Math.sin(angle + offset)], color);
    }
  }

  // A length is marked separately from the axis, with both ends visible.
  span(left: number, right: number, top: number, formula: string, color = this.palette.text) {
    this.line([left, top], [right, top], color);
    this.line([left, top - 4], [left, top + 4], color);
    this.line([right, top - 4], [right, top + 4], color);
    this.label([(left + right) / 2, top - 9], formula, color);
  }

  save(theme: string, name: string, index: number, title: string) {
    images.push({
      target: new URL(`../static/img/segment-intersection/why-neighbors-proof/${theme}/sweep-proof-${name}-${index}-${theme}.svg`, import.meta.url),
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260" viewBox="0 0 320 260" role="img" aria-labelledby="title"><title id="title">${escapeXml(title)}</title><rect width="320" height="260" fill="${this.palette.background}"/>${this.parts.join('')}</svg>\n`,
    });
  }
}

// The height panels use the unchanged A and C inputs from the upper article.
function heightPanels(theme: string, p: Palette) {
  const point = (x: number, y: number): Point => [42 + 23 * x, 198 - 23 * y];
  for (const [index, position] of [6, 7, 8].entries()) {
    const panel = new Panel(p);
    panel.arrow(point(-0.5, 0), point(11, 0));
    panel.arrow(point(0, -1.4), point(0, 7));
    for (let tick = 1; tick <= 10; tick++) panel.line(point(tick, -0.09), point(tick, 0.09));
    for (let tick = -1; tick <= 6; tick++) {
      if (tick !== 0) panel.line(point(-0.09, tick), point(0.09, tick));
    }
    panel.label([29, 216], 'O', p.axis);
    panel.label([306, 204], 'x', p.axis);
    panel.label([42, 27], 'y', p.axis);
    panel.label([167, 24], `x=${position}`, p.text, 18);
    panel.line(point(0, 1), point(10, 1), p.a, false, 1.5);
    panel.line(point(2, 6), point(9, -1), p.result, false, 1.5);
    panel.line(point(position, -1.3), point(position, 6.7), p.axis, true);
    panel.label([286, 171], 'A', p.a);
    panel.label([76, 53], 'C', p.result);
    panel.dot(point(position, 1), p.a);
    panel.dot(point(position, 8 - position), p.result);
    panel.dot(point(7, 1), p.text, position !== 7);
    panel.label([218, 166], 'P', p.text);
    panel.label([163, 250], `d_{CA}(${position})=${7 - position}`, p.text, 18);
    panel.save(theme, 'height', index + 1, `固定按 C 减 A，在 x=${position} 处的高度差为 ${7 - position}。`);
  }
}

function ratioPanel(theme: string, p: Palette, numeric: boolean) {
  const panel = new Panel(p);
  const position = (value: number) => 16 + 32 * value;
  const origin = position(0), start = position(2), current = position(3.5), end = position(8), axisY = 142;
  panel.arrow([6, axisY], [302, axisY]);
  for (let value = 0; value <= 8; value++) {
    const tick = position(value);
    panel.line([tick, axisY - 3], [tick, axisY + 3]);
  }
  panel.label([origin, 166], 'O', p.axis);
  panel.label([304, 166], 'x', p.axis);
  panel.line([start, 80], [start, 209], p.axis, true);
  panel.line([current, 80], [current, axisY], p.axis, true);
  panel.line([end, axisY], [end, 209], p.axis, true);
  panel.dot([start, axisY], p.a);
  panel.dot([current, axisY], p.result);
  panel.dot([end, axisY], p.a);
  panel.label([start, 168], numeric ? '2' : 'u');
  panel.label([end, 168], numeric ? '8' : 'v');
  panel.span(start, current, 88, numeric ? '\\frac{3}{2}' : 't(v-u)', p.result);
  panel.span(start, end, 203, numeric ? '8-2=6' : 'v-u');
  panel.label([177, 31], numeric ? 't=\\frac{1}{4}' : '0<t<1', p.text, 18);
  panel.label([185, 123], numeric ? '\\frac{7}{2}' : 'u+t(v-u)', p.result, 17);
  panel.line([current + 5, axisY - 6], [157, 125], p.result);
  panel.save(theme, numeric ? 'ratio-numeric' : 'ratio-general', 1, numeric
    ? '从 2 到 8，全程 6，走过四分之一即 3/2，到达 7/2。'
    : '从 u 到 v，全程 v-u，走过比例 t 时到达 u+t(v-u)。示意位置不限定横坐标的正负。');
}

function betweenPanel(theme: string, p: Palette, contradiction: boolean) {
  const panel = new Panel(p);
  const point = (x: number, y: number): Point => [38 + 26 * x, 208 - 28 * y];
  panel.arrow(point(-0.5, 0), point(10, 0));
  panel.arrow(point(0, -0.4), point(0, 6));
  for (let tick = 1; tick <= 9; tick++) panel.line(point(tick, -0.08), point(tick, 0.08));
  for (let tick = 1; tick <= 5; tick++) panel.line(point(-0.08, tick), point(0.08, tick));
  panel.label([25, 226], 'O', p.axis);
  panel.label([307, 215], 'x', p.axis);
  panel.label([38, 30], 'y', p.axis);
  // U and V meet at (5, 3). W's full line is drawn only in the contradiction.
  panel.line(point(0.75, 0.875), point(8.5, 4.75), p.a, false, 1.5);
  panel.line(point(0.75, 5.125), point(8.5, 1.25), p.b, false, 1.5);
  panel.label([274, 74], 'U', p.a);
  panel.label([274, 181], 'V', p.b);
  panel.line(point(2, 0), point(2, 5.7), p.axis, true);
  panel.line(point(5, 0), point(5, 5.7), p.axis, true);
  panel.label([90, 228], 'r');
  panel.label([168, 228], 'p');
  panel.line(point(1.5, 3), point(contradiction ? 8.5 : 3.3, 3), p.result, false, 1.5);
  panel.label(contradiction ? [274, 128] : [122, 115], 'W', p.result);
  panel.dot(point(2, 1.5), p.a);
  panel.dot(point(2, 3), p.result);
  panel.dot(point(2, 4.5), p.b);
  panel.dot(point(5, 3), p.text, !contradiction);
  panel.label([177, 24], 'r<p', p.text, 18);
  panel.label([160, 253], contradiction ? 'y_U(p)=y_W(p)=y_V(p)' : 'y_U(r)<y_W(r)<y_V(r)', p.text, 15);
  panel.save(theme, contradiction ? 'between-contradiction' : 'between-assumption', 1, contradiction
    ? '反证假设推出三线共点的矛盾；这不是本章允许的输入。'
    : '暂时假设 W 在 r 处夹在 U、V 中间，只画出 W 在 r 附近的部分；尚未假定其在 p 处的高度。');
}

function firstMissedPanel(theme: string, p: Palette, report: boolean) {
  const panel = new Panel(p);
  const start = 76, future = 248, axisY = 166;
  panel.arrow([16, axisY], [302, axisY]);
  for (let tick = 28; tick <= 288; tick += 13) panel.line([tick, axisY - 3], [tick, axisY + 3]);
  panel.label([28, 192], 'O', p.axis);
  panel.label([304, 192], 'x', p.axis);
  panel.label([start, 192], 's');
  panel.label([future, 192], 'p_*');
  panel.label([160, 28], 's<p_*', p.text, 18);
  panel.line([start, 86], [start, axisY], p.axis, true);
  panel.line([future, 86], [future, axisY], p.axis, true);
  panel.dot([start, axisY], p.a);
  panel.dot([future, axisY], p.result, !report);
  panel.label([start, 122], 'U_*,V_*', p.a);
  panel.arrow([start, 85], [future, 85], p.result, !report);
  if (report) {
    // Open and filled marks show registration and later reporting of one event.
    panel.dot([170, 85], p.result, true);
    panel.label([170, 69], 'p_*', p.result);
    panel.label([future, 122], 'U_*,V_*', p.result);
  } else {
    panel.dot([future, 85], p.result, true);
    panel.label([future, 69], 'p_*', p.result);
  }
  panel.save(theme, report ? 'first-missed-report' : 'first-missed-check', 1, report
    ? '由反证假设推得：已登记的真实未来交点一直保留，扫描按位置到达 p_* 并报告，与漏点假设矛盾。'
    : '由反证假设推得：在 s 形成邻接并检查 U_*、V_*，发现并登记未来位置 p_*；箭头不表示立即跳到 p_*。');
}

for (const [theme, palette] of Object.entries(palettes)) {
  heightPanels(theme, palette);
  ratioPanel(theme, palette, true);
  ratioPanel(theme, palette, false);
  betweenPanel(theme, palette, false);
  betweenPanel(theme, palette, true);
  firstMissedPanel(theme, palette, false);
  firstMissedPanel(theme, palette, true);
}

const markup = renderMathLabels(labels);
for (const {target, svg} of images) {
  mkdirSync(new URL('./', target), {recursive: true});
  writeFileSync(target, svg.replace(/<!--label-(\d+)-->/g, (_, index) => markup[Number(index)]));
}
