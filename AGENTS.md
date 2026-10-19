# 项目规则入口

按当前任务涉及的范围，在相关操作前读取并遵循以下规则；同时涉及多个范围时须一并遵循。

- 创建或更新任务、规格及正式执行记录前，读取 [CNB 任务记录规则](docs/agents/issue-tracker.md)。
- 设置或调整任务分类标签前，读取 [Triage 标签规则](docs/agents/triage-labels.md)。
- 探索代码前，读取 [领域文档规则](docs/agents/domain.md)。
- 启动或恢复 `grill-me` / `grilling` 时，读取 [澄清流程完成门禁](docs/agents/grilling.md)。
- 编写或修改代码、脚本前，读取 [编码、模块组织与复用规则](docs/agents/coding.md)。
- 涉及前端的工作，读取 [前端规则](web/AGENTS.md)，包括位于根目录的前端测试配置与跨层编排。
- 添加、修改或执行测试，以及选择验证范围前，读取 [测试规则](docs/agents/testing.md)。
- 涉及前后端职责、工具链、构建、测试、运行生命周期或跨层编排时，读取 [前后端职责隔离规则](docs/agents/layer-boundaries.md)；功能开发、重构、调试、诊断、测试、性能分析及临时脚本均适用。
- 修改 HTTP 请求或响应、NDJSON 轨迹、Rust 公共 API 或回放 URL 时，读取 [接口与协议一致性规则](docs/agents/protocols.md)。
- 启动开发、测试、诊断或性能测量服务前，读取 [代理端口隔离规则](docs/agents/runtime.md)。
