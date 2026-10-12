# 架构决策记录

本目录于 2026-10-13 根据本项目可读取的 2026-10-07 至 2026-10-12 用户聊天重建，并与当前源码、本地提交及相关 CNB 记录交叉核对。编号用于稳定引用；各文档日期是历史决策日期，不是文档创建日期。

只收录有明确选择、具有长期影响且需要解释取舍的决定。聊天中的助手建议、未确认选项和普通界面调整不自动成为 ADR；当前实现用于核对，不用于倒推历史理由。来源仅保留日期、脱敏的确认摘要、项目记录及代码位置，不复制私人聊天原文或本机路径。

| ADR | 决策 |
| --- | --- |
| [0001](0001-exact-input-pair-intersections.md) | 精确有理数与原始输入线段对的交集契约 |
| [0002](0002-independent-validation-api.md) | 独立暴力求交与显式校验 API |
| [0003](0003-rust-http-computation-boundary.md) | 前端持有案例，Rust HTTP 服务负责求交 |
| [0004](0004-d3-svg-rendering.md) | D3 与 SVG 承担领域绘图 |
| [0005](0005-replay-position-in-url.md) | URL 记录教学位置，步骤不累积浏览器历史 |
| [0006](0006-heroui-component-system.md) | HeroUI 官方组件与默认风格取代 shadcn |
| [0007](0007-root-integration-orchestration.md) | 两层独立拥有工具链，根目录编排集成 |
| [0008](0008-single-vercel-project.md) | 单个 Vercel 项目复用 Rust HTTP 路由 |
| [0009](0009-power-of-two-affine-projection.md) | 默认适配使用二次幂等比例投影 |
| [0010](0010-real-execution-teaching-replay.md) | 真实 Rust 轨迹驱动精简教学代码 |
| [0011](0011-progressive-cancellable-traces.md) | 普通结果与按需渐进教学轨迹分离 |
| [0012](0012-call-aware-replay-navigation.md) | 按真实调用关系导航并保留闭包外部代码 |
| [0013](0013-semantic-execution-boundaries.md) | 以执行边界与完整状态决定停步和合并 |

任务、规格和交付状态仍以 CNB Issues 为权威，本目录不复制实施清单或验收报告。`accepted` 表示历史决定已获接受，不代表本次重新执行了功能、性能或云端部署验收。

后续澄清在相关 ADR 中保留演变说明：HeroUI 迁移最初保留布局，后续允许按官方组合重组；函数步过不能一概过滤返回值停点；闭包步入保留所属教学片段。早期规格中的窄屏、Firefox 及外观测试要求不在此恢复，现行支持与测试边界见根目录 `AGENTS.md`。
