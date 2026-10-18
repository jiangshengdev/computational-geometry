# 计算几何

首页 `/` 提供算法选择。BO 案例列表位于 `/bo`，结果页位于 `/bo/cases/:caseId`，教学页位于 `/bo/cases/:caseId/learn`。前端保存预设线段，通过 Axum 服务调用精确 BO 库，提供配对选择、精确坐标详情、等比例缩放、平移和真实 Rust 执行轨迹的教学回放。

教学链接可携带步骤，例如 `/bo/cases/crossing/learn?step=2`；刷新和分享可恢复位置，步骤更新替换当前浏览器历史项。目标步骤尚未生成时等待真实轨迹，非法或越界步骤显示明确错误。旧 `/cases/:caseId` 和 `/cases/:caseId/learn` 不再提供 BO 功能，也不重定向。

`/convex-hull` 是明确标注“尚未实现”的凸包占位页，不提供计算或计算 API。算法按“几何问题 → 具体算法”组织：前后端的 BO 专属实现分别位于 `web/src/algorithms/segment-intersection/bo/` 和 `src/algorithms/segment_intersection/bo/`；线段相交的公共类型与案例位于问题目录。凸包占位页位于 `web/src/algorithms/convex-hull/`，后端 Andrew 单调链实现位于 `src/algorithms/convex_hull/andrew/`。前端算法相关测试镜像归入 `web/tests/algorithms/segment-intersection/`，BO 教学与计算页面测试位于其 `bo/` 子目录。应用入口负责路由组合，基础几何与通用应用组件继续共享。

## 本地使用

需要已安装 Rust、Node.js、pnpm 和项目依赖。依赖安装和原生构建由使用者本人执行。

在仓库根目录由使用者运行：

```sh
cargo run --offline
```

另一个终端：

```sh
cd web
pnpm dev --host 127.0.0.1
```

打开 Vite 输出的地址。服务默认只监听 `127.0.0.1:3001`。可用 `BO_PORT` 改服务端口，并用 `BO_API_URL` 配置 Vite 代理的服务地址。修改 Rust 后必须重新构建并重启服务；修改前端会由 Vite 更新。网页的 `/api` 请求通过 Vite 同源代理转发。`vite preview` 不是本地服务的替代品。

## Vercel：通过 GitHub 部署

前后端部署为一个 Vercel 项目。Rust 入口参考 [Vercel 官方 Axum 模板](https://github.com/vercel/examples/tree/main/rust/axum)，使用 `VercelLayer` 调用现有 `computational_geometry::http::router()`。本地监听端口的入口仍为 `src/main.rs`，算法和 HTTP 契约共用同一实现。

在 Vercel 导入对应 GitHub 仓库时：

- Root Directory 选择仓库根目录（不要选择 `web`）。
- Framework Preset 选择 **Other**；安装、构建命令和输出目录使用根目录 `vercel.json`。
- Node.js 选择 **24.x**。云端安装步骤使用固定的 pnpm `11.8.0` 和现有 lockfile。

Vercel 构建 `api/axum.rs` 为 Rust Function，并将 `web/dist` 发布为静态资源。`/api` 和 `/api/*` 优先交给 Rust，未知 API 保持 HTTP 404；其余路径优先匹配静态文件，再回退到 `index.html`，支持直接打开或刷新案例和教学页面。浏览器继续使用同源 `/api/bo/intersections`，无需设置 `BO_API_URL`。

GitHub 接入后的首次 Preview 部署需检查：案例页直接访问和刷新正常、JS/CSS 能加载、`POST /api/bo/intersections` 返回 JSON、非法输入返回 400、未知 API 返回 404。Rust Runtime 目前为 Beta；本地检查不替代 Vercel 云端构建和路由验收。

## HTTP 契约

`POST /api/bo/intersections`，`Content-Type: application/json`：

这是唯一 BO 计算入口；旧 `POST /api/intersections` 返回 404，不提供重定向或兼容转发。

```json
{
  "segments": [
    {
      "start": {"x": {"numerator": "0", "denominator": "1"}, "y": {"numerator": "0", "denominator": "1"}},
      "end": {"x": {"numerator": "3", "denominator": "2"}, "y": {"numerator": "1", "denominator": "1"}}
    }
  ]
}
```

分子、分母均为十进制整数字符串，可带符号；分母不得为零。服务规范化分数，保留精确数学值和每条输入的独立身份。接口接受合法的任意集合，不接收案例 ID。绘图近似值不参与请求、配对或数学相等判断。

成功返回 `{"intersections": [...]}`。每个成员的 `segments: [i, j]` 是原始输入顺序的零基索引；`geometry` 为 `{"type":"point","point":...}` 或 `{"type":"overlap","start":...,"end":...}`，坐标采用上述字符串有理数。区间端点方向与结果顺序不属于数学契约。空集合、单条输入及无交点返回成功空数组。

非法结构、整数或零分母返回 HTTP 400 和 `{"error":"..."}`；计算任务失败返回 HTTP 500。页面将请求失败与成功空结果分别显示，切换案例会取消旧请求并丢弃其迟到结果。

## 验证

在仓库根目录一键运行全部检查：

```sh
just check
```

只运行端到端测试，或筛选用例：

```sh
just test-e2e
just test-e2e --grep 普通交叉
```

这两个入口由使用者运行。根目录 `playwright.config.ts` 负责联合编排：通过 `cargo run --offline` 构建并启动后端，使用系统分配的临时端口，等待后端输出监听地址后通过 `BO_API_URL` 传给前端，再运行无头 Playwright。测试结束、失败或中断时由 Playwright 清理其启动的服务进程；不占用已有开发后端的端口。

Rust 测试独立运行，不依赖 Node.js、pnpm 或浏览器。在仓库根目录执行：

```sh
just test
```

前端类型检查和 lint：

```sh
cd web
pnpm typecheck
pnpm lint
```

浏览器 E2E 直接运行 Playwright，通过 HTTP 连接独立启动的后端。先按“本地使用”启动后端，然后在 `web` 目录执行：

```sh
pnpm test:e2e
```

前端测试不调用 Cargo，也不管理后端进程。默认连接 `http://127.0.0.1:3001`，可通过 `BO_API_URL` 指定后端地址。Playwright 以 `--port 0` 启动独占的 Vite 测试服务，捕获实际地址作为测试的 `baseURL`，结束后关闭。一键 E2E 的前后端均使用系统分配的临时端口，不占用开发后端的 `3001`、Vite 开发服务的 `5173` 或 preview 的 `4173`。需要已安装 `@playwright/test` 及匹配的 Chromium。

使用 Playwright 原生参数筛选测试，例如在 `web` 目录执行：

```sh
pnpm test:e2e --grep 普通交叉
```

`web` 内的命令只负责前端，使用已有后端；根目录的入口负责自动启动和清理后端。`just check` 显式汇总类型检查、lint、Rust 测试和 E2E，无需手动启动后端。

测试采用独立数学预期核对 HTTP 输出、配对身份和选择联动；受控响应仅用于错误及迟到响应测试。截图和测试产物写入系统临时目录，不作为算法正确性证明。
