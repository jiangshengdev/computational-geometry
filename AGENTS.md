# 项目规则入口

本主文件只存放规则文档链接及必要的适用场景说明，不直接编写具体规则正文；新增或修改的具体规则写入独立文档，再在本文件添加或更新链接。

按当前任务涉及的范围，在相关操作前读取并遵循以下规则；同时涉及多个范围时须一并遵循。

- 启动或恢复 `grill-me` / `grilling` 时，读取 [澄清流程完成门禁](docs/agents/grilling.md)。
- 编写、修改或审校数学公式与推导时，读取 [数学符号一致性规则](docs/agents/mathematical-notation.md)。
- 编写、修改或审校文章、视频的结构、标题及衔接用语时，读取 [章、篇、集与节的称呼规则](docs/agents/content-hierarchy.md)。
- 新增或调整文章、视频及界面配色时，读取 [项目颜色规则](docs/agents/colors.md)。
- 编写或修改代码、脚本前，读取 [编码、模块组织与复用规则](docs/agents/coding.md)。
- 涉及前端的工作，读取 [前端规则](web/AGENTS.md)，包括位于根目录的前端测试配置与跨层编排。
- 添加、修改或执行测试，以及选择验证范围前，读取 [测试规则](docs/agents/testing.md)。
- 涉及前后端职责、工具链、构建、测试、运行生命周期或跨层编排时，读取 [前后端职责隔离规则](docs/agents/layer-boundaries.md)；功能开发、重构、调试、诊断、测试、性能分析及临时脚本均适用。
- 修改 HTTP 请求或响应、NDJSON 轨迹、Rust 公共 API 或回放 URL 时，读取 [接口与协议一致性规则](docs/agents/protocols.md)。
- 启动开发、测试、诊断或性能测量服务前，读取 [代理端口隔离规则](docs/agents/runtime.md)。

## Agent skills

### Issue tracker

任务、规格和正式执行记录使用 CNB Issues；创建或更新前，读取 [CNB 任务记录规则](docs/agents/issue-tracker.md)。

### Triage labels

使用五个默认 triage 角色及同名 CNB 标签；设置或调整前，读取 [Triage 标签规则](docs/agents/triage-labels.md)。

### Domain docs

采用 single-context：根目录 `GLOSSARY.md` 与 `docs/adr/`；探索代码前，读取 [领域文档规则](docs/agents/domain.md)。
