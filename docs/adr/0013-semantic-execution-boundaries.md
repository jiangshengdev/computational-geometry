---
status: accepted
date: 2026-10-12
---

# 以执行边界与完整状态决定停步和合并

显示位置重合不代表执行状态重复。已进入的 `if` 分支正常结束时保留 `}` 前后的可观察状态；未进入的分支直接跳过，也不为提前转移虚构正常块结束路径。保留 `return` 执行前与返回值产生后、恢复调用方前的两个阶段，让学习者看到块作用域和返回过程的差别。

只有相邻停点属于同一执行边界，且画面语义、变量值和变量状态均相同时才合并，并保留各自边界含义，例如 `if` 结束后与 `return` 前、内层 `if` 结束后与外层 `for` 结束前。画面语义包含执行标记、画布数据与当前上下文；变量状态包含未赋值、可用性和作用域。不同迭代或调用不能因内容相似而合并，离开作用域后的变量保留名称与类型并显示不可用，不继续充当有效值。

相较按行号去重或一律跳过结束括号，这要求轨迹表达更完整的执行状态，但避免丢失作用域变化和返回值观察。全部导航入口及流式回放共享同一可观察序列；“画面相同”按语义状态核验，不引入截图、像素或样式断言。

依据：2026-10-12 对重合停点的讨论先后明确括号前后、同边界合并，以及必须同时满足画面和变量状态相同，形成 [CNB #109](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/109)。当前真实观察点见 [src/algorithms/segment_intersection/bo/sweep/](../../src/algorithms/segment_intersection/bo/sweep/)，完整状态比较见 [src/algorithms/segment_intersection/bo/teaching.rs](../../src/algorithms/segment_intersection/bo/teaching.rs) 的 `SweepStep`；[src/algorithms/segment_intersection/bo/trace_publication.rs](../../src/algorithms/segment_intersection/bo/trace_publication.rs) 负责事件参与者补齐后合并、交付坐标恢复与发布，保留尾状态仍使用扫描坐标。交付记录见 [#110](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/110)、[#111](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/111)。
