# 从事件间距到安全系数

剪切系数为什么有五次方？一步步推导那个带 256 的公式｜剪切变换⑤

制作与验收遵循 [视频工程规则](../AGENTS.md)。当前制作范围为 [#232](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/232) 代表样例，权威规格为 [#231](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/231)。默认 composition `Shear232` 包含回顾、具体分数、分子下界、分母乘积、倒数思考题和间距结论六页。#233–#235 尚未实施，须等待用户明确确认样例。

## 配置与依赖

复用已完成工程 `videos/shear-coefficient` 的 Remotion 与 TypeScript 配置，参考配置提交为 `43e47fa`。输出采用公共[默认制作配置](../../docs/agents/videos/configuration.md#默认制作配置)。

- Remotion 4.0.538；Node.js ^22.18.0 或 >=24。
- 依赖与参考工程一致，包括 KaTeX、Azure Speech SDK 及 Node/KaTeX 类型声明。
- 保留已批准的 `allowBuilds.esbuild: true`。

## 命令

安装、预览、检查和打包见公共[基础命令](../../docs/agents/videos/operations.md#基础命令)。

在本目录执行：

```sh
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:audit-narration
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:check-layout --screenshots
```

布局检查前将 `REMOTION_BROWSER_EXECUTABLE` 设为已安装且匹配 Remotion 版本的 Chrome Headless Shell；脚本先核验实际版本，不下载浏览器。检查通过独立临时端口和无头浏览器访问生产组件；`--shots=232-16,232-17` 可限定受影响片段。浏览器截图仅用于教学核对，不渲染或导出视频。

配音入口复用公共制作流程，`--resume=<日志给出的临时目录>` 只复用音色、完整 SSML、格式与音频哈希一致的片段。`video:captions` 依据正式实测时间重建字幕。整句音频需独立试听，文本、解码与对齐通过不能替代试听。当前未接入全片导出命令。

## 参考能力对应

本地核验基线为 `f5c7304`；原配置参考提交 `43e47fa` 存在。实际检查 `shear-coefficient/src/TeachingPage.tsx`（最近相关提交 `b0f6d9c`）、其分镜及已迁移的公共实现；同时核对第④集的公共模块接入方式，不导入其教学内容。

| 能力                     | 参考实现与本集对应                                               | 本集差异                                                   |
| ------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| 字幕样式、短句与静默保留 | `shared/ui/Subtitles`、`shared/speech/captions`、`shot-timeline` | 独立字幕文案；思考期间保留题目及字幕                       |
| 数学与中文混排           | `shared/ui/MathText`、`Latex` → 本集 `MathText`                  | 本集不引入希腊字母；公式默认中性色                         |
| 图示标签、描边           | 公共 `SvgMathText` → 本集数轴                                    | 用一维分数数轴，标签与点同一映射；无实际剪切位移夸张       |
| 页面空间、重点配色       | 参考 `TeachingPage` → 本集生产页面                               | 保留成熟字号与内容区域；左侧列出本段具体条件，非仅动作提示 |
| 分组、等号对齐、行距     | `shared/math/math-lines`、`TeachingMathLines`                    | 分组显式声明；隐藏行预留位置，当前行局部强调               |
| 读音消歧                 | `shared/speech/azure-speech`                                     | 单独字母使用 IPA；独立口播局部拼音，字幕不受影响           |
| 音画同步                 | `shared/speech/shot-timeline`、`timing.phraseTime`               | 多行镜头逐行绑定实测词时间；普通页停留 3 秒，密集页 5 秒   |

旧版“所需条件不在当前画面”“覆盖上一步”“跨页丢失前式”不作为继承目标。样例的自动检查独立列出规格所需公式，并检查生产 DOM 中实际可见的 KaTeX 内容；不是只断言依赖栏存在。

## 内容与验收入口

来源：[事件间距与剪切系数](../../docs-site/docs/segment-intersection/shear/order.mdx)。

| 推理段   | 内容核对                                                                   |
| -------- | -------------------------------------------------------------------------- |
| 回顾     | M 的定义、M≥1、输入整数坐标、约分后正分母界、剪切公式                      |
| 具体分数 | 实际距离 1/6；分母不超过 3 保证下界 1/9；不声称取到                        |
| 分子     | p、r 整数；q、t 正整数；通分；横坐标不同推出分子非零；绝对值至少 1         |
| 分母乘积 | 保留上一段距离下界；分别乘正数；8×8 与平方相乘解释四次方                   |
| 倒数     | 保留正数条件及乘积上界；题目和 2<6 在无旁白 4 秒内保留；答案稍后揭示       |
| 连接     | 保留具体条件及两段所用结论；逐行追加完整间距不等式；下界不等于真实最小间距 |

检查覆盖步骤揭示前后、字幕切换、每页首尾、页末停留和思考窗口。工程检查、整句试听、真实成片与可见桌面验收分开记录；用户样例确认尚未取得。助手不渲染或导出视频，不据工程检查关闭任务或推进后续章节。

### 当前样例检查状态

- 17 段正式原速 WAV，48 kHz、16 bit、单声道；内容与解码检查通过，实测时间线为 11690 帧（60 fps，约 194.83 秒）。
- lint 与 TypeScript 检查通过；多次揭示的公共内容检查接入后，四个既有调用工程的内容检查通过。
- 165 个不同生产页面状态检查通过，并查看六类页面截图。首次批次的思考窗口因重复挂载相同 DOM 超时，其余 156 个状态通过；改为逐帧核对状态、仅在状态变化时检查 DOM 后，单独重跑该窗口的 9 个状态通过，未重复其他有效结果。
- 全部 17 段已执行发音评估，12 段无标记，5 段共 7 处 `Mispronunciation`：`232-03`「是」、`232-07`「T」、`232-09`「T」、`232-10`「乘」、`232-15`「Q」「T」「为正」。本轮未报告 `Omission` 或 `Insertion`；自动标记不等于已确认错读。评估命令因此非零退出，未宣称配音验收通过。
- 逐段原始响应与哈希、口播指纹绑定的汇总保存在本机 `out/narration-audit/`；该目录是忽略的诊断产物，不强制提交。再次执行命令复用有效结果，仅补测缺失或变更的素材。
- 规范与规格两路只读审查提出的全段评估缺口、回顾页 `q` 定义缺口均已处理；结论页缺失的两条前段结论已由生产 DOM 检查捕获并补齐。
- 完整整句试听、用户样例确认、真实成片和可见桌面验收尚未完成。未渲染或导出视频。

## 发布素材

路径见公共[空白工程的发布素材](../../docs/agents/videos/operations.md#空白工程的发布素材)。
