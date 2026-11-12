# Bilingual documentation site

English | [简体中文](README.zh-CN.md)

Built with Docusaurus 3 and configured for https://cgd.jiangshengdev.com/. The site independently generates static pages; it neither starts the Rust API nor depends on the computation app running.

## Local use

Replace `/path/to/computational-geometry` with your checkout location. Run from the repository root:

```bash
cd /path/to/computational-geometry
pnpm --dir docs-site install --frozen-lockfile
pnpm --dir docs-site run start --host 127.0.0.1
```

Node.js 22.18 or later in the 22.x line, or Node.js 24 or later is required; use the pnpm version specified by `packageManager`. Maintainers perform dependency installation. Preview does not open a browser by default; visit the printed address. Maintainers can specify an available port with `--port <available-port>`.

## Build and checks

```bash
cd /path/to/computational-geometry
pnpm --dir docs-site run typecheck
pnpm --dir docs-site run build
pnpm --dir docs-site run serve --host 127.0.0.1
```

Build output is in `docs-site/build/`; static preview requires no backend. The build checks internal broken links. Formulas compile through remark-math and rehype-katex; KaTeX styles and fonts ship with the build, without an external math CDN.

Agent validation must allocate a separate temporary port and pass that concrete port to `--port`, without using or reusing a maintainer's service. Docusaurus 3.10.2's port precheck does not support starting directly with `--port 0`.

Functional acceptance uses a headless browser to check navigation from the home page to proof pages, sidebar navigation, article table-of-contents anchors, direct proof-page access and refresh, and inline/display formula rendering. It checks content and interaction, without visual snapshots. Mathematical content needs separate review; successful rendering does not establish proof correctness.

## Bilingual publishing

English is the default display language at `/`; Simplified Chinese uses `/zh-Hans/`. Chinese remains the authoritative authoring source at `i18n/zh-Hans/docusaurus-plugin-content-docs/current/`; `docs/` contains its complete English translation. This storage layout does not make English the source text. Both include the home page and all 17 content pages.

For every addition or revision, update the Chinese source and English translation in the same change and release. Preserve mathematical conditions, formulas, examples, proof steps, teaching depth, document IDs, and slugs. Review meaning independently; a successful build cannot establish translation quality. Update both languages of navigation, category descriptions, figure captions, alternative text, and other public strings in the same change. Do not publish untranslated fallback pages or knowingly stale translations.

Docusaurus translates `IntersectionFigures` strings through `i18n/zh-Hans/code.json`; navigation, footer, and categories have their native plugin JSON catalogs. Regenerate catalogs with `pnpm run write-translations --locale zh-Hans`, then translate new messages and check the diff. The framework's generic Chinese strings are included, with remaining English accessibility labels translated locally.

The previous Chinese root URLs now show the corresponding English topics. No redirect takes them away from English. Translated headings explicitly retain the previously generated Chinese fragment IDs; displayed English headings and table-of-contents labels are translated, while old fragment links and same-heading language switches keep working. Preserve these compatibility IDs when editing headings and verify any new fragment links in both languages.

Build all locales together with `pnpm run build` (no `--locale` restriction for publication). To preview Chinese during development, use `pnpm run start --locale zh-Hans --host 127.0.0.1 --port <available-port>`. The generated site remains independent of the computation app and Rust API; no domain or deployment configuration changes are required.

After building, run `pnpm run check:built-site`. This uses Playwright with an isolated static server on an OS-assigned port and closes both browser and server afterward. Set `PLAYWRIGHT_EXECUTABLE_PATH` to an installed compatible Chromium executable, or install Playwright's Chromium with `pnpm exec playwright install chromium`; the check does not install anything. It checks all 40 localized pages, language switching, links and anchors, public text, chapter navigation, and images in both themes. Review mathematical equivalence separately. Temporary build output and browser caches are not source files and must be cleaned after task validation.

## Content maintenance

English articles are Markdown or MDX files under `docs/`, organized by chapter and topic; `sidebars.ts` maintains the sidebar. Level-two and level-three headings generate the article table of contents. Use `$...$` or `$$...$$` for formulas.

