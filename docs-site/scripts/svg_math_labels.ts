import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export type Palette = {background: string; text: string; axis: string; a: string; b: string; result: string};
export const palettes: Record<string, Palette> = {
  light: {background: '#ffffff', text: '#172033', axis: '#475569', a: '#1d4ed8', b: '#c2410c', result: '#7c3aed'},
  dark: {background: '#1b1b1d', text: '#e3e3e3', axis: '#cbd5e1', a: '#93c5fd', b: '#fdba74', result: '#c4b5fd'},
};

export const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export type SvgMathLabel = {px: number; py: number; value: string; color: string; size: number; anchor: string; background?: string};
type MathLabel = {svg: string; width: number; height: number; depth: number};

/** Batch formulas through the existing renderer and place them at SVG baselines. */
export function renderMathLabels(labels: readonly SvgMathLabel[]): string[] {
  const formulas = [...new Set(labels.map(({value}) => value))];
  const rendered = spawnSync(process.env.MATHTEXT_PYTHON ?? 'python', [fileURLToPath(new URL('./render_math_labels.py', import.meta.url))], {
    input: JSON.stringify(formulas), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (rendered.error || rendered.status !== 0) {
    throw new Error(`MathText rendering failed. Use the maintainer-provisioned Matplotlib environment.\n${rendered.error ?? rendered.stderr}`);
  }
  const math: Record<string, MathLabel> = JSON.parse(rendered.stdout);
  return labels.map(({px, py, value, color, size, anchor, background}, index) => {
    const item = math[value];
    const scale = size / 100;
    const width = item.width * scale;
    const offset = anchor === 'middle' ? -width / 2 : anchor === 'end' ? -width : 0;
    // Each embedded SVG needs its own glyph IDs, including repeated formulas.
    const prefix = `label-${index}-`;
    // MathText's advance box can be narrower than italic glyph ink (notably P).
    // Let the ink and its halo extend beyond the nested viewport without scaling it.
    const svg = item.svg.replace('<svg ', '<svg overflow="visible" ')
      .replace(/<path\b[^>]* transform="scale\(([\d.]+)\)"[^>]*>/g, (path, glyphScale) => background
        // Glyph outlines use font units; compensate both transforms for a 2px halo.
        ? path.replace('<path ', `<path stroke="${background}" stroke-width="${2 / (scale * Number(glyphScale))}" stroke-linejoin="round" paint-order="stroke fill" `)
        : path)
      .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
      .replace(/xlink:href="#([^"]+)"/g, `xlink:href="#${prefix}$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
      .replace(/width="[^"]+" height="[^"]+"/, `width="${item.width}" height="${item.height}"`);
    return `<g transform="translate(${px + offset},${py - (item.height - item.depth) * scale}) scale(${scale})" color="${color}" role="img" aria-label="${escapeXml(value)}">${svg}</g>`;
  });
}
