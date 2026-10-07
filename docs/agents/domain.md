# Domain docs

## 探索前读取

- 根目录 `CONTEXT.md`：领域术语和上下文。
- `docs/adr/`：与当前工作相关的架构决策。

文件不存在时静默继续，不因缺失而要求预先创建。
由 `domain-modeling` 在术语或决策实际明确时按需创建。

## 布局

本仓库采用 single-context：

- `CONTEXT.md`
- `docs/adr/`
- `src/`

## 术语一致性

Issue 标题、重构建议、假设和测试名称中的领域概念，
使用 `CONTEXT.md` 定义的术语，避免使用明确排除的同义词。

需要的概念尚未定义时，先判断是否引入了不必要的新名称；
确有术语缺口时，交由 `domain-modeling` 处理。

## ADR 冲突

结论或建议与已有 ADR 冲突时，明确指出对应 ADR、
冲突内容及重新讨论的理由，不静默覆盖既有决策。
