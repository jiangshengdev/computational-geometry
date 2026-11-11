# 第七章：用剪切处理竖直线段

本集承接 [规格 #363](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/363)，当前制作范围为 [#364：完整无声教学稿与画面](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/364)。工程由远端原生 Remotion 初始化提交 `732e35a` 建立，配置在 `9381d5a` 对齐第六章；本次在该工程中制作，不复制相邻工程或依赖目录。

## 当前内容

五节、22 页、64 个稳定步骤 `VS01`–`VS64`。字幕原稿及来源、承接与新增联系在 `src/storyboard.ts`；独立自然口播在 `src/narration-text.json`。`src/speech-text.json` 仅承载局部读音标注，不是正式音频。当前提供离线请求计划及受计划指纹约束的配音入口；已生成64段原始音频，尚未通过整批采用门禁，不提供视频导出入口。

| 节                       | 步骤      | 内容                                                       |
| ------------------------ | --------- | ---------------------------------------------------------- |
| 第一节：竖直输入卡在哪里 | VS01–VS06 | 主案例 V、A、B 与同列两个高度的参与资格                    |
| 第二节：统一变换输入     | VS07–VS21 | 同一系数、端点表、事件对应及三个保证的分工                 |
| 第三节：走完主案例扫描   | VS22–VS46 | 六个端点和两个交点；P′ 后换序、新邻接、Q′ 的覆盖与严格未来 |
| 第四节：还原完整答案     | VS47–VS56 | 两对点结果；独立 V、W 案例的完整重叠区间                   |
| 第五节：接回点输入       | VS57–VS64 | 独立 V、Z₁、Z₂ 案例的三对结果与点输入退出                  |

所有实际计算使用 `s=1/262144`。`example.ts` 用整数分子与公共分母表示实际变换坐标，供画面输入及内容检查共用；其恢复函数返回原 x 坐标的同分母分子。几何过程图明确使用放大示意系数 `s_vis=1/2`，保持横纵单位相同，不把示意的水平距离用于实际候选判断。活动顺序竖列表示关系，不是几何坐标。

`timeline.ts` 明确标记 `provisional-visual-inspection`，按字幕阅读窗口安排无声检查时长，每页末另留 3 秒。该版本阅读窗口合计约 16.3 分钟，只服务当前无声稿检查，不是配音实测、最终时长或音画同步结论。正式音频阶段须用原速完整音频的实测数据替换阅读窗口，重新绑定语义动作及字幕。句子内的配对、换序与登记按对应字幕短语安排，提示结束后教学对象和本页结论继续保留。

## 正式配音状态（#365，尚未完成）

父规格 #363 的无声稿阶段 #364 已交付。当前补齐 `src/sentence-plan.json`，按原字幕的完整语义句映射冻结口播短句：171 个原句末请求 400ms，179 个内部短句末请求 200ms。`speech-text.json` 仅新增独立停顿对象，冻结正文和已有读音对象不变；350 个边界由共享句界校验检查。请求值不是实际静音长度。

`video:plan-narration` 和 `video:synthesize` 复用共享批次工具及第六章的薄入口，固定既有音色与 48 kHz / 16 bit / 单声道 PCM WAV，禁止调速和自动重试。代码直接使用运行环境的 `SPEECH_KEY`、`SPEECH_ENDPOINT`，可选的 `SPEECH_VOICE` 必须与固定音色一致，不进行变量别名映射。本轮已执行合成与评估；不将离线计划或 dry-run 视为音频验收。凭据只能由运行环境提供，不写入工程。

在本目录可离线重建并检查计划（以下命令均不请求服务）：

```sh
pnpm --config.verify-deps-before-run=false run video:plan-narration --dry-run > /tmp/vertical-narration-plan.json
plan_sha=$(sha256sum /tmp/vertical-narration-plan.json | cut -d ' ' -f 1)
pnpm --config.verify-deps-before-run=false run video:synthesize --plan=/tmp/vertical-narration-plan.json --plan-sha256="$plan_sha" --output=/tmp/vertical-audio-not-requested --dry-run
```

两个入口均支持 `--shots=VS01,VS02`，局部计划和执行须使用相同的显式片段集合。真实请求前须核实阶段授权、服务配置及当前免费层限制；请求计划须重新核对并绑定哈希。共享工具保留逐段状态、音频哈希和请求指纹，结果未知时不得直接重放。当前素材及评估证据保存在 `assets/narration-staging/{initial,recovery}`，尚未采用。`video:assess`、`video:adopt-measured-audio`、`video:check-audio` 复用共享流程；只有整批通过后才可写入正式素材和实测时间，不以占位结果替代。

本轮64段原始音频均为48 kHz、16 bit、单声道PCM WAV，完整解码、哈希及当前请求指纹核对通过，原始音频总长868.85秒（不是整集时间线时长）。首批请求中的5段收到明确HTTP 429；原始记录保持不变，窗口过去后以共享速率账本和降低并发进行一次恢复，5段均成功。`http429-recovery.json` 绑定原清单与恢复理由。没有升级资源或改变音色、语速。

已为64段发起65次评估：64段取得响应，其中62段可建立实测对齐。VS33首次请求未取得可确认响应，原 `request-failed-or-uncertain` 记录保持不变；旧入口吞掉异常，无法断言是超时或中断。核查实时 SDK 没有适用的已知作业查询/幂等恢复入口后，对同一17.63秒原音频单独进行一次新评估，返回成功且三类标记均为0；两次请求可能均计入用量。`vs33-assessment-recovery.json` 绑定原记录哈希与第二次记录，第二次结果和时间在 `assessment-vs33-second`，没有自动循环重试。以下为程序标记，未经实际听辨确认，不能当作已确认错读：

|片段|阻断证据|后续边界|
|---|---|---|
|VS29|9个Omission、2个Insertion；主要涉及“得到新 x 坐标除以系数等于一”和“得到候选x 坐标为一倍系数”|先核对完整音频与原文，不删除应读内容或清除标记|
|VS32|“先记录蓝色与橙色这一对”中的“先”标为Omission|核对整句，区分实际漏读和识别误报|
|VS33|第一次未知原因不可恢复；第二次评估成功，0个漏读/插入/误读标记|保留第一次未知记录与第二次独立记录；当前对齐阻碍已解除，程序结果不等于听辨通过|

`pnpm --config.verify-deps-before-run=false run video:check-staged-audio` 离线检查64段PCM、解码、指纹与逐段评估绑定，并因VS29、VS32这2项阻断以非零状态退出。`video:adopt-measured-audio` 的整批门禁仍保留；没有生成正式 `public/narration`、`audio-timing.json` 或 `captions.json`。已取得的62段实测数据保留在候选 `.aligned.json`，供后续问题核销后复用；实际整句听辨尚未完成。

### 待听辨原片与核对点

当前工具没有实际音频感知能力，未声称听过以下音频；下列原片可交由用户整句听辨。程序合计标记仍为10个Omission、2个Insertion、35个Mispronunciation，均保留为自动标记，不等于已确认错误。

- [VS29原始音频（10.82秒）](assets/narration-staging/initial/VS29.wav)。完整口播：“检查蓝色与橙色这对邻居。令它们的新高度相等。得到新 x 坐标除以系数等于一。两边乘系数。得到候选x 坐标为一倍系数。高度为一。” 核对第三、第五句是否完整读出x、坐标、除以、等于及候选；识别结果分别缩成“得到新系数与一”“的为一倍系数”。原合成词事件从约5.578秒开始存在零时长，不能用它证明实际漏读，也不能据此补造对齐。
- [VS32原始音频（12.54秒）](assets/narration-staging/recovery/VS32.wav)。完整口播：“到达低处交点时。蓝色与橙色的高度都是一。紫色高度是二。不经过当前点。不参加这次报告。先记录蓝色与橙色这一对。对应 P 撇这个位置。” 核对第六句的“先”；合成事件记为8.979秒、长0.120秒，识别文本未包含该字。这是可能的识别误报证据，不能代替听辨结论。

先确定实际读法：若确有错漏，按原文局部修复并重新合成、评估；若原片完整，则按共享流程记录针对实际音频的识别误报证据，不删除原始标记。上述为原片交付时的状态；后续两段局部文案修复见下节，原始记录和门禁保持。

### 两段文案修复候选（wording-repair-1）

仅针对 VS29、VS32 生成独立待试听候选，保留 `initial/VS29`、`recovery/VS32` 的原片和原评估；其余62段没有重生成或重评估。候选字幕先行，独立口播、标音和句界映射保存在 [wording-repair-source.json](assets/narration-staging/wording-repair-source.json)，尚未覆盖 `src` 或正式素材。

|片段与句子|原文|候选改写|含义及画面对应|
|---|---|---|---|
|VS29 第三句|得到新 x 坐标除以系数等于一。|得到新横坐标除以系数等于一。|横坐标仍指 x′，对应 `candidate-P` 的 x′/s=1；避免混合语言字母切换|
|VS29 第四句|两边乘系数。|两边乘以系数。|保留等式两边同乘非零系数的推导|
|VS29 第五句|得到候选x 坐标为一倍系数。|候选点的新横坐标等于系数。|明确候选点与变换后坐标；一倍系数与系数相等，对应 x′=s|
|VS32 第六句|先记录蓝色与橙色这一对。|首先记录蓝色与橙色这一对。|保留 `report-P` 先报告、VS33 再换序的顺序|

其他句子保持原文。VS29 保留高度为一，故候选点仍为 P′=(s,1)；不增加前置证明或改变几何计算。候选字幕使用相应普通措辞，“P 撇”仍显示为 P′。两段继续使用既有音色及48 kHz、16 bit、单声道PCM，不调速、不裁剪。新“横”按横坐标标 `heng2`；原有“乘、系、数”和“一”的语境标音保留。局部读音查询参考已安装 pypinyin 0.55.0，库查询不等于实际读音验收。

|候选原片|时长|SHA-256|
|---|---|---|
|[VS29](assets/narration-staging/wording-repair-1/VS29.wav)|12.97秒|`5a27e6d63cc4efdfae67de919b506c31a27f5e27f55205a72e816eefc3c2a063`|
|[VS32](assets/narration-staging/wording-repair-1/VS32.wav)|13.09秒|`b289bbea67de663ecb82d9cd77b99eee730923324c9d9296bf7b444c77a0098d`|

每段仅一次合成、一次评估，无自动重试。复用 `buildBatchPlan`、`synthesizeBatch`（并发1）、`assessBatch`、`verifyBatch`、`createCaptionPlans`；本地使用已安装的 Speech SDK 1.53.0、FFmpeg/ffprobe。计划与请求状态在候选目录中保留，凭据仅由运行环境提供。

两段完整PCM解码、音频哈希、请求指纹、正文和SSML绑定检查通过；两段各有0个Omission、0个Insertion、0个Mispronunciation自动标记，均可建立候选实测对齐。原始合成事件中的非标点零时长数量均为0，VS29原先的24项零时长事件没有在新片复现；这说明新事件数据可用，不证明旧片实际漏读或根因已确认。

[verification.json](assets/narration-staging/wording-repair-1/verification.json) 绑定候选输入与两段原片；[candidate-captions.json](assets/narration-staging/wording-repair-1/candidate-captions.json) 通过共享字幕映射生成，保持语义来源编号且时间处于完整音频内。原合成事件、逐段评估响应与候选 `.aligned.json` 均保留。独立审查核对数学等价、局部变化、原片保留、PCM/指纹和候选边界。

实际整句听辨尚未完成，候选未正式采用；生产字幕、暂定无声时间线及整批采用门禁保持原样。候选字幕的离线时间映射通过不等于视觉同步验收。后续应试听两段完整新片，核对VS29两处横坐标关系、VS32“首先记录”，再按当前源版本同步正式口播、字幕与实测时间线；不能直接使用原片的时间数据。此次没有发布新试听附件或导出视频。

当前 `Composition`、字幕和暂定时间线仍是已验证的无声版本。#366 的成片检查另依赖用户导出；助手不渲染或导出视频。

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
| 正式配音与实测同步             | 第六章实测时间线                                           | 本阶段不适用；独立口播和标注不冒充音频                                               |

本集新增专用剪切/逆变换、区间与点身份图示，是原参考不能直接表达的新几何任务；公共页面与检查能力仍从 `videos/shared` 复用，不导入相邻集的教学内容或音频。逆变换时整幅示意一起还原，避免把原坐标点直接混画在新坐标图中。

## 检查与运行

在本目录执行，使用已安装依赖。Remotion 固定为 `4.0.540`，要求 Headless Shell `158.0.8127.2`。本次新云实例已核验的浏览器路径为：

```sh
export REMOTION_BROWSER_EXECUTABLE=/workspace/.local/share/remotion-browsers/158.0.8127.2/chrome-headless-shell-linux64/chrome-headless-shell
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
pnpm --config.verify-deps-before-run=false run build
```

`build` 只打包。布局入口为当前生产页面建立独立系统临时端口的无头 Studio，覆盖字幕边界、语义动作中途、步骤切换和页末，结束关闭自身进程。可用 `--shots=VS33,VS38` 做局部复查，`--screenshots` 将浏览器截图写入系统临时目录；不调用 Remotion 静帧或视频导出。

内容检查覆盖实际坐标变换、八事件先后、两份范围与严格未来、点和区间逆变换、64 段字幕/口播对应及页末保留。它不代替独立文本、读音、视觉过程审查。已完成证据、问题核销及最终状态以 #364 正式记录和提交说明为准；未取得的实际听辨、正式音画同步、可见桌面和成片验收不属于本阶段完成声明。

## 配置

Composition 为 `VerticalSegments`，逻辑画布 1920×1080、60 fps，输出比例 2。继续复用共享 Remotion、TypeScript 与 ESLint 组件策略；本集 TypeScript 目标 ES2020、库声明 ES2023/DOM 支持精确整数和当前已安装运行时。共享配置的 H.265、PNG、48 kHz PCM、并发 4 与禁止覆盖设置保持原样；这些设置不授权助手渲染。

遵循 [视频工程规则](../../AGENTS.md)、[工程操作说明](../../../docs/agents/videos/operations.md)及 [Remotion 许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
