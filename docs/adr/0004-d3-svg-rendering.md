---
status: accepted
date: 2026-10-08
---

# D3 与 SVG 承担领域绘图

结果查看器还需要扩展为扫描线教学：事件、活动顺序、线段、交点和逐步状态必须能够精细关联。比较手写基础绘图以及 JSXGraph、Plotly、ECharts 等方案后，采用 D3 与 SVG 作为结果和教学视图的共同基础，利用成熟库的坐标及交互能力，同时保留领域图层的组织自由。

这比直接使用现成图表需要更多图层和教学交互代码，但避免把几何对象及逐步状态强行转换成通用数据系列。D3 负责展示，不接管精确求交、输入身份或事件判定；通用界面控件遵循 [ADR 0006](0006-heroui-component-system.md)。

依据：2026-10-07 要求使用成熟库并比较后续教学扩展性，随后进入 D3 实现；2026-10-08 在 HeroUI 迁移共识中明确确认保留 D3/SVG 绘图及教学动画，见 [CNB #45](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/45)。绘图组合见 [web/src/algorithms/bo/geometry/GeometryView.tsx](../../web/src/algorithms/bo/geometry/GeometryView.tsx)，视口生命周期、标签布局与对象交互分别见 [useGeometryViewport.ts](../../web/src/algorithms/bo/geometry/useGeometryViewport.ts)、[useGeometryLabels.ts](../../web/src/algorithms/bo/geometry/useGeometryLabels.ts)、[useGeometryInteraction.ts](../../web/src/algorithms/bo/geometry/useGeometryInteraction.ts)；统一投影见 [projection.ts](../../web/src/geometry/projection.ts)。
