---
status: accepted
date: 2026-10-07
---

# 独立暴力求交与显式校验 API

为发现 Bentley–Ottmann 实现中的漏报和几何错误，将独立暴力求交从测试参照提取为可调用的 Rust 公共 API，并提供统一校验入口；不要求每个调用方自行比较两组结果。暴力实现枚举全部 `i < j` 输入对，几何判定独立于扫描线，接受相同的精确输入契约。

校验报告保留漏报、多报、重复配对和交集几何不一致；比较可以忽略输出顺序、配对方向和重叠端点呈现顺序，但规范化不得掩盖重复输出。普通求交和教学仍使用真实扫描线，暴力算法不会作为自动 fallback 或用于修正扫描线结果；显式校验承担两套算法的成本，结果一致也不是无条件的正确性证明。

依据：2026-10-07 明确选择公共暴力 API 和统一校验 API，见 [CNB #15](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/15)、[#16](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/16)；2026-10-10 再次要求优化不能丢失其暴力性。当前实现见 [src/brute_force.rs](../../src/brute_force.rs)、[src/validation.rs](../../src/validation.rs)。它不是仅在测试构建中存在的接口。
