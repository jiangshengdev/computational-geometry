# 第四章上集：找齐同点参与者，报告全部输入对

依据：[规格 #334](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/334)、[文案与画面 #335](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/335)，对应第四章文章第一至五节。

`SamePointParticipants` 是无配音的文案画面预览。`timeline.ts` 的 `provisional-silent-reading` 只供观察：每条短字幕暂留五秒，步骤前留半秒，本页保留已讲内容，页末停三秒，SP61 另留八秒思考。这些不是音频实测，也不代表成片时长。

## 内容与入口

20 页、57 个独立教学步骤，沿共端点、端点落在内部、四输入共点、点输入推进。保留 SP01–SP62 中仍在使用的稳定编号；重复步骤 SP28、SP30–SP32、SP42 已退出播放及稿件。旧块连续性引用第二章夹层结论，只补充闭端点的适用条件和纳入相遇块的用途；六对结果直接应用第一章枚举结论，不再逐行计数。完整、真实、唯一报告的新增联系保留；右侧整块排序和无端点共点的发现留给下集。

| 文件                                             | 职责                                                       |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `src/storyboard.ts`                              | 字幕母稿、正文来源、首次对象、图示动作、逐步保留与思考窗口 |
| `src/example.ts`                                 | 与文章一致的坐标及输入身份，供图示与数值核对共同读取       |
| `src/ParticipantDiagram.tsx`                     | 同点案例、角色、连续块、名单合并及六对结果的专用图示       |
| `src/TeachingPage.tsx`、`src/teaching-colors.ts` | 页面组合、对象身份色与逐句重点                             |
| `src/narration-text.json`                        | 从已审字幕派生、独立语义审校冻结的完整纯口播               |
| `src/speech-text.json`                           | 读音标注，拼接文字须与冻结口播完全一致                     |
| `src/timeline.ts`、`src/LayoutCheck.tsx`         | 静默预览与同一生产页面的状态检查                           |

## 参考继承与观察位置

代码基准为 `511068a` 时的第三章下集 `exact-sweep-decisions`。共享基础模块直接从 `videos/shared/` 引用，工程不导入相邻视频业务源码。

| 要求               | 基准入口 → 本集入口                                                                                    | 必要观察状态                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 页面、方向与空间   | 两集 `TeachingPage.tsx` → `MathLessonPage`，显式 `diagramPosition="left"`；正文 850、图示 800、间距 65 | SP04/SP06 输入递增；SP27/SP29/SP33 条件与结论；无图页居中                         |
| 数学与中数间距     | `SemanticMathText`、`TeachingMathLines`，公式 42、文字 36，长文换行                                    | SP06 混排、SP33 下标与夹层依据；未强调、强调与撤去                                |
| 对象色及局部重点   | 显式 `objectMarks`、`activeMarks`；字幕与标题中性                                                      | SP02 条件切换、SP08 A→B→P、SP22–SP24 角色色                                       |
| 图示语义提示       | `DecisionDiagram` 的共享 `AttentionMarks`、`point`、`stroke` → `ParticipantDiagram`                    | SP04 描亮、SP08 身份到交点、SP37 两路合并、SP41 六对指向同一 P、SP53 三对身份切换 |
| 依据静态保留       | `TeachingReferences`，`active:false`                                                                   | SP27 介绍对象、SP29 核对条件，SP33 才显示第二章夹层结论；不重演两次变号反证       |
| 字幕短句与静默保留 | 共享 `validateCaptionClauses`、`groupCaptionClauses`；本阶段没有词时间                                 | 短句切换、同页步骤间保留末条、跨页清空旧字幕                                      |
| 未讲内容与思考     | 未来行预留空间但不可见；合并后才出现完整名单                                                           | SP27–SP33 不预设 W 的边界高度；SP61 思考窗不显示 SP62                             |

数值图横纵单位相同，坐标轴正方向有箭头。点输入用同位置、同尺度分图区分身份，菱形不表示面积。一般夹层图仅表示顺序，不编造新坐标。防重复对照及问题核销以 #335 的当前记录为准；技术检查不替代新旧材料的教学内容对照。

## 检查与下一阶段

### 配音请求准备（#336）

`src/sentence-plan.json` 按当前字幕原句记录对应的完整口播分段，由
`scripts/prepare-sentence-plan.ts` 中逐步审阅的语义分组生成。
句末请求 400ms，原句内部请求 200ms；保留字幕标点、冻结口播及读音标注。
规划入口复用共享 SSML 构建与停顿校验，不读取凭据，不请求服务，不写音频或时间数据。

```sh
pnpm --config.verify-deps-before-run=false run video:sentence-plan
pnpm --config.verify-deps-before-run=false run video:plan-narration --dry-run
```

修改已审分句对应关系后，使用 `video:sentence-plan --write` 重建 JSON，再运行非写入检查。
完整本地请求快照位于被忽略的 `out/narration-plan.json`，包含每步全文、实际 SSML、指纹及独立 WAV 文件名。
当前计划为 57 次串行合成、无自动重试，使用默认音色
`zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`，原速直接输出
`riff-48khz-16bit-mono-pcm`。纯口播共 4,453 个码点，序列化 SSML 共 88,602 个码点；
这些不是计费字符、账户额度或实测时长。143 个原句末尾请求 400ms，216 个内部边界请求 200ms，163 个独立字母使用默认英文拼读。

分句 JSON SHA-256：`6ad9277a0ecdc163f4270e8c4d7038f0555ea24b11329939a7acec4a06b12d48`。
完整请求快照 SHA-256：`39f9c1e2fc2ddfbdf890b3c4f5f189c62694eabe590a8c505a0b65aa56641a45`。
上述指纹仅绑定本次合成前准备；正式合成仍须按 #336 的请求计划确认门禁推进。
识别与发音评估须绑定后续真实音频及其哈希另行规划，不能把本计划或旧静默检查当作音频与同步验收。

### 已确认计划的正式合成

`video:synthesize-approved --dry-run` 重新运行既有规划校验，并逐项比较实际合成输入与上述完整快照；只有显式传入该快照 SHA-256 的执行参数才请求服务。使用共享 SSML、句界停顿及合成实现；本集显式允许保留缺少词边界的成功音频，并采用独占文件写入。已有调用方仍保留原来的词边界要求。

本次按用户确认完成 57 次串行正式合成，无失败、无自动重试。原始 WAV、词事件与素材清单位于被忽略的 `out/synthesis-39f9c1e2fc2d/`，文件未裁切或调速；源音频合计 855.53 秒，不代表成片时长。全部素材通过 PCM 格式、完整解码、实测时长和音频哈希核对。

`video:check-synthesis` 只读核对素材；显式追加 `--write-report` 时独占写入 `source-check.json`，不请求服务或修补时间。现有词时间校验为 11 段通过、46 段失败，包含零时长词事件或文本偏移异常；校验命令因此返回非零，不将成功合成等同于时间线可用，也不据此判定实际漏读。完整事件和失败证据均保留，未补造时间或重新合成。

### 当前识别评估与采用阻塞

已按用户“完成上集全部工作。除非阻塞”的授权，完成同批 57 段原音频的识别与词级发音评估。请求计划位于 `out/assessment-39f9c1e2fc2d/plan.json`，SHA-256 为 `a74d5bde109d0e08cc24fce7c357960559fad4c54b277aeb480967f390fc5636`；使用 `zh-CN`、`HundredMark`、`Word`、`enableMiscue=true`，串行 57 次，无失败、无重试、未重新合成。原始响应保留在该目录的 `run/` 中。

`video:reconcile-assessment` 复用共享时间对齐与校验，只离线检查当前稿件、请求、源 WAV、识别副本及响应哈希，不请求服务。追加 `--write` 生成 `assessment-summary.json`、`aligned-timing.json` 和 `review.html`；复核页逐段并列完整口播、完整原音频、标记字词、可用的实测位置及应读短句，不写入试听结论。原始服务标记分别为 `Mispronunciation=74`、`Omission=19`、`Insertion=3`；57/57 段覆盖、缺失或失败为 0，13 段无自动标记。这些是程序标记，尚未经过实际听辨确认。

47 段通过实测词时间核验；SP06、SP11、SP17、SP24、SP27、SP37、SP41、SP52、SP53、SP58 因漏读或插入标记无法通过。没有补造时间、放宽检查或把未核实标记当作误报。当前工具不能实际听辨这些本地音频，完整语境试听及必要修正是继续采用的阻塞；离线汇总命令据此返回非零。原始素材仍保留在暂存区，未替换正式播放素材，生产字幕、语义动作及时间线尚未切换到实测音频。按[导出前音频检查](../../../docs/agents/videos/operations.md#导出前音频检查)，此状态不得导出，也不提供导出命令。

```sh
pnpm --config.verify-deps-before-run=false run video:assessment --dry-run
pnpm --config.verify-deps-before-run=false run video:reconcile-assessment --write
```

上面的命令均不请求服务；后者会重新生成派生复核材料并以非零退出保留当前阻塞。不要重跑 `video:assessment --execute-plan=…`，现有全部响应已经收齐，执行目录独占创建会阻止重复运行。

### IPA 与中文标注试音

用户随后要求全部漏读、插入及疑惑处尝试 IPA，明确 B 也可纳入，并允许中文微调后重新评估统计。`video:audition` 为此生成独立候选，不修改已审口播文字或正式播放路径：原来有自动标记的 44 段各自完整重合成，异常短句中的 75 处字母使用 IPA；52 个中文标注区间作词组边界调整或补充明确读音。中文涉及的 57 条原始标记中，56 条所在区间有直接标注调整；SP52 的编号“一”保留既有独立 `yi1`，由相邻字母 IPA 试验一并复测。局部中文标注及代码已独立复核，不据此认定原版声音错误。

完整计划及候选 WAV、原始词事件、重新评估的原始响应位于被忽略的 `out/audition-ipa-chinese-v1/`。合成与评估均串行、无自动重试；专用目录独占创建防止重复调用。音色、原速、无损格式及原句界停顿保持不变。`video:reconcile-assessment --audition=ipa-chinese-v1 --write` 复用同一离线校验及复核页实现，将 44 段新结果和 13 段未变原结果合并为完整 57 段候选统计，分别保留旧计数、新计数及差值。原始响应、音频哈希、口播及 SSML 指纹逐段核对，不把程序标记改分类来制造通过。

本版 44/44 次合成、44/44 次评估均已完成，无失败、无重试；新 WAV 合计 668.12 秒，逐段格式及完整解码检查通过。合成计划 SHA-256 为 `615055ed4e1c2c01edd9400cc5438cba00150e49dabe95902626469e6445fae6`，绑定实际新音频的评估计划 SHA-256 为 `bf7db3758e946f29a9548dd29addde220005dd3fae6a050a7c9234a6095d4b1c`。完整 57 段候选组合的原始程序计数如下；它们不是已听辨确认的错误数量。

| 项目               | 原版 | 本次候选 | 变化 |
| ------------------ | ---: | -------: | ---: |
| `Mispronunciation` |   74 |       70 |   −4 |
| `Omission`         |   19 |       23 |   +4 |
| `Insertion`        |    3 |        3 |    0 |
| 无自动标记的片段   |   13 |       17 |   +4 |
| 可用实测时间的片段 |   47 |       47 |    0 |

本轮没有整体改善严重标记，不能声明修复完成或整批采用。SP11、SP27 的时间对齐恢复；SP25、SP55 新增漏读／插入阻塞。SP37 仍有 D→“的”的服务标记，漏读标记从 1 条增至 10 条；SP53 从 1 条增至 2 条。SP06 的 B→“闭”程序标记仍存在，用户已说明该识别读法可接受；保留原始记录，不将其自动认定为实际错读。当前 10 段对齐阻塞为 SP06、SP17、SP24、SP25、SP37、SP41、SP52、SP53、SP55、SP58。新独立审查复算了 57 段的原始计数及 47 段可用时间，核对复核页 57 段全文、101 个完整音频入口（包含 44 段原版对照），未发现隐藏退化或修改原始标记。

试音版尚未正式采用。适用的 [英文字母读音备用方案](../../../.codex/skills/azure-letter-pronunciation/SKILL.md) 要求用户确认具体版本后才能采用；采用时原样复用选中的 WAV，再同步受影响的时间、字幕及动作。实际试听、正式接入和最终成片验收继续分别记录。

在本目录使用已安装依赖运行：

```sh
pnpm --config.verify-deps-before-run=false run lint &&
pnpm --config.verify-deps-before-run=false run video:check-content &&
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查使用当前 Remotion 对应的已安装 Chrome Headless Shell，在独立临时端口启动无头 Studio，检查真实生产组件。附加 `-- --shots=SP08,SP53 --screenshots` 可检查指定步骤并保存浏览器 DOM 截图，不执行视频或静帧渲染。

文案与画面执行及审校证据记录在 #335，完成状态以该票当前记录为准。音频与同步由 [#336](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/336) 承接，整体验收由 [#337](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/337) 承接。本工程已有上述合成源素材和全部识别评估响应，当前生产组件仍为无配音预览；47/57 段实测词时间可用，其余待核实，未完成实际读音或音画同步验收。音频和原始检测文件位于被忽略的 `out/`，不会强制暂存；代码提交不代表素材已经正式采用或整集已验收。没有执行视频渲染、成片或可见桌面验收。

共享命令与浏览器约束见 [工程操作说明](../../../docs/agents/videos/operations.md) 和 [视频制作配置](../../../docs/agents/videos/configuration.md)。
