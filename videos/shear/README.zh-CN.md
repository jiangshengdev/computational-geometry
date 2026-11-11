# 剪切变换视频系列

[English](README.md) | 简体中文

本目录包含围绕线段求交中剪切变换的七个 Remotion 视频工程。下表按已有集数排列，链接到各集中文工程说明。每集独立维护内容、配音素材、时间线和制作入口；本总览不新增教学内容或制作任务。

## 各集入口

| 集数 | 工程说明 | 整集 composition |
| --- | --- | --- |
| ① | [剪切如何改变坐标](shear-intuition/README.md) | `ShearIntuition` |
| ② | [剪切系数为什么不能随便选](shear-coefficient/README.md) | `ShearCoefficient` |
| ③ | [统一缩放与坐标范围](shear-integer-coordinates/README.md) | `ShearIntegerCoordinates` |
| ④ | [从消元法到分母上界](shear-intersection-denominator/README.md) | `ShearIntersectionDenominator` |
| ⑤ | [从事件间距到安全系数](shear-safe-coefficient/README.md) | `ShearSafeCoefficient` |
| ⑥ | [特殊情况与原坐标](shear-special-cases/README.md) | `ShearSpecialCases` |
| ⑦ | [不丢交点，不添交点](shear-preserves-intersections/README.md) | `ShearPreservesIntersections` |

## 使用与维护

工具要求、可用命令、分段 composition、素材位置和当前验收状态均见所选单集 README。公共职责与保留差异见[视频公共基础模块](../shared/README.zh-CN.md)；制作操作见[工程操作说明](../../docs/agents/videos/operations.md)，并遵循[视频工程规则](../AGENTS.md)。命令从具体单集目录执行，不从本系列目录执行。各集复用仓库公共基础能力，不依赖相邻视频工程。

对应文章从[剪切专题](../../docs-site/docs/segment-intersection/shear/index.mdx)进入。[BO 算法契约](../../src/algorithms/segment_intersection/bo/README.zh-CN.md)与 [BOProof 数学模型](../../BOProof/README.zh-CN.md)分别说明实现和证明边界。教学图示不能代替真实执行轨迹。

已有工程文件以及内容、音频解码、类型或无头布局检查通过，不等于完整试听、成片音画同步、可见桌面验收或发布完成。具体边界以各集记录及 CNB 任务为准；本次导航更新不生成音频、不渲染或导出视频，不改变单集验收状态。
