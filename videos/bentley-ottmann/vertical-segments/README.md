# 第七章：用剪切处理竖直线段

本集承接 [规格 #363](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/363)，无声教学稿阶段为 [#364](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/364)，当前正式配音与同步工作为 [#365](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/365)。最终成片验收属于 [#366](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/366)，依赖用户导出。助手不渲染或导出视频。

## 当前工程

五节、22页、64个稳定步骤 VS01–VS64，Composition 为 `VerticalSegments`，1920×1080逻辑画布、60fps、输出比例2。独立分镜在 `src/storyboard.ts`，口播在 `src/narration-text.json`，标音在 `src/speech-text.json`，350个句界由 `src/sentence-plan.json` 约束。原句末请求400ms，内部短句末请求200ms；这些是请求值，不冒充实测静音长度。

|节|步骤|内容|
|---|---|---|
|第一节：竖直输入卡在哪里|VS01–VS06|主案例V、A、B与同列两个高度的参与资格|
|第二节：统一变换输入|VS07–VS21|同一系数、端点表、事件对应及三个保证的分工|
|第三节：走完主案例扫描|VS22–VS46|六个端点和两个交点；P′后换序、新邻接、Q′的覆盖与严格未来|
|第四节：还原完整答案|VS47–VS56|两对点结果；独立V、W案例的完整重叠区间|
|第五节：接回点输入|VS57–VS64|独立V、Z₁、Z₂案例的三对结果与点输入退出|

所有实际计算使用 `s=1/262144`；`example.ts` 用整数分子与公共分母表达实际变换坐标。几何过程图明确使用放大示意系数 `s_vis=1/2`，横纵单位相同，不能用示意水平距离验算实际候选。活动顺序竖列表示关系。保留主案例8事件、两对点结果、VW完整区间和三对点输入身份，不重证剪切或邻居发现的前置结论。

## 正式音频与实测同步

`public/narration/VS01.wav`–`VS64.wav` 是当前选用的完整原始PCM：48 kHz、16 bit、单声道，音色 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`。源音频总长 **871.55秒**。`src/audio-timing.json` 绑定每段音频哈希、口播/SSML指纹、原始评估和实测词时间；`src/captions.json` 是相应字幕及语义来源编号。播放和正式离线检查只读取这些正式文件，不依赖暂存目录、临时文件或再次请求语音服务。

选用版本：VS29、VS32 使用 `wording-repair-1` 新片；VS33复用原音频与第二次成功评估；其余61段复用最初或限流恢复批次的有效结果。没有重生成其余62段。64段均有当前版本评估，缺失0、当前采用版本请求失败0。原始程序标记合计：**Omission 0、Insertion 0、Mispronunciation 34**。漏读/插入门禁通过，34项误读标记按现行规则单列，未删除、改类或冒充已听辨核销。`actualListeningPerformed` 保持 false。

时间线标记为 `measured-narration`，**58,198帧／60fps＝969.967秒（约16分10秒）**。旧阅读估算退出播放计算。每段保留30帧开口前引导，先展示当前完整教学行；按完整音频向上取整帧数安排播放。相邻段音频不重叠，同页无额外尾停留，22页每页末保留完整画面3秒；字幕与已讲内容持续到下一段/换页。

字幕由实测词时间生成；动作使用口播语义短句，独立于字幕重分组。特别覆盖统一变换、P′/Q′登记与报告、两次换序、逆变换、VW上下边界及Z₁/Z₂配对。VS32/39报告结果在对应报告短句开始后出现；VS55上下端分别跟随各自短句；VS60第二对不再依赖字幕数组下标。所有动作在结束后保留已得到的对象和结果。

### VS29、VS32局部修复及历史证据

|位置|旧文案|正式选用文案|数学/过程含义|
|---|---|---|---|
|VS29第三句|得到新 x 坐标除以系数等于一。|得到新横坐标除以系数等于一。|新横坐标仍指x′，对应x′/s=1|
|VS29第四句|两边乘系数。|两边乘以系数。|等式两边同乘非零系数|
|VS29第五句|得到候选x 坐标为一倍系数。|候选点的新横坐标等于系数。|对应x′=s，保留高度为一与P′=(s,1)|
|VS32第六句|先记录蓝色与橙色这一对。|首先记录蓝色与橙色这一对。|保留先报告、VS33再换序|

两段其余句子保持；正式字幕、独立口播、标音与句界映射同步采用上述改写。新横坐标的“横”标 `heng2`，其余语境读音沿用已审校版本。候选来源在 `assets/narration-staging/wording-repair-source.json`，候选阶段记录中的 `not-adopted` 是历史状态；当前选用状态由正式素材及本节说明确定。

|片段|正式原片时长|SHA-256|
|---|---|---|
|VS29|12.97秒|`5a27e6d63cc4efdfae67de919b506c31a27f5e27f55205a72e816eefc3c2a063`|
|VS32|13.09秒|`b289bbea67de663ecb82d9cd77b99eee730923324c9d9296bf7b444c77a0098d`|

两段各一次受控合成、一次评估，无自动重试；三类自动标记及非标点零时长事件均0。原VS29的24项零时长事件没有在新版复现，这不证明旧片实际漏读或服务根因已确认。原片、旧评估及原请求保留在 `assets/narration-staging/{initial,recovery}`；`assets/narration-review` 明确标记被替代素材，不进入播放。原VS33首次评估结果未知，第二次成功记录保留；两次可能均计入服务用量。失败请求及替代关系在 `assets/narration-request-evidence.json`，不重放未知请求。

旧 `video:check-staged-audio` 入口已退役：它针对旧稿和旧选用批次，正式版本统一使用 `video:check-audio`。暂存证据保留不代表当前采用旧素材。实际听辨、可见桌面验收及最终成片听看均未完成，不以自动评估或无头检查替代。

## 参考继承与本集差异

基准为第六章 `same-column-events` 和 `same-column-reasons` 在 `9381d5a` 的实际页面组合。具体旧内容片段及本集新增联系逐页记录在分镜的 `reference` / `source`，不重新推导剪切证明、系数分母界或邻居发现证明。

| 能力                           | 旧实现入口                                                 | 新版承接与观察入口                                                                   |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 左图右文、正文累积             | 两集 `src/TeachingPage.tsx`；显式 `diagramPosition="left"` | 同名入口复用 `MathLessonPage` / `TeachingMathLines`；VS33、VS53、VS62 及全片布局检查 |
| 静态历史依据                   | `TeachingReferences`，`active:false`                       | 仅引用已讲结论，保留必要条件；不随当前步骤闪烁                                       |
| 正文对象色、局部重点、中性字幕 | 语义 `lineMarks`、`activeMarks` 与 `colorMath`             | V 蓝、A 橙、B 紫、W 绿，与第七章文章一致；字幕关闭染色                               |
| 数学标签与坐标                 | `SvgMathText`，1:1 SVG 视口                                | 本例专用 800×600 图示，等单位网格与正向箭头；标签坐标与几何共用变换                  |
| 换序与新邻接                   | 第六章 `EventDiagram` 的顺序竖列，`timeline` 的语义锚点    | VS33/40 标签与形状共用位移；VS34–38 独立展示邻接、覆盖、未来与登记                   |
| 提示收束、跨片段保留           | 共享 `AttentionMarks` 线段描亮；第六章字幕末句保留         | 只复用单次线段描亮；端点使用定半径提示，不引入重复脉动；`visualAt` 保留已达状态      |
| 正式配音与实测同步 | 第六章实测时间线与共享 measuredShotRows/createNarratedLesson | 64段完整PCM、实测字幕及按口播短句触发的语义动作 |

本集新增专用剪切/逆变换、区间与点身份图示，是原参考不能直接表达的新几何任务；公共页面与检查能力仍从 `videos/shared` 复用，不导入相邻集的教学内容或音频。逆变换时整幅示意一起还原，避免把原坐标点直接混画在新坐标图中。

## 检查与运行

在本工程目录运行。依赖由 `pnpm-lock.yaml` 锁定，Remotion 4.0.540、React 19.3.1、Speech SDK 1.53.0；浏览器必须是该版本要求的 Chrome Headless Shell 158.0.8127.2。当前云实例已核验路径如下：

```sh
export REMOTION_BROWSER_EXECUTABLE=/workspace/.local/share/remotion-browsers/158.0.8127.2/chrome-headless-shell-linux64/chrome-headless-shell
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
pnpm --config.verify-deps-before-run=false run build
```

`build` 只打包，不渲染。内容检查核对数学、完整音频生命周期、350句界、64段字幕/口播绑定、22页停留和关键语义触发，`--decode` 同时执行64段完整PCM解码与正式音频证据检查。`video:check-audio` 可单独检查正式音频；`video:preflight` 组合内容/完整解码与生产布局检查。布局检查使用系统分配的独立端口及上述浏览器，覆盖每个实测短句和动作前、中、后及相邻状态，结束关闭自身进程。尚未执行的检查不能由命令存在推定通过。

本次全64段浏览器布局检查覆盖2587个生产状态，全部通过；每段留存终态截图。已完成：ESLint与TypeScript检查、正式64段完整解码与内容绑定检查、相关共享时间线单测、Remotion打包，以及两个导出入口的只读预演。另用匹配版本的浏览器实际查看31个指定状态：VS29/32/33/40/48/55/60/62前中后与VS30/34/49/56/63起始衔接；未见裁切遮挡，报告、换序、逆变换与配对状态符合对应口播短句。这是指定帧的视觉抽查，不是连续全片观看或实际听辨。

### 用户导出边界

本集已接入 `video:export`（PNG序列）和 `video:export-audio`（同时间线PCM WAV），两个入口的 `--dry-run` 已核验，不生成媒体。遵循[五阶段模板](../../../docs/agents/videos/operations.md#五阶段命令模板)：独立预检 → PNG → 无声H.265 → 同时间线PCM WAV → MOV复用封装，每步检查实际输出后继续。源图形和音频都不得裁剪或变速，不覆盖已有输出。

当前Linux云环境没有模板要求的 `hevc_videotoolbox` 编码器，不能把macOS硬件编码步骤称为本环境可执行。尚未生成PNG帧，因此帧序列只能按当前Remotion命名实现预测为 `element-00000.png`–`element-58197.png`，不能冒充已检查的真实帧目录；必须在用户导出后核对数量、尺寸、编号和实际格式，再填入第3步命令。当前不提供未经实际帧目录核验的完整编码命令。最终目标路径为 `out/vertical-segments.mov`，并非已存在成片。

在本工程、确认目标路径不存在且浏览器仍与已安装Remotion一致后，由用户执行：

```sh
pnpm --config.verify-deps-before-run=false run video:preflight
pnpm --config.verify-deps-before-run=false run video:export
```

本次完整预检如仍对应当前版本，无需为导出重复执行。PNG检查与兼容的H.265硬件编码完成后，才执行同时间线音轨入口及复用封装；详细顺序与条件以公共模板为准。助手不执行视频或音轨导出，不宣称已生成成片。

遵循[视频工程规则](../../AGENTS.md)、[工程操作说明](../../../docs/agents/videos/operations.md)及[Remotion许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
