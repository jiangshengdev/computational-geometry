---
status: accepted
date: 2026-10-09
---

# 默认适配使用二次幂等比例投影

为改善初始绘图的坐标落点，同时保持几何关系，初始适配、窗口变化和重置选择能完整容纳图形的最大 `2ⁿ` 投影比例，允许负指数。约束的是每个坐标单位对应的比例，不是完整 SVG 的宽高；横纵使用相同比例，只对整体投影原点作整数定位，不逐点吸附或修改精确几何数据。

相较尽量填满容器的任意比例，这一选择接受额外留白及跨阈值时的阶梯变化，绘图区居中。手动缩放仍保持连续，允许偏离 `2ⁿ`；不承诺分数坐标或所有线条完美对齐像素。具体留白属于显示设置，不把它当作几何正确性条件。

依据：2026-10-09 明确选择严格最大可容纳 `2ⁿ`、连续手动缩放和居中，最终共识获确认，本地提交 `3bcf448`。当前统一投影见 [web/src/geometry/projection.ts](../../web/src/geometry/projection.ts)，交互缩放、尺寸观察与重置见 [web/src/algorithms/segment-intersection/bo/geometry/useGeometryViewport.ts](../../web/src/algorithms/segment-intersection/bo/geometry/useGeometryViewport.ts)。
