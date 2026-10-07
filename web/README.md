# BO 结果查看器

前端保存预设线段，通过本地 Axum 服务调用现有精确 BO 库。页面支持配对选择、精确坐标详情、等比例缩放和平移。交点标记与完整重叠区间都来自本次 HTTP 计算；不提供扫描过程、输入编辑或暴力对照。

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

打开 Vite 输出的地址。服务默认只监听 `127.0.0.1:3001`。可用 `BO_PORT` 改服务端口，并用 `BO_API_URL` 配置 Vite 代理的服务地址。修改 Rust 后必须重新构建并重启服务；修改前端会由 Vite 更新。网页的 `/api` 请求通过 Vite 同源代理转发。静态部署时需要另行配置该代理，`vite preview` 不是本地服务的替代品。

## HTTP 契约

`POST /api/intersections`，`Content-Type: application/json`：

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

```sh
cd web
pnpm typecheck
pnpm lint
pnpm test:e2e
```

`test:e2e` 运行普通 Rust 集成测试：绑定临时回环端口，启动真实 Axum router，然后运行无头 Playwright。Playwright 启动独占的 Vite 测试服务（端口 4173），结束后关闭；不调用 `cargo build` 或 `cargo run`。需要已安装 `@playwright/test` 及匹配的 Chromium。

在仓库根目录运行 `cargo test --offline` 包含原有算法测试及上述完整浏览器通路。`BO_E2E_GREP` 可筛选 Playwright 测试，例如：

```sh
BO_E2E_GREP=普通交叉 cargo test --offline --test web_e2e -- --nocapture
```

测试采用独立数学预期核对 HTTP 输出、配对身份和选择联动；受控响应仅用于错误及迟到响应测试。截图和测试产物写入系统临时目录，不作为算法正确性证明。
