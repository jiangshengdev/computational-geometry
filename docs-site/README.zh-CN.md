# 中英文双语文档站

[English](README.md) | 简体中文

使用 Docusaurus 3，正式地址为 https://cgd.jiangshengdev.com/。本站独立生成静态页面，不启动 Rust API，也不依赖计算应用的运行状态。

下列命令中的 `/path/to/computational-geometry` 请替换为实际仓库目录。

## 本地使用

```bash
cd /path/to/computational-geometry
pnpm --dir docs-site install --frozen-lockfile
pnpm --dir docs-site run start --host 127.0.0.1
```

从仓库根目录执行。需要 Node.js 22.18以上的22.x版本，或24及以上版本；使用 `packageManager` 指定的 pnpm 版本。依赖安装由维护者执行。预览默认不打开浏览器，访问命令输出的地址。维护者可用 `--port <空闲端口>` 指定端口。

## 构建与检查

```bash
cd /path/to/computational-geometry
pnpm --dir docs-site run typecheck
pnpm --dir docs-site run build
pnpm --dir docs-site run serve --host 127.0.0.1
```

构建产物位于 `docs-site/build/`，静态预览不需要后端。构建会检查内部断链；公式由 remark-math 与 rehype-katex 编译，KaTeX 样式及字体随构建产物提供，不访问外部公式 CDN。

代理验证必须先分配独立临时端口，再将具体端口号传给 `--port`，不得使用或复用维护者服务。Docusaurus 3.10.2 的端口预检不支持直接用 `--port 0` 启动。

功能验收使用无头浏览器检查首页进入证明页、侧栏导航、文章目录锚点、证明页直接访问与刷新，以及行内和独立公式的渲染。只检查内容和交互，不做外观快照。数学内容须另行复核，不能以渲染通过代替证明正确。

## 双语同步发布

英文是默认展示语言，位于 `/`；简体中文位于 `/zh-Hans/`。中文仍是创作和修订原稿，放在 `i18n/zh-Hans/docusaurus-plugin-content-docs/current/`；`docs/` 保存完整英文译文。框架的存储位置不改变内容权威关系。两种语言均覆盖首页和全部19篇内容页。

每次新增或修改都必须在同一变更和发布中同步更新中文原稿及英文译文，保持数学条件、公式、实例、证明步骤、教学深度、文档ID与slug一致。语义须独立复核，构建成功不能替代翻译质量审校。导航、分类说明、图注、替代文本和其他公共文字也必须同步修改；不发布缺译回退页或已知过时译文。

`IntersectionFigures` 的文字通过 `i18n/zh-Hans/code.json` 翻译，导航、页脚和分类使用框架原生插件JSON目录。用 `pnpm run write-translations --locale zh-Hans` 更新目录后，翻译新增消息并核对差异。框架通用中文文字已纳入，其中剩余的英文无障碍标签在本地补齐。

旧中文根路径现在展示对应英文主题，不添加把它们转走的中文重定向。英文标题显式保留旧版生成的中文片段ID：可见标题与目录文字为英文，旧片段链接和同一标题处切换语言仍可定位。修改标题时保留这些兼容ID；新增片段链接须核验两种语言。

发布构建使用 `pnpm run build` 同时生成全部语言，不带单语言 `--locale` 限制。开发时可用 `pnpm run start --locale zh-Hans --host 127.0.0.1 --port <空闲端口>` 单独预览中文。站点继续独立于计算应用与Rust API，不需要修改域名或部署配置。

构建后执行 `pnpm run check:built-site`。该检查使用Playwright及操作系统分配端口的独立静态服务，结束后关闭浏览器和服务。可用 `PLAYWRIGHT_EXECUTABLE_PATH` 指定已安装的兼容Chromium，或先用 `pnpm exec playwright install chromium` 安装；检查不会自动安装。默认覆盖44个本地化页面、语言切换、链接与锚点、公共文字、章节导航和两种主题的图片。数学语义一致性另行审校。任务验证结束后清理临时构建产物和浏览器缓存，不将其作为源码提交。

局部变更可传入带末尾斜杠的英文路由，例如 `pnpm run check:built-site --route=/docs/segment-intersection/overall-correctness/ --route=/docs/segment-intersection/complete-sweep/ --route=/chapters/segment-intersection/ --route=/`。每个选中路由都会以相同断言检查两种语言，并保留站点地图对应与章节导航检查；其他实际受影响的导航页也须加入。省略参数仍执行完整遍历。