```text
docs/
├── index.mdx
├── convex-hull/
│   └── determinant-orientation.mdx
└── segment-intersection/
    └── shear/
        ├── index.mdx
        ├── intuition.mdx
        ├── denominator.mdx
        ├── order.mdx
        ├── special-cases.mdx
        └── intersection.mdx
```

`docs/segment-intersection/shear/index.mdx` is the entry point to the shear topic. Its five articles follow sidebar order, using Docusaurus directory cards and previous/next navigation. Front-matter `slug` fields fix page addresses. When moving files, update sidebar document IDs and relative article links together. The site has a native language switch and no blog or search. Internal ADRs, agent rules, and task records are outside the site's content directory.

Figure generators share geometry and MathText layout. `scripts/localized_svg.ts` writes localized SVG titles and `xml:lang`: English at `static/img/segment-intersection/`, Chinese at `static/img/zh-Hans/segment-intersection/` for the seven `IntersectionFigures` topics. Missing title translations fail generation. `IntersectionFigures` selects the resource by locale. Purely mathematical shear and line-equation diagrams remain shared; their article alt text is translated. Regenerate both locales together with the existing drawing commands; never hand-edit generated SVGs.

## Image directories

Images are organized by document topic, then into `light/` and `dark/` themes:

```text
static/img/segment-intersection/
├── what-we-compute/
│   ├── light/       # 31 individual SVG subfigures
│   └── dark/        # 31 individual SVG subfigures
├── line-equation/
│   ├── light/       # 4 SVGs
│   └── dark/        # 4 SVGs
└── shear/
    ├── light/       # 8 SVGs
    └── dark/        # 8 SVGs
```

Articles reference `/img/segment-intersection/<topic>/<light-or-dark>/<filename>`. Put new images in the corresponding directory. Moves require updating article references and generator output directories. Keep existing theme suffixes in filenames.

Chapter 1's nine figure groups use `IntersectionFigures`. Each subfigure is 320 × 260 and displayed at native size, wrapping when space is insufficient without scaling the entire group. Filenames include one-based numbering, such as `intersection-goals-identity-1-light.svg`. Before/after comparisons form independent pairs and retain external captions meaning “before/after adding C”. The generator cleans up old combined SVGs replaced by these subfigures.

Chapter 1 figures are generated by `scripts/draw_intersection_goals.ts`:

```bash
cd /path/to/computational-geometry/docs-site
uv run --offline --with matplotlib==3.11.2 pnpm exec node scripts/draw_intersection_goals.ts
```

Through `scripts/render_math_labels.py`, the script reuses the Matplotlib environment and MathText styles described below, embedding LaTeX math labels as SVG paths. Figures retain only necessary numbering and mathematical labels; Explanations belong in the article in its current language. The origin is labeled $O$, and positive axis directions have arrows. Line-equation figures are generated by `scripts/draw_line_equation.py`, also reusing the shear script's environment and theme styles.

## Generating coordinate diagrams

If a Matplotlib environment already exists but uv offline resolution is unavailable, specify the existing interpreter for Chapter 1 figures; this entry point does not install dependencies:

```bash
cd /path/to/computational-geometry/docs-site
MATHTEXT_PYTHON=/path/to/existing/environment/bin/python pnpm exec node scripts/draw_intersection_goals.ts
```

`scripts/draw_shear_coordinates.py` renders mathematical labels with Matplotlib MathText and generates both light and dark versions of:

- Coordinate-system transformation: `static/img/segment-intersection/shear/light/shear-coordinates-light.svg` and `static/img/segment-intersection/shear/dark/shear-coordinates-dark.svg`.
- Event-order reversal: `static/img/segment-intersection/shear/light/shear-order-reversal-light.svg` and `static/img/segment-intersection/shear/dark/shear-order-reversal-dark.svg`.
- Coinciding old/new horizontal axes: `static/img/segment-intersection/shear/<theme>/shear-horizontal-axis-<theme>.svg`, showing that points on the horizontal axis have the same readings in both coordinate systems.
- Five steps for the new vertical axis: `static/img/segment-intersection/shear/<theme>/shear-axis-step-{1..5}-<theme>.svg`, showing point selection, new x coordinate, original y coordinate, original x coordinate, and final position. Figures retain geometric guides, symbols, and short formulas; Explanations appear in the corresponding localized article steps.

