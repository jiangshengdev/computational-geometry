# 计算几何

[English](README.md) | 简体中文

本项目包含 Rust 精确平面几何算法、交互式网页应用、中文数学文章、Lean 证明和 Remotion 教学视频工程。网页将几何输入发送给 Rust HTTP 服务；绘图近似不代替精确计算。

## 主要功能

- **线段求交（Bentley–Ottmann）**：以精确有理数计算原始输入无序线段对的完整交集，支持端点接触、多线共点、竖直线段、共线重叠、重复输入及零长度点输入。每个相交输入对输出一个点或完整重叠区间，保留输入身份。
- **凸包（Andrew 单调链）**：精确计算凸包，明确处理重复位置、共线输入和退化点集。
- **凸多边形求交**：精确交集表示为空、点、线段或多边形。
- **多边形三角剖分**：校验简单多边形边界，通过单调分割与栈式三角剖分生成以原始顶点编号表示的三角形。
- **交互探索**：四类问题均有预设案例与结果页；BO、凸包和凸多边形求交还支持真实 Rust 执行轨迹的教学回放，URL 保存回放位置。三角剖分提供结果页，没有教学回放路由。
- **讲解与证明**：独立的中文 Docusaurus 文档站、BO 剪切数学的 Lean 模型，以及各自维护制作与验收记录的视频工程。

应用首页为 `/`，案例列表分别位于 `/bo`、`/convex-hull`、`/convex-polygon-intersection` 和 `/triangulation`。求交结果、扫描事件、执行轨迹与教学回放含义不同，见[领域术语](GLOSSARY.md)。

## 目录导航

| 范围 | 入口 |
| --- | --- |
| 网页应用、本地使用、HTTP 与轨迹契约 | [web](web/README.zh-CN.md) |
| 中文文章站、构建与维护 | [docs-site](docs-site/README.zh-CN.md) |
| Rust 库与算法公开 API | [src/lib.rs](src/lib.rs) |
| BO 动态同线组、身份、成本与轨迹生产 | [BO 算法](src/algorithms/segment_intersection/bo/README.zh-CN.md) |
| 剪切模型、定理对应与证明边界 | [BOProof](BOProof/README.zh-CN.md) |
| 视频公共基础能力与验证边界 | [videos/shared](videos/shared/README.zh-CN.md) |
| Bentley–Ottmann 视频公共资源 | [videos/bentley-ottmann](videos/bentley-ottmann/README.zh-CN.md) |
| 七个剪切视频工程 | [videos/shear](videos/shear/README.zh-CN.md) |
| 架构决策 | [ADRs](docs/adr/README.md) |

所选主要模块 README 提供英文与中文版本。文章正文、单集视频 README、口播、字幕及内部文档保持原有语言。

## 本地运行

使用已有仓库，由使用者预先准备 Rust、Node.js、pnpm 和项目依赖。将 `/path/to/computational-geometry` 替换为实际仓库目录；版本要求与准备细节见模块 README。

启动 Rust 服务：

```sh
cd /path/to/computational-geometry
cargo run --offline
```

另开终端启动前端，打开 Vite 输出的地址：

```sh
cd /path/to/computational-geometry/web
pnpm run dev --host 127.0.0.1
```

后端默认监听 `127.0.0.1:3001`。`BO_PORT` 修改服务端口，`BO_API_URL` 指定 Vite 转发 `/api` 的地址。修改 Rust 后需要重新构建并重启。前后端各自维护运行生命周期；需要联合测试时，由根目录 [justfile](justfile) 入口编排。

文章站独立运行，不需要后端：

```sh
cd /path/to/computational-geometry/docs-site
pnpm run start --host 127.0.0.1
```

## 检查与交付边界

已有固定 Lean 工具链和依赖时，通过以下入口检查形式化模型：

```sh
cd /path/to/computational-geometry
just proof
```

其他检查入口及覆盖范围见[前端验证](web/README.zh-CN.md#验证)、[文档站构建与检查](docs-site/README.zh-CN.md#构建与检查)和[公共视频验证](videos/shared/README.zh-CN.md#修改与验证)。按影响范围选择检查；视频命令与已安装浏览器要求见各集说明。

Lean 模型检查剪切数学，不证明 Rust 精化、BO 扫描完备性或复杂度。部署配置不代表云端项目已上线。视频内容、类型和布局检查不能代替试听、成片音画同步或可见桌面验收。具体边界见各模块与各集说明；规格、任务和执行记录以 [CNB Issues](https://cnb.cool/jiangshengdev/computational-geometry/-/issues) 为准。