## 内容维护

英文译文放在 `docs/` 的 Markdown 或 MDX 文件中，按章节和专题分目录；侧栏由 `sidebars.ts` 维护。二级、三级标题生成文章目录；公式使用 `$...$` 或 `$$...$$`。

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

剪切专题由 `docs/segment-intersection/shear/index.mdx` 提供阅读入口，五篇正文按侧栏顺序组织，使用 Docusaurus 的目录卡片与前后篇导航。各文档通过 front matter 的 `slug` 固定页面地址，移动文件时同步维护侧栏文档 ID 和正文相对链接。本站提供原生语言切换，没有博客或搜索。仓库内部 ADR、代理规则与任务记录不在本站内容目录中。

配图生成器共享几何和MathText布局。`scripts/localized_svg.ts` 同时写入两种语言的SVG标题与 `xml:lang`：七个 `IntersectionFigures` 专题的英文资源位于 `static/img/segment-intersection/`，中文资源位于 `static/img/zh-Hans/segment-intersection/`。缺失标题翻译会使生成失败，组件按当前语言选图。只有数学符号的剪切和直线方程图继续共享，正文替代文本分别翻译。使用原有绘图命令同时生成两种语言，不手工修改生成的SVG。

## 图片目录

图片先按所属文档主题分目录，再按明暗主题分入 `light/` 和 `dark/`：

```text
static/img/segment-intersection/
├── what-we-compute/
│   ├── light/       # 31 个独立子图 SVG
│   └── dark/        # 31 个独立子图 SVG
├── line-equation/
│   ├── light/       # 4 个 SVG
│   └── dark/        # 4 个 SVG
└── shear/
    ├── light/       # 8 个 SVG
    └── dark/        # 8 个 SVG
```

正文使用 `/img/segment-intersection/<文档主题>/<light或dark>/<文件名>` 引用图片。新增图片应放入对应目录；移动时同时更新正文引用及生成脚本的输出目录。文件名保留原有明暗后缀。

第 1 章的 9 组配图使用 `IntersectionFigures` 组件：每张子图原始尺寸为 320 × 260，按原尺寸显示，空间不足时换行，不对整组图片缩放。子图文件名包含从 1 开始的编号，如 `intersection-goals-identity-1-light.svg`。前后对照每两幅独立成组，并保留「加入 C 前／后」的图外说明。生成器会清理被这些子图替换的旧拼接 SVG。

第 1 章配图由 `scripts/draw_intersection_goals.ts` 生成，执行：

```bash
cd /path/to/computational-geometry/docs-site
uv run --offline --with matplotlib==3.11.2 pnpm exec node scripts/draw_intersection_goals.ts
```

脚本通过 `scripts/render_math_labels.py` 复用下述 Matplotlib 环境与 MathText 样式，将 LaTeX 数学标注嵌入为 SVG 路径。图内仅保留必要的编号和数学标注，中文说明放在正文；原点标为 $O$，坐标轴正向带箭头。直线方程配图由 `scripts/draw_line_equation.py` 生成，同样复用剪切脚本的环境与主题样式。

## 生成坐标系图解

如果已有 Matplotlib 环境，但 uv 离线解析不可用，可指定现有解释器生成第 1 章图片；该入口不会安装依赖：

```bash
cd /path/to/computational-geometry/docs-site
MATHTEXT_PYTHON=/path/to/existing/environment/bin/python pnpm exec node scripts/draw_intersection_goals.ts
```

`scripts/draw_shear_coordinates.py` 使用 Matplotlib 的 MathText 渲染数学标注，生成以下图解，每张都包含明暗主题：

- 坐标系变换：`static/img/segment-intersection/shear/light/shear-coordinates-light.svg`、`static/img/segment-intersection/shear/dark/shear-coordinates-dark.svg`。
- 事件顺序颠倒：`static/img/segment-intersection/shear/light/shear-order-reversal-light.svg`、`static/img/segment-intersection/shear/dark/shear-order-reversal-dark.svg`。
- 新旧横轴重合：`static/img/segment-intersection/shear/<theme>/shear-horizontal-axis-<theme>.svg`，展示横轴上的点在两套坐标中的读数相同。
- 新纵轴的五步图解：`static/img/segment-intersection/shear/<theme>/shear-axis-step-{1..5}-<theme>.svg`，依次展示选点、新横坐标、原纵坐标、原横坐标及最终位置。图中仅保留几何辅助线、符号和简短公式，中文讲解放在正文的对应步骤中。

