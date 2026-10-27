# 中文文档站

使用 Docusaurus 3，正式地址为 https://cgd.jiangshengdev.com/。本站独立生成静态页面，不启动 Rust API，也不依赖计算应用的运行状态。

## 本地使用

```bash
pnpm --dir docs-site install --frozen-lockfile
pnpm --dir docs-site start --host 127.0.0.1
```

从仓库根目录执行。需要 Node.js 20 或以上；使用 `packageManager` 指定的 pnpm 版本。依赖安装由维护者执行。预览默认不打开浏览器，访问命令输出的地址。维护者可用 `--port <空闲端口>` 指定端口。

## 构建与检查

```bash
pnpm --dir docs-site typecheck
pnpm --dir docs-site build
pnpm --dir docs-site serve --host 127.0.0.1
```

构建产物位于 `docs-site/build/`，静态预览不需要后端。构建会检查内部断链；公式由 remark-math 与 rehype-katex 编译，KaTeX 样式及字体随构建产物提供，不访问外部公式 CDN。

代理验证必须先分配独立临时端口，再将具体端口号传给 `--port`，不得使用或复用维护者服务。Docusaurus 3.10.2 的端口预检不支持直接用 `--port 0` 启动。

功能验收使用无头浏览器检查首页进入证明页、侧栏导航、文章目录锚点、证明页直接访问与刷新，以及行内和独立公式的渲染。只检查内容和交互，不做外观快照。数学内容须另行复核，不能以渲染通过代替证明正确。

## 内容维护

正文放在 `docs/` 的 Markdown 或 MDX 文件中，按章节和专题分目录；侧栏由 `sidebars.ts` 维护。二级、三级标题生成文章目录；公式使用 `$...$` 或 `$$...$$`。

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

剪切专题由 `docs/segment-intersection/shear/index.mdx` 提供阅读入口，五篇正文按侧栏顺序组织，使用 Docusaurus 的目录卡片与前后篇导航。各文档通过 front matter 的 `slug` 固定页面地址，移动文件时同步维护侧栏文档 ID 和正文相对链接。本站没有博客、搜索或语言切换。仓库内部 ADR、代理规则与任务记录不在本站内容目录中。

## 图片目录

图片先按所属文档主题分目录，再按明暗主题分入 `light/` 和 `dark/`：

```text
static/img/segment-intersection/
├── what-we-compute/
│   ├── light/       # 9 个 SVG
│   └── dark/        # 9 个 SVG
├── line-equation/
│   ├── light/       # 4 个 SVG
│   └── dark/        # 4 个 SVG
└── shear/
    ├── light/       # 8 个 SVG
    └── dark/        # 8 个 SVG
```

正文使用 `/img/segment-intersection/<文档主题>/<light或dark>/<文件名>` 引用图片。新增图片应放入对应目录；移动时同时更新正文引用及生成脚本的输出目录。文件名保留原有明暗后缀。

第 1 章配图由 `scripts/draw_intersection_goals.ts` 生成，在本目录执行 `pnpm exec node scripts/draw_intersection_goals.ts`。直线方程配图由 `scripts/draw_line_equation.py` 生成，复用下述剪切脚本的 Matplotlib 环境与主题样式。

## 生成坐标系图解

`scripts/draw_shear_coordinates.py` 使用 Matplotlib 的 MathText 渲染数学标注，生成以下图解，每张都包含明暗主题：

- 坐标系变换：`static/img/segment-intersection/shear/light/shear-coordinates-light.svg`、`static/img/segment-intersection/shear/dark/shear-coordinates-dark.svg`。
- 事件顺序颠倒：`static/img/segment-intersection/shear/light/shear-order-reversal-light.svg`、`static/img/segment-intersection/shear/dark/shear-order-reversal-dark.svg`。
- 新旧横轴重合：`static/img/segment-intersection/shear/<theme>/shear-horizontal-axis-<theme>.svg`，展示横轴上的点在两套坐标中的读数相同。
- 新纵轴的五步图解：`static/img/segment-intersection/shear/<theme>/shear-axis-step-{1..5}-<theme>.svg`，依次展示选点、新横坐标、原纵坐标、原横坐标及最终位置。图中仅保留几何辅助线、符号和简短公式，中文讲解放在正文的对应步骤中。

文档通过 Docusaurus 的 `ThemedImage` 随站点主题选择图片。

上述路径中的 `<theme>` 为 `light` 或 `dark`，目录与文件名后缀保持一致。

该脚本使用 Python，因为 Matplotlib 提供的是 Python 绘图 API。从仓库根目录执行：

```bash
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
