## Agent skills

### Issue tracker

任务和规格记录在本仓库的 CNB Issues，使用 CNB CLI 操作。
见 `docs/agents/issue-tracker.md`。

### Triage labels

使用五个默认 triage 标签。
见 `docs/agents/triage-labels.md`。

### Domain docs

采用 single-context 布局：根目录 `CONTEXT.md` 和 `docs/adr/`。
探索代码前遵循 `docs/agents/domain.md`。

## 前端溢出与滚动验证

- 溢出与滚动测试使用默认字号下的真实有效长内容，禁止通过增大根字号或局部字号制造溢出。
- 涉及计算结果时，使用真实 API 计算产生的结果。
