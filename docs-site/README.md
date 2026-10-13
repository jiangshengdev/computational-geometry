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

正文放在 `docs/` 的 Markdown 或 MDX 文件中，侧栏由 `sidebars.ts` 维护。二级、三级标题生成文章目录；公式使用 `$...$` 或 `$$...$$`。首版仅有 `docs/shear-coefficient.mdx`，没有博客、搜索或语言切换。仓库内部 ADR、代理规则与任务记录不在本站内容目录中。

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
