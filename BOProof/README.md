# BOProof

有限有理输入的 BO 剪切数学模型。权威规格为 [CNB #278](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/278)，
实施票为 #279–#283。本文件解释库接口与数学前提；执行状态以 CNB 为准。

## 检查入口

在本目录使用已安装的固定工具链与依赖执行：

```sh
lake --no-cache build BOProof
```

固定版本见 `lean-toolchain`、`lakefile.toml` 与 `lake-manifest.json`：Lean/mathlib
`v4.36.0-rc1`。不安装、升级或更新依赖。库入口导入全部证明及 `BOProof.Trust`；
后者枚举 `BOProof` 命名空间下全部声明并检查传递公理依赖，任何超出
`propext`、`Classical.choice`、`Quot.sound` 的依赖（包括 `sorryAx`）都会使构建失败，
并打印主要目标定理的依赖。检查源码中的占位与新增公理仍是审查的一部分。

## 模型与前提

`Input n = Fin n → InputSegment` 保留身份；重复几何输入不被合并。
端点属于 `ℚ × ℚ`，`closedSegment` 使用实参数 `t ∈ [0,1]`，因此包含无理内部点。
`shear s (x,y) = (x+s*y,y)` 的几何定理适用于任意有理 `s`。

`LegalDenominator input D` 要求正整数 `D` 被所有坐标正分母整除。
`commonDenominator_legal` 构造分母乘积；`coordinateBound` 是自然数表示的整数界，
精确定义为 `max 1` 与全部放大后整数坐标绝对值的最大值。空输入得到 `D=1`、`M=1`。
并未要求输入本身非空、非退化或处于一般位置。

`IsEvent` 只包含端点及非平行段的实际交点；后者必须属于两条实数闭线段。
`OriginalEvent` 是这些事件经正缩放的原像，`original_event_iff` 证明其等价于
原坐标下的同一定义。非平行条件是方向行列式非零；`nonparallel_nonzero` 排除
对此公式使用零长度段。平行或共线输入不进入除法公式，其端点仍属于事件。
`collinear_overlap` 证明共线交集为空或是以输入端点为边界的闭线段；
`overlap_endpoints_are_events` 将两个边界纳入事件，未将重叠内部无限多个点纳入。

## 规格与定理对应

下表中的文字推导路径相对于 `docs-site/docs/segment-intersection/shear/`。

| 票 | 数学要求 | 公开定理 | 文字推导 |
| --- | --- | --- | --- |
| #279 | 可逆、实数闭线段、完整交集及逆向还原 | `shear_inverse`、`shear_segment`、`shear_segment_intersection`、`restore_intersection`、`closedSegment_self` | `intersection.mdx` |
| #280 | 任意合法公共分母、乘积构造、整数最大值 | `commonDenominator_legal`、`integerCoordinate_cast`、`integerCoordinate_bound`、`coordinateBound_pos`、两个 `_empty` 定理 | `denominator.mdx` |
| #280 | 实际交点有理性、正分母 ≤ 8M² | `line_equation`、`determinant_ne_zero`、`determinant_bound`、`actual_crossing`、`event_rational_den_bound` | `denominator.mdx` |
| #280 | 有限事件、重叠边界、点输入、高度差 ≤ 2M | `event_finite`、`overlap_endpoints_are_events`、`endpoint_mem`、`event_height_difference` | `special-cases.mdx`、`order.mdx` |
| #281 | 间距 ≥ 1/(64M⁴)、具体系数安全性 | `rational_separation`、`event_separation`、`safeCoefficient_bounds` | `order.mdx` |
| #281 | 字典序严格保序、不同位置分离、重合仍重合 | `event_lex_order`、`event_x_injective` | `special-cases.mdx` |
| #282 | 缩放交换、原坐标事件覆盖与保序 | `scale_shear`、`integerInput_segment`、`original_event_iff`、`original_positive_order` | `special-cases.mdx` |
| #282 | 两分支完整后置条件 | `chosen_postconditions`、`chosen_nonvertical`、`chosen_zero` | `index.mdx`、`special-cases.mdx` |
| #283 | 全部声明及传递信任依赖 | `BOProof.Trust`，由库入口导入 | 本库验收入口 |

`chosen_postconditions` 仅以有限有理输入为参数，没有外加分母界、间距、安全性、
事件覆盖或一般位置假设。存在非零竖直段时选择 `1/[256(M+1)^5]`，证明严格保序和
不同事件位置的横坐标分离；否则选择 `0`，证明恒等变换。
两分支均证明全部非零段非竖直，以及完整交集保持与逆向还原。
零系数分支不声称分离同 x 不同 y 的事件。零长度输入由 `closedSegment_self` 覆盖。

## 证明边界

这是数学模型的内核检查，不是 Rust 实现与 Lean 的精化证明。
不涵盖 BO 扫描状态、事件预约完备性、输出枚举唯一性或复杂度，
不修改生产剪切系数，也不以有限数值案例替代全称证明。
