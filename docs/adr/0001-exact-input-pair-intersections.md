---
status: accepted
date: 2026-10-07
---

# 精确有理数与原始输入线段对的交集契约

为让退化输入也有可核对的数学含义，输入、计算和输出采用精确有理数，相等、排序及共线判断不使用 epsilon。支持闭线段的共端点、端点落在线段内部、多线共点、竖直线段、共线重叠及零长度点输入，不以一般位置假设排除这些情况。

输出按原始输入的无序线段对组织，每个相交输入对恰有一个完整交集：点或非零长度重叠区间。完全重复或端点反向的输入仍保留各自身份；不按几何位置聚合，不把一个输入对的重叠区间切成多个结果。因此三线共点产生三对结果，输出量按相交输入对数计算，可能达到平方级；精确计算也承担任意精度数值运算的成本。

依据：2026-10-07 算法规格讨论逐项选择完整输入、按输入对输出、精确有理数、接受零长度输入及保留重复身份；形成 [CNB #8](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/8)。共享精确坐标见 [src/geometry.rs](../../src/geometry.rs) 的 `Point` 与 `Rational`；线段相交模型 `Segment`、`Intersection`、`Geometry` 见 [geometry.rs](../../src/algorithms/segment_intersection/geometry.rs)，`intersections` 与唯一扫描状态、阶段编排见 [src/algorithms/segment_intersection/bo/sweep.rs](../../src/algorithms/segment_intersection/bo/sweep.rs)；公共入口仍由 [src/lib.rs](../../src/lib.rs) 导出。
