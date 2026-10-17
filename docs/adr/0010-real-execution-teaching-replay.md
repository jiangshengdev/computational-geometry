---
status: accepted
date: 2026-10-11
---

# 真实 Rust 轨迹驱动精简教学代码

教学目标是理解算法逻辑，选择浏览器回放真实 Rust 执行轨迹，展示 Rust 风格的精简教学代码，而非集成 RustRover、建立原生调试会话或在前端复制算法。教学代码保留核心控制流并去除工程噪声，采用 Shiki 高亮，不使用 CodeMirror；高亮库不负责推断执行位置和变量语义。

代码边界、变量、调用信息、hover 与画布读取同一个小步状态，前进与回退共同更新或恢复；回退是查看记录，不是反向执行 Rust。语句间边界表示此前操作已完成，按实际分支和循环移动，以不参与排版的覆盖层呈现。为保证可信度，需要在真实计算路径维护观察点与教学代码映射，不能仅把粗步骤映射成行号。

动态值只来自当前执行时刻和对应作用域，不能提前显示未来返回值，或借用其他调用及迭代的值。2026-10-11 后续确认：被遮蔽变量保留遮蔽前最后值并标注“已遮蔽”，不与其他原因的不可用混淆；控制流解释位于对应关键字的 hover。后续调用范围和停步规则见 [ADR 0012](0012-call-aware-replay-navigation.md)、[ADR 0013](0013-semantic-execution-boundaries.md)。

依据：2026-10-11 小步回放讨论及 [CNB #84](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/84)，同日关于遮蔽值和控制流 hover 的完整共识确认。真实扫描编排见 [src/algorithms/bo/sweep.rs](../../src/algorithms/bo/sweep.rs)，各阶段观察点见 [src/sweep/](../../src/sweep/)，共用惰性记录接口见 [src/algorithms/bo/sweep/observation.rs](../../src/algorithms/bo/sweep/observation.rs)，教学快照、变量和调用构造见 [src/algorithms/bo/teaching.rs](../../src/algorithms/bo/teaching.rs)。轨迹收尾与发布见 [src/algorithms/bo/trace_publication.rs](../../src/algorithms/bo/trace_publication.rs)，前端教学模型与唯一解码实现见 [web/src/algorithms/bo/learning/trace.ts](../../web/src/algorithms/bo/learning/trace.ts)。展示见 [web/src/algorithms/bo/learning/ExecutionPanel.tsx](../../web/src/algorithms/bo/learning/ExecutionPanel.tsx)、[web/src/algorithms/bo/learning/executionCode.ts](../../web/src/algorithms/bo/learning/executionCode.ts)。