文档通过 Docusaurus 的 `ThemedImage` 随站点主题选择图片。

第四章《同一个点上的事情一起处理》使用 `IntersectionFigures` 展示 7 幅独立子图，明暗主题共 14 个 SVG，位于 `static/img/segment-intersection/same-point-events/<theme>/`。生成入口为 `scripts/draw_same_point_events.ts`，复用 `svg_math_labels.ts` 的主题颜色与 MathText 排版；执行：

```bash
cd /path/to/computational-geometry/docs-site
MATHTEXT_PYTHON=/path/to/existing/environment/bin/python pnpm exec node scripts/draw_same_point_events.ts
```

各图保持 320 × 260 原始尺寸与相同坐标尺度，点输入分图展示但不移动位置，事件两侧图只画相应侧的成员；这些是教学示意，不是真实执行轨迹。

第五章《重叠线段怎样参与扫描》沿用同一组件与数学标注能力，包含 8 幅独立子图，明暗主题共 16 个 SVG，位于 `static/img/segment-intersection/overlapping-segments/<theme>/`。子图保留重叠成员的原坐标，分别说明同线身份、外部穿越、覆盖延长与空隙；它们是教学示意，不是真实执行轨迹。使用已有 Matplotlib 环境重新生成：

```bash
cd /path/to/computational-geometry/docs-site
MATHTEXT_PYTHON=/path/to/existing/environment/bin/python pnpm exec node scripts/draw_overlapping_segments.ts
```

上述路径中的 `<theme>` 为 `light` 或 `dark`，目录与文件名后缀保持一致。

该脚本使用 Python，因为 Matplotlib 提供的是 Python 绘图 API。从仓库根目录执行：

```bash
cd /path/to/computational-geometry
uv run --offline --with matplotlib==3.11.2 python docs-site/scripts/draw_shear_coordinates.py
```

需要维护者预先准备 uv 和对应的 Matplotlib 环境；命令以离线模式复用缓存。图片已纳入版本管理，正常构建文档站无需运行 Python。修改图片时应修改脚本并重新生成，不手工编辑 SVG。两种主题共用几何与排版逻辑，只替换配色；公式导出为路径，不依赖浏览器安装数学字体。

## 独立 Vercel 项目

创建文档站自己的 Vercel 项目时，将 **Root Directory 设置为 `docs-site`**。该目录的 `vercel.json` 指定：

- 安装：`pnpm install --frozen-lockfile`
- 构建：`pnpm build`
- 输出：`build`
- 框架标识：`docusaurus-2`（Vercel 对 Docusaurus 2/3 使用的标识）
- 站点根路径 `/`，页面使用尾斜杠，与 Docusaurus 静态目录输出一致。

使用 Node.js 24，并启用 Vercel 的 Corepack 支持（项目环境变量 `ENABLE_EXPERIMENTAL_COREPACK=1`），以使用 `packageManager` 声明的 pnpm 版本。

后续发布时将正式域名绑定到该独立项目。已有仓库根 `vercel.json` 继续负责计算前端与 Rust API 的共同发布，不改用本站配置；本站也不添加计算应用的 SPA/API 路由回退。

本次只提供本地框架与部署配置，没有创建云端项目、执行部署或修改 DNS；域名出现在生成的 canonical URL 中不代表已经上线。

## 第八章配图

`complete-sweep.mdx` 使用十幅 320 × 260 教学示意图，展示 CNB #382 的七输入案例。两种语言、明暗主题共享几何与数学标注。只有图 2 使用演示系数 1/8，正文计算使用精确系数 1/15116544。通过已有 Matplotlib 环境生成已纳入版本管理的本地化 SVG，不安装依赖：

```bash
MPLCONFIGDIR=/tmp/cg-matplotlib MATHTEXT_PYTHON=/path/to/existing/python PYTHONDONTWRITEBYTECODE=1 node docs-site/scripts/draw_complete_sweep.ts
```

从仓库根目录运行。生成器复用 `svg_math_labels.ts`、`render_math_labels.py` 与 `localized_svg.ts`，不手工修改生成的 SVG。
