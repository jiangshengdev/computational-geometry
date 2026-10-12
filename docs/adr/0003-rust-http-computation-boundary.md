---
status: accepted
date: 2026-10-07
---

# 前端持有案例，Rust HTTP 服务负责求交

已有精确 Rust 算法不在 TypeScript 中重写。比较浏览器内 WASM、本地 Rust HTTP 服务和预生成结果文件后，选择由浏览器发送完整几何输入，经 HTTP 调用现有 Rust 求交库；案例目录归前端，服务提供通用求交接口，而不是仅接受服务端内置案例 ID。

精确有理数在接口中无损传递，原始输入索引和完整重叠区间保留；数值近似只服务于绘图位置。这个边界使结果与后续教学共享真实计算来源，代价是交互依赖服务及请求生命周期，需要维护明确的序列化协议。

依据：2026-10-07 在三种计算接入方式中选择 HTTP，随后选择前端案例加完整坐标请求；见 [CNB #17](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/17)、[#18](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/18)。当前边界见 [src/http.rs](../../src/http.rs)、[web/src/geometry.ts](../../web/src/geometry.ts)、[web/src/presets.ts](../../web/src/presets.ts)。
