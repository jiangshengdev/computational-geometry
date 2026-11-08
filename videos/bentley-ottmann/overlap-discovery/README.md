# 第五章下集工程

本集由 Remotion Blank 模板创建，配置参考 `same-point-updates`。需求以 [#343](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/343)、文案画面票 [#347](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/347) 和配音同步票 [#348](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/348) 为准。

## 当前配置

- Remotion `4.0.540`、React `19.3.1`；数学排版、语音 SDK 和开发工具沿用第四章版本，保留已安装的精确版本约束。
- 复用 `videos/shared/config/remotion.ts` 与共享 TypeScript 配置，ESLint 接入 `componentPolicy`，不导入相邻视频的内容或素材。
- Composition ID 为 `OverlapDiscovery`，逻辑画布为 1920×1080、60 fps，输出比例为 2，对应 3840×2160。
- 共享配置采用 PNG、H.265、`yuv420p`、必须使用硬件编码、48 kHz PCM、并发 4；禁止覆盖输出，完成的 Sequence 不继续保持活动。
- 保留初始化器生成的 `allowBuilds.esbuild: false`，不执行 esbuild 安装脚本；不因旧工程允许就照搬批准配置。
- `dev` 不自动打开浏览器。代理运行服务仍须遵循[端口隔离规则](../../../docs/agents/runtime.md)。

## 检查入口

在本集目录执行 `pnpm --config.verify-deps-before-run=false run lint`，进行 ESLint 与 TypeScript 检查；执行 `pnpm --config.verify-deps-before-run=false run build` 只进行打包，不渲染视频。

已接入完整字幕分镜、独立口播、教学画面与 54 段原速 PCM WAV（`OD01`–`OD54`）。`timingKind` 为 `measured-narration`，原无声估算窗口已退出播放与检查路径。配音总长 913.1375 秒；加上引入、思考和页末停留，时间线共 62374 帧，即 17 分 19.57 秒。上集当前版本的导出命令已经交付，下集承接其正式报告规则与“x 坐标／y 坐标”读法。

| 入口                             | 职责                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| `src/storyboard.ts`              | 字幕原稿、教学行、首次对象、画面任务、来源与前置复用位置       |
| `src/narration-text.json`        | 独立口语稿；先审校字幕，再派生并独立审校                       |
| `src/speech-text.json`           | 保持冻结全文的局部读音标注；不代表实际配音验收                 |
| `src/example.ts`                 | 两个独立案例的精确输入与对象颜色                               |
| `src/DiscoveryDiagram.tsx`       | 连续覆盖、延长、空隙、组层顺序与首次足够的教学示意             |
| `src/timeline.ts`                | 实测音频时间窗、语义切换、字幕保留、页末三秒及思考八秒         |
| `src/LayoutCheck.tsx`            | 使用实际生产页面检查字幕、正文、标签及切换状态                 |
| `public/narration/`              | 服务返回的 54 段完整原速 WAV                                   |
| `src/audio-timing.json`          | 音频哈希、请求指纹、原始识别评估及实测词时间                   |
| `src/captions.json`              | 从字幕原稿和实测词时间生成的字幕                               |
| `assets/narration-requests.json` | 原始合成请求日志；保留当时暂存状态，当前采用状态以正式素材为准 |

内容检查和布局检查分别运行：

```sh
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查前设置经核验的 `REMOTION_BROWSER_EXECUTABLE`，仅使用匹配 Remotion 的 Chrome Headless Shell。可用 `--shots=OD15,OD20` 限定受影响片段，`--screenshots` 将浏览器截图保存到系统临时目录。入口使用独立临时端口，结束后关闭自己的进程，不导出视频或静帧。

## 教学范围与参考承接

本集五节依次说明当前覆盖、邻接不变时延长补检、空隙与重新激活、组层顺序和无端点交点发现。依据第五章文章第四至七节；各页的 `source` 与 `reference` 记录已有结论和新增连接。两个数值案例互相独立，一般证明不依赖这两个案例成立。

- 当前覆盖由所有活动成员共同包含当前位置推出。最远成员给出整段连续覆盖；未开始的身份不计入上限。
- 新邻接检查与持续邻接期间的延长补检都保留。无端点证明分别处理“形成时已足够”和“后来首次同时足够”，先取得预约，再引用有限清单的到站结论。
- `same-point-updates` 的左右顺序、块外关系和新邻接分类只引用适用结论；本集补充分组后的条件。`overlap-reporting` 的完整报告规则只用于承接。
- 页面沿用两集实际采用的 `MathLessonPage`、`TeachingReferences`、`TeachingMathLines` 与 `SemanticMathText`：显式左图右文、依据静态、中性字幕、正文对象色和局部重点色；不依赖相邻工程的内容或素材。
- 几何图使用等单位坐标，重叠成员分图显示。一般覆盖图按身份分行，明确不表示几何高度。无事件间隙、连续块及覆盖阈值图均为教学示意，不是真实执行轨迹。
- 字幕短句复用共享分句与组句能力，保留所有原始标点；同页新步骤引入前保留上一步末条字幕。教学行完整显示后开始完整原速音频，步骤累积保留。语义切换绑定对应口播短语的实测词时间，不按字数插值估算。

文案、读音与独立对齐的权威审核记录归 [#347](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/347)。类型、内容与布局检查分别只证明对应范围；文本、实际发音、音画同步和真实成片验收分开记录。

## 配音请求准备

配音同步阶段对应 [#348](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/348)。`src/sentence-plan.json` 将全部 54 段的原始字幕语义句对应到冻结口播短句：177 个原句末请求 400ms，199 个句内边界请求 200ms。`scripts/sentence-plan.ts` 复用共享 `createSentencePlanTools`；其 `updateSentencePauses(true)` 只重建显式停顿，保留文字及读音对象，`checkSentencePlan` 已接入内容检查。

`video:plan-narration --dry-run` 复用共享 `planBatch`，输出每段完整口播、SSML、请求指纹、停顿位置及格式；不读取凭据、不请求服务、不写音频或时间数据。当前计划包含 OD01–OD54 共 54 次合成，采用 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural` 和 `riff-48khz-16bit-mono-pcm`，不设置语速，自动重试为零。修改字幕、口播、读音或分句后须重新校验并生成计划。

正式合成沿用已确认计划，SHA-256 为 `0579cb4e9d8c82bfd469f1bc0c5a3c705dbd6ee4bd24ad4a94ee1cfef4d7a355`，保持 #347 放行的字幕、冻结口播和读音对象不变。54 次合成均成功并完成格式、解码与哈希核对，无失败或重试。共享合成入口按端点主机持久计数、独占执行，滚动 60 秒最多发起 20 次请求；区域端点的不同资源保守合并计数，本机其他未使用该入口的客户端或其他设备不在本地锁控制范围。已发出的请求全部结束后才释放锁，续跑不重放已开始或结果未知的请求。识别评估串行执行，遵守 F0 一路并发。

`video:adopt-measured-audio` 复用共享 `adoptBatch` 和 `verifyBatch`，整批离线校验成功后采用；`video:check-audio` 无需凭据，不请求语音服务，核对当前音频、请求、原始评估和字幕。OD04、OD05、OD09、OD10、OD40 的数学定义展开及 OD46 的因果短句使用显式字幕映射，不修改字幕原文或伪造词时间。

当前评估覆盖 54/54 段，原始程序标记分别为 `Omission=0`、`Insertion=0`、`Mispronunciation=40`，没有请求失败或缺失结果。发音标记保留为待听辨，不等于已经确认的错读。制作过程中未试听；实际整集听辨、用户导出后的音画同步和真实成片验收尚未完成。

实测接入后，ESLint、TypeScript、内容与完整音频校验通过；生产布局覆盖全部 54 段、2196 个状态。独立规范与规格审查没有未解决问题；独立无声页面观察覆盖 OD20 条件与预约、OD24→25 空组保持、OD28→29 空隙、OD37→38 边界与明确回看、OD47 首次足够的开始、中间、结束及相邻片段状态。上述证据不替代实际听辨、可见桌面或真实成片验收。

## 制作与导出

遵循[视频工程规则](../../AGENTS.md)与[工程操作说明](../../../docs/agents/videos/operations.md)。浏览器必须匹配本集 Remotion 指定的 Chrome Headless Shell；使用前单独核验，不自动下载。

已接入项目五阶段模板：`video:preflight` 为独立内容、解码及生产布局检查；`video:export` 导出 `OverlapDiscovery` 的 PNG；`video:export-audio` 导出同时间线 PCM WAV。两项导出入口由用户执行，使用系统分配的独立端口，不复用 Studio 端口，不覆盖既有输出。助手只检查 `--dry-run` 参数，不执行导出。

PNG 目录为 `out/overlap-discovery-frames/`，音轨为 `out/overlap-discovery-audio.wav`。本机核验的 Remotion `4.0.540` 指定 Chrome Headless Shell `158.0.8127.2`；运行前设置匹配的 `REMOTION_BROWSER_EXECUTABLE`。导出命令按[五阶段模板](../../../docs/agents/videos/operations.md#五阶段命令模板)提供，PNG 编码前仍须核对实际帧编号、数量与图像；无声 H.265 与同时间线 PCM 检查通过后再复制流合并 MOV。可导出工程、实际听辨与真实成片验收分别记录，不以自动检查替代未执行的验收。

## Remotion 许可

使用条件见 [Remotion 官方许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