Articles use Docusaurus `ThemedImage` to select images for the site theme.

Chapter 4, “Handling everything at the same point together”, uses `IntersectionFigures` for seven separate subfigures, totaling 14 themed SVGs under `static/img/segment-intersection/same-point-events/<theme>/`. The generator `scripts/draw_same_point_events.ts` reuses theme colors and MathText layout from `svg_math_labels.ts`:

```bash
cd /path/to/computational-geometry/docs-site
MATHTEXT_PYTHON=/path/to/existing/environment/bin/python pnpm exec node scripts/draw_same_point_events.ts
```

Each figure retains native 320 × 260 dimensions and the same coordinate scale. Point inputs appear in separate figures without changing position. Figures on either side of an event draw only members on that side. These are teaching illustrations, not actual execution traces.

Chapter 5, “How overlapping segments participate in the sweep”, reuses the same component and math-label capabilities, with eight subfigures and 16 themed SVGs under `static/img/segment-intersection/overlapping-segments/<theme>/`. They preserve overlapping members' original coordinates and illustrate collinear identity, external crossings, coverage extension, and gaps. These are teaching illustrations, not actual execution traces. Regenerate using an existing Matplotlib environment:

```bash
cd /path/to/computational-geometry/docs-site
MATHTEXT_PYTHON=/path/to/existing/environment/bin/python pnpm exec node scripts/draw_overlapping_segments.ts
```

In these paths, `<theme>` is `light` or `dark`, matching directory names and filename suffixes.

The shear-coordinate script uses Python because Matplotlib provides a Python plotting API. Run from the repository root:

```bash
cd /path/to/computational-geometry
uv run --offline --with matplotlib==3.11.2 python docs-site/scripts/draw_shear_coordinates.py
```

Maintainers must prepare uv and the corresponding Matplotlib environment in advance; the command reuses cached resources offline. Images are version-controlled, so normal site builds do not need Python. To change images, edit scripts and regenerate rather than hand-editing SVGs. Both themes share geometry and layout, changing only colors. Formulas are exported as paths and do not depend on installed browser math fonts.

## Separate Vercel project

Create a separate Vercel project for the documentation site and set **Root Directory to `docs-site`**. Its `vercel.json` defines:

- Installation: `pnpm install --frozen-lockfile`
- Build: `pnpm build`
- Output: `build`
- Framework identifier: `docusaurus-2` (Vercel's identifier for Docusaurus 2/3)
- Site root `/`, with trailing-slash page URLs matching Docusaurus static-directory output.

Use Node.js 24 and enable Vercel Corepack support through project environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` to use the pnpm version declared by `packageManager`.

Bind the production domain to this separate project when publishing. The existing root `vercel.json` continues to deploy the computation frontend and Rust API together; it does not switch to the site configuration. The documentation site does not add computation-app SPA/API fallbacks.

This setup supplies only the local framework and deployment configuration. It has not created a cloud project, deployed the site, or changed DNS. A domain appearing in generated canonical URLs does not establish that the site is live.

## Chapter 8 figures

`complete-sweep.mdx` uses ten 320 × 260 teaching diagrams for the seven-input example in CNB #382. Geometry and mathematical labels are shared across languages and themes. Figure 2 alone uses a visual coefficient of 1/8; the article calculates with the exact coefficient 1/15116544. Generate the committed localized SVGs with the existing Matplotlib environment (no dependency installation):

```bash
MPLCONFIGDIR=/tmp/cg-matplotlib MATHTEXT_PYTHON=/path/to/existing/python PYTHONDONTWRITEBYTECODE=1 node docs-site/scripts/draw_complete_sweep.ts
```

Run from the repository root. The generator reuses `svg_math_labels.ts`, `render_math_labels.py`, and `localized_svg.ts`; do not hand-edit generated SVGs.
