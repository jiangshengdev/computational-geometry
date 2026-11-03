# 让精确结果支撑扫描判断

第三章下集。权威规格为 [CNB #320](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/320)，文案与画面对应 [#322：文案与画面](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/322)。音频与同步对应 [#324](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/324) 接入音频与同步，[#326](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/326) 负责整体验收。正式状态以 CNB 为准，本说明不替代任务记录。

## 当前内容

`src/storyboard.ts` 是字幕与分镜主稿：五节、17 页、50 个稳定教学步骤 `ES01`–`ES50`，对应第三章正文第六至十节。每步维护首次引入内容、画面任务及自然标点字幕；展开后的 `shots` 包含原文节名、页内已讲保留清单和显示步骤。`ES24` 保留四秒思考窗，下一页才揭示答案；各页完整画面预留三秒页末停留。

本集按扫描决定组织局部场景：求交资格、事件先后与同点、严格未来、活动顺序、证明与成本。不重演第二章完整扫描，不重推前置公式或换序证明。扫描条件仍限于有长度、不竖直、无重叠、端点接触或多线共点，不同事件横坐标各异；上集两输入完整求交的更广范围不能当成本集扫描能力。

分镜与字幕已逐段独立审校，`src/narration-text.json` 已从字幕派生、经另一位独立审核者全覆盖审核并冻结。两份材料均覆盖 `ES01`–`ES50`；口播数学表达按语义口语化，字幕保留自然书面标点。冻结文本 SHA-256 为 `87e0dbe65e486d0ef007be4593dac3b6f0e2408df6578dfce58b765d37101214`。

`src/speech-text.json` 是冻结口播的局部读音标注稿，50 段拼接文字逐字符等于冻结文本。首次查询及后续独立全文盲审使用已准备环境中的 `pypinyin 0.55.0`，库结果仅作补充。首轮发现的五处标注已由独立修正者修正；同一版本随后连续通过两位不同审核者的全文盲审和历史核销，新增、遗留及待查证项均为零。标注稿 SHA-256 为 `c3a9b1af770d9a73abb28f1d03c847fedc9cfb5081ee45bcbe2a46d8dd2d1aad`。这证明相应版本的文本与拼音满足审校门禁，不代表实际音频已验收。

`src/Composition.tsx` 注册 `ExactSweepDecisions` 的原速音画，复用共享 `MathLessonPage`、`TeachingMathLines`、数学排版、字幕和语义提示。`DecisionDiagram.tsx` 承载资格检查、位置排序、记录对照、严格未来、同横坐标高度及普通交叉六类局部图示，不复制相邻工程或重演整次扫描。字幕长句仅按自然分句切换，保留原文标点与措辞，口播及读音稿未因此改写。

`src/teaching-colors.ts` 按历史视频维护正文与公式的对象色、中文关键词及关系重点，接入实测字幕短句和已有图示对象切换。H／K 与两份输入用蓝／橙区分，候选及差值用紫色，当前局部重点用琥珀色；本页对象色保留，临时重点在对应窗口结束后撤去，标题与字幕中性。上下集共用 `SemanticMathText`，不复制公式染色实现。

`src/timeline.ts` 使用 `measured-narration` 实测时间线。50 段原速完整 WAV 已接入 `public/narration/`，每段预显半秒后开始播放，未裁切、变速或二次编码。`audio-timing.json` 保留原始评估响应及实测词事件；156 个字幕片段与 41 个语义动作由实际词时间定位。完整教学行预显，已讲对象在本页累积，提示结束后对象及最近字幕保留；普通页末三秒，ES24 思考窗四秒。全片为 54,350 帧、60fps，约 15 分 5.83 秒；原音频合计 795.46 秒。

本次获批的 50 次联合识别与词级发音评估全部完成，无自动重试。27 段中的 41 个原始零时长事件已通过真实服务事件建立有效时间，原始诊断未改写。全部 50 段严格对齐有效；自动标记为 Mispronunciation 58、Omission 0、Insertion 0。所有段仍标记 `pending-listening`，自动标记不等于实际读错，也不证明人工试听通过。工程与参考对应见 [production-reference.md](./production-reference.md)。

## 工程检查

本次已获用户针对本工程的依赖安装授权，使用 `registry.npmjs.org` 执行冻结安装；未更改锁文件。当前 Remotion 为 4.0.539，布局入口自动核验已安装的 Chrome Headless Shell 157.0.8080.0；通过 `REMOTION_BROWSER_EXECUTABLE` 指定实际路径，不下载浏览器或回退到其他 Chromium。

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
```

`video:check-content` 核验冻结稿指纹、读音重建、共享合成层的本地输入构造（不请求服务）、数学行、原始音频指纹与实测词时间、语义窗口、内容保留与停留。`video:check-layout` 使用真实生产页、独立临时端口和无头浏览器，检查每步揭示、语义提示边界、中态、结束及静默；报告失败后继续其他步骤并非零退出。可用 `--shots=ES20,ES39` 限定必要复查，`--screenshots` 只保存浏览器页面截图到系统临时目录，不调用 Remotion 静帧或视频导出。检查结束关闭其自身服务。

染色检查另核对标记实际命中、短句对应与强调撤去，以及染色前后 KaTeX 数学类别和分组一致；生产布局检查覆盖短句起止、中态，并检查当前行实际具有选定的局部颜色。对象对应与强调效果仍须观察实际画面，不能用颜色存在或结构检查替代。

当前版本通过 lint／类型检查及内容检查。文案画面阶段的 703 个状态及修正后 197 个状态属于前阶段证据；实测时间线已重新执行全部 50 步、707 个生产状态的布局检查并通过；浏览器截图位于本次环境 `/tmp/shear232-layout-i7g2XE/`。独立复核验证全部 WAV 字节与服务响应来源，并在真实 Studio 观察六处播放窗口，无重叠、无脱离 DOM 继续播放，速率均为 1。媒体时钟与画面帧存在少量采样偏差，不能声明逐帧完全同步。尚未完成人耳试听、可见桌面或成片验收，也未写入或关闭 CNB 任务。

最终视频由用户导出。助手禁止渲染或导出视频，本阶段不提供导出命令。上集既有音频及待人工试听标记保持原样，不把它们当成本集素材或本集验收结果。

## 配音合成前准备

`src/sentence-plan.json` 对应全部 50 步的 149 个原始字幕语义句。`scripts/prepare-sentence-plan.ts` 维护逐句确定的口播分段数并生成映射；字幕为显示而拆开的逗号、分号片段仍属同一原句，不由口播稿中的句号自动判定原句结束。生成命令默认只检查当前映射一致性，只有显式 `--write` 才重建该文件。

`scripts/planned-documents.ts` 直接复用共享 `applySentencePauses`、`validateSentencePauses` 及 `createSpeechTools` 的纯构造入口，在内存中为原句末请求 400ms、同一原句的口播内部边界请求 200ms。原冻结口播及已审标注文件均保持原字节，不写回停顿、不改变词义或拼音，不重新打开已通过的全文读音审核。停顿只是请求值，不能当成实测静音，也不代替实际整句试听。

```sh
pnpm --config.verify-deps-before-run=false run video:prepare-sentences
pnpm --config.verify-deps-before-run=false run video:plan-narration --dry-run
```

后一入口始终为 `plan-only`，仅输出本地完整请求计划；没有语音服务调用、凭据读取、音频／时长写入或发布入口。当前完整 JSON 已保存为被忽略的 `out/narration-plan.json`，内含每步全文、SSML、请求指纹、独立 WAV 文件名及逐步计量；需要回读时按当前源码重新生成，并核对指纹。

| 项目                           | 当前计划                                                          |
| ------------------------------ | ----------------------------------------------------------------- |
| 范围                           | ES01–ES50；逐步骤独立合成，50 次，串行；自动重试 0                |
| 音色                           | `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`，不被环境变量静默覆盖  |
| 格式与速率                     | `riff-48khz-16bit-mono-pcm`，原速，无语速参数、IPA 或字母备用读法 |
| 原口播 Unicode 码点            | 4,045                                                             |
| 完整 SSML Unicode 码点         | 72,947                                                            |
| 去除 speak／voice 标签后的码点 | 65,297                                                            |
| 汉字额外计量                   | 3,476                                                             |
| 合成计费字符估计               | 68,773 = 65,297 + 3,476                                           |
| 显式停顿                       | 159 处 200ms；149 处 400ms                                        |
| 独立字母                       | 86 处，全部使用默认英文 characters 拼读                           |

计量依据为 [Azure 的计费字符说明](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech#billable-characters)：只排除 `speak`、`voice` 标签，其余 SSML 标记、空白及标点按码点计数，汉字按两个计费字符计算。这里是精确请求文本的计量计划，不是账户额度、金额报价、服务账单或实际音频时长；不包含重试、识别或发音评估的额外请求。

当前分句计划、完整 SSML、停顿、默认字母拼读与字符计量已由新审核者逐段独立核对，覆盖 50/50 段，无遗留或待查证项；全部 50 份 SSML XML 和指纹检查通过，生成结果可重复。`sentence-plan.json` SHA-256 为 `70261873541c13cdc8f17a2074d334c898d25824e4bdf371119ca83588eb2f24`；本次完整请求计划 SHA-256 为 `6eb84c2bf3a69ff4c4bab2f07da12d95ce182e9fca6015dc29ad63bf46560712`。此处指纹对应合成前的冻结请求；后续实测时间线另行验证，不改变已审文案与标注。

依照 #324，正式合成前须展示完整请求与计费计划并取得明确授权。`out/narration-plan.json` 是授权前只读计划快照，保留 `synthesisAuthorized: false`；后续用户已在会话中批准这 50 次合成，实际执行通过显式计划指纹参数限定，不反向改写已审计划文件。其他服务、重试或发音备用方案不能从该批准自动扩大。

## 原始音频与实测接入

`scripts/synthesize-approved.ts` 默认只读 dry-run；执行分支仅接受已批准计划的 SHA-256。它通过当前进程的环境变量使用配置凭据与代理，固定本次已核对的 Azure Speech 路由和音色，不输出或持久化密钥。按单并发、请求开始间至少 3.2 秒执行，无应用层自动重试；每次先记 started，成功后原样保存完整服务 WAV，再检查 48kHz／16bit／单声道 PCM、完整解码、哈希和时长。已完成素材只按匹配指纹和哈希复用；failed、started 或 uncertain 不会被自动再次请求。

共享合成器在词边界缺失时会在写 WAV 之前报错；本集适配器因此先保存实际成功返回的原始 WAV 与未经改写的服务事件，再独立审核时间数据，避免为了补时间而重复合成。没有修改共享合成器或相邻工程。

本次暂存区为 `out/synthesis-6eb84c2bf3a6/`：

- `manifest.json`：50/50 段成功，分别绑定当前请求指纹和实际音频 SHA-256；总原始音频 795.46 秒，最长单段 21.59 秒。
- `ES01.wav`–`ES50.wav` 与对应 `.response.json`：原速完整服务音频及原始词事件；没有剪切、变速或二次编码。
- `timing-candidates.json`：只将服务返回词映射到冻结稿偏移，保持每个原始时间／时长；未作为正式计时文件或播放路径使用。
- `checks.json`：50 段源音频格式、解码及哈希验证有效；23 段通过严格词时间检查，另 27 段共 41 个词的服务时长为零。原始事件保留，没有填补或删除；这是时间元数据异常，不等于已听辨确认的漏读。

```sh
pnpm --config.verify-deps-before-run=false run video:synthesize-approved --dry-run
pnpm --config.verify-deps-before-run=false run video:check-staged-audio
pnpm --config.verify-deps-before-run=false run video:plan-assessment
```

`video:check-staged-audio` 仍针对原始合成事件运行，会因历史零时长事件返回非零；它是保留的源数据诊断，不代表当前正式对齐失败。不得修改原事件或放宽检查来制造通过。

同一暂存区的 `assessment-plan.json` 绑定完整 WAV、冻结稿及 50 次联合识别和词级发音评估，计划 SHA-256 为 `8235e721c5b8052047f41f001c1def86e2a9ace5db6e32a830e26a574dcb3c90`。用户后续在会话明确授权，50 次请求均已完成；授权前计划快照保持原样。目标为 `eastasia.stt.speech.microsoft.com`，串行、自动重试 0，没有追加合成、备用发音或其他服务。

`assessment-manifest.json` 与各段 `.assessment.json` 保留实际请求结果及响应哈希。`scripts/reconcile-assessment.ts` 仅离线读取真实响应，复用共享严格对齐工具，生成 `aligned-timing.json` 与 `assessment-summary.json`；没有补造时间。`scripts/adopt-measured-audio.ts` 核对所有素材和请求指纹，再逐字节复制原 WAV，生成正式 `audio-timing.json`、`captions.json` 与 `caption-plan.json`。独立审核逐条追溯 2,490 个最终词事件，均来自原始合成或评估测量。

```sh
pnpm --config.verify-deps-before-run=false run video:assess-approved --dry-run
pnpm --config.verify-deps-before-run=false run video:reconcile-assessment
pnpm --config.verify-deps-before-run=false run video:adopt-measured-audio
```

上述 assessment 入口默认只读，必须显式匹配批准指纹才可执行；本次已经全部完成，不应为复查重复发送。adopt 默认仅验证，显式 `--write` 才接入。58 个自动读音标记及全部完整原句仍待人工试听；不据自动分数修改读音或重合成。#326 的用户成片验收尚未完成，最终导出由用户负责。
