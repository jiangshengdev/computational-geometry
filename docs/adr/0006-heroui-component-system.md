---
status: accepted
date: 2026-10-08
---

# HeroUI 官方组件与默认风格取代 shadcn

在已有 shadcn 控件不符合期望后，选择整体迁移到 HeroUI v3 官方组件和默认风格，替换 shadcn 控件及直接使用的 Radix 滑块，清理被替代的组件和样式。保留功能、教学语义、键盘及焦点行为与 D3/SVG 领域绘图，而不是并存两套通用交互体系。

2026-10-08 的迁移范围先保留页面布局；2026-10-09 的后续确认允许全站依据官方组件组合重新组织布局和信息分组。因此“保留旧布局”不是永久约束，也不应通过整套样式覆盖把 HeroUI 改回旧控件外观。代价是页面需要适应库的组合方式和交互 API；更换组件库不构成解决几何画布模糊的承诺。

依据：2026-10-08 最终迁移共识及 [CNB #45](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/45)，2026-10-09 全站官方组合确认及 [CNB #50](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/50)。当前组件复用边界见根目录 [AGENTS.md](../../AGENTS.md)，依赖见 [web/package.json](../../web/package.json)。
