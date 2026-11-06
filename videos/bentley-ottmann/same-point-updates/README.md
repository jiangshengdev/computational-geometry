# 第四章下集：统一更新顺序，让扫描继续

本集实施依据为 [两集规格 #334](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/334) 与
[文案与画面 #338](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/338)。
对应第四章文章第六至九节；承接上集的参与者与报告结论。

## 当前制作入口

- `src/storyboard.ts`：21 页、57 个稳定步骤 SU01–SU57，独立字幕原稿、正文依据、首次对象、图示操作与思考停顿。
- `src/narration-text.json`：从已审校字幕派生的独立纯文本口播。
- `src/speech-text.json`：读音标注稿；拼接文字必须与冻结纯文本一致，不作为字幕源。
  已按 `src/sentence-plan.json` 的语义对应加入句末 400ms、句内 200ms 的请求停顿；
  原文字、拼音和字母身份保持不变。停顿请求值不是实测静音长度。
- `src/sentence-plan.json`：原始字幕完整句子与独立口播短句的逐项对应，
  通过共享校验器核对全文覆盖和停顿位置，不用于推测实际词时间。
- `src/UpdateDiagram.tsx`、`src/example.ts`：本集专用的成员、整块次序、空隙、邻接、发现与流程图。
- `public/narration/SU*.wav`：57 份正式完整原速配音，使用 Git LFS 管理。
- `src/audio-timing.json`：正式音频哈希、请求指纹、原始合成事件、评估响应与实测词时间。
- `src/caption-plan.json`：字幕与口播短句、原图示 cue 的对应；`src/captions.json` 为实测时间生成的 320 条字幕。
- `src/audio-adoption.json`：首次批次合成及评估请求状态，记录采用而不冒充实际试听。
- `src/timeline.ts`：`measured-narration`，使用共享 `createShotTimeline` 适配完整原速音频。
  暂定阅读计时已经移除；图示与局部重点由实测短语时间驱动，同一动作跨内部停顿保持连续。
- `SamePointUpdates` 是完整生产 composition；`LayoutCheck` 直接使用相同生产页面，
  覆盖步骤揭示、短字幕切换、提示起止与中间状态、思考和页末保留。
- `Composition.tsx` 复用共享 `createNarratedLesson` 播放全部正式 WAV，无裁切或变速。
  当前为 63,526 帧／60 fps，约 17 分 38.77 秒；尚无整片音画同步或成片验收，不提供成片导出入口。

## 内容与前置结论的分工

| 本集位置 | 已有材料                                                             | 本集新增联系                                                 |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| SU03–05  | 上集 SP22–24、SP54、SP60–62；文章第三、五节                          | 报告后筛选继续成员，整块更新                                 |
| SU06–14  | 第三章下集 ES37–42；文章精确判断第九节                               | 逐对高低确定全块；同侧等斜率排除；A、F 仅端点接触            |
| SU15–20  | 上集 SP25–35 的连续块；第二章下集 V-no-events、V-sign-change-result  | 块外继续存在、严格间隔及插入空隙保持                         |
| SU21–30  | 第二章下集三类事件；上集相遇块                                       | 非空块内部与边界、空块连接、纯点不变，以及完备分类           |
| SU31–33  | 第三章下集 ES07–08、ES19–27；第二章清单保留规则                      | 把真实交集、严格未来与同点更新接起来                         |
| SU34–45  | 上集连续块；第二章 V-last-adjacency、V-retain-report、V-prior-events | 块内至少一对真正邻居替代旧交叉对，核对最早漏点所需的左侧前提 |
| SU46–57  | 上集已介绍的最小案例与本集 A、F                                      | 统一信息依赖与各分支的简短核对，不重演完整扫描               |

前三章已有代数推导、上集参与者收集和无序对报告证明不再展开。
一般示意不指定新坐标、不冒充真实执行轨迹；数值图保留文章输入身份及配色。
A、F 是独立的仅端点接触案例，不与 A、B、C、D 拼成同一组输入。

## 参考实现与继承

采用当前上集 `same-point-participants` 的完整生产页面组合（引入于本地提交
`1b7cb24`），并核对第三章下集 `exact-sweep-decisions`（参考区域最后调整
`cdf51d4`）。具体视频只作参考，不从相邻工程导入内容或制作依赖。

| 能力                       | 基准实际入口                                                         | 本集接入与检查                                                                 |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 左图右文、正文累积         | 上集 `TeachingPage.tsx` 的 `diagramPosition="left"`、`wrapText=true` | 同样显式传参，复用 `MathLessonPage` 与 `TeachingMathLines`；隐藏后续行保留排版 |
| 数学混排、公式下标         | 共享 `SemanticMathText`；上集 `MathText.tsx`                         | 正文、字幕、SVG 标注使用同一数学组件；标题与字幕不染色                         |
| 身份色与当前局部重点       | 上集 `teaching-colors.ts`、`ParticipantDiagram.tsx`                  | 沿用蓝 A、橙 B、紫 C、绿 D；当前短语焦点与对象提示独立，正文不是只用整行背景   |
| 描亮、提示圈及撤去后的保留 | 共享 `AttentionMarks` 与 `teaching-cues`                             | 原几何位置不动，只有提示层变化；相同语义跨短字幕不重启动画                     |
| 字幕短句与静默保留         | 共享 `groupCaptionClauses`、上集 timeline                            | 自然标点原样保留；同页短句续接，跨页不泄漏旧字幕；使用实测词时间               |
| 无头生产状态检查           | 共享 `ShotLayoutCheck` 与 `checkShotLayouts`                         | 本集 `LayoutCheck.tsx` 和 `scripts/check-layout.ts`；无音频、无视频导出        |

本集没有需要已知依据辅助栏的新页型，前置结论在主场景用明确来源简短引用。
专用过程图分别承担成员筛选、整块次序、邻接分类和事件发现，不以换主题为由改造共享排版。
正式音频和实测时间已经接入；实际听辨及整片连续音画同步仍待验收。

## 命令

在本工程目录运行，使用已安装依赖：

```sh
pnpm --config.verify-deps-before-run=false run dev
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
pnpm --config.verify-deps-before-run=false run video:sentence-pauses
pnpm --config.verify-deps-before-run=false run video:plan-narration --dry-run
pnpm --config.verify-deps-before-run=false run video:captions
```

`dev` 不自动打开浏览器；代理检查使用共享入口分配独立临时端口，不复用用户服务。
`video:plan-narration` 仅输出 57 段的完整 SSML、请求指纹和停顿位置，
不读取凭据、不创建服务客户端、不请求合成或评估、不写音频或时间数据。
默认音色为 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`，请求格式为
`riff-48khz-16bit-mono-pcm`，不指定语速、不自动重试。
请求计划须另行确认后才可进入实际生成；本入口不执行合成。
`video:sentence-pauses --write` 仅通过共享生成器按已审校分句更新读音稿中的停顿；
不修改文字或已有读音标注，默认不带参数仅校验。

用户确认完整请求计划后，`video:synthesize-narration` 接受三个必需参数：
`--plan=<计划JSON>`、`--plan-sha256=<已确认文件哈希>`、`--output=<新暂存目录>`。
入口先核对计划哈希、逐段 SSML、正文、指纹、音色和格式，再逐段串行请求。
WAV、原始词事件和段落元数据保存在暂存目录；`manifest.json` 记录开始、
已保存且解码通过、失败或结果未知，不自动重试、不覆盖或自动续跑旧批次。
计划中的 `synthesisAuthorized:false` 表示离线计划自身不授予请求权限；
实际执行仍须取得绑定该计划的用户确认。

整批合成完成后，`video:assess-narration --staging=<该暂存目录>` 核对素材哈希与指纹，
使用共享识别评估和真实词时间校验。`assessment-manifest.json` 防止盲目重复请求；
请求失败即停，成功响应的时间映射不通过则单列待复核，保留全部原始标记与响应。
仅识别使用的自动生成 WAV 副本在成功取得响应后清理；原始配音不裁切、不调速。
这些入口均不采用正式素材，不修改播放时间线；自动标记不代表实际听辨结果。

`video:adopt-measured-audio --staging=<完整批次>` 默认只校验，显式加 `--write`
才复制原始 WAV、生成正式时间数据和字幕；已有不同哈希的正式音频不会被覆盖。
在确认采用后可追加 `--consume-staging` 清理已经完整转入正式工程的暂存批次：
仅允许本集 `out` 的直接子目录且文件集合完全匹配；保留批次请求记录到
`src/audio-adoption.json`，回读全部正式哈希和生成 JSON 后才清理。
`video:captions` 仅依据正式音频、时间数据和字幕计划重新生成字幕；
播放、字幕生成和内容检查均不依赖 `out`，也不调用语音服务。
布局检查要求 `REMOTION_BROWSER_EXECUTABLE` 指向已核实与本集 Remotion 4.0.540
匹配的 Chrome Headless Shell 158.0.8127.2，缺失时报错，不自动下载。
可用 `--shots=SU08,SU25` 限定实际受影响步骤；`--screenshots` 保存生产页面浏览器截图到系统临时目录。
`build` 仅打包，不渲染。工具与交付边界见
[视频规则](../../AGENTS.md)和[工程操作说明](../../../docs/agents/videos/operations.md)。

内容检查核对案例算术、字幕完整保留、整行先显示、语义提示连续性与页末停顿；
布局检查只证明实际覆盖状态的内容边界与可达性，不替代独立画面观察。
没有执行可见桌面验收、音频试听或成片验收；文案画面依据 #338，音频与同步任务为 #339。

## 当前正式音频与验证（#339）

经用户确认的首次请求计划 SHA-256 为
`066bb4d6b9cc402ffe61e552d4d1811797e854e30a6b685454cc05321d3ec686`。
用户明确要求“应用全部音频”后，57 份原始 WAV 已原样采用到 `public/narration/`；
实测时间与原始评估保存于 `src/audio-timing.json`，请求状态保存于 `src/audio-adoption.json`。
已消费的 `out/narration-initial/` 重复副本已清理。

- SU01–SU57 共 57 份原速 WAV，全部核对 48 kHz／16 bit／单声道 PCM 并完整解码。
  原音频时长合计 925.88 秒，不含教学阅读、思考和页末停留，不是最终片长。
- 合成与识别评估均覆盖 57/57，无请求失败，无应用层重试；57 段全部取得
  通过共享校验的实测词时间。原始合成事件与识别响应均保留，未插值或猜测时间。
- 原始自动标记：Mispronunciation 53、Omission 0、Insertion 0。
  发音标记仅为待试听疑点，不代表已确认错误或已通过声音验收。
- 57 段的 3,345 个词事件与 320 条字幕均使用真实测量；21 页各保留三秒，
  SU55 思考保留六秒，下一步答案不提前出现。开口前半秒先完整显示当前教学行。
- 类型及内容检查通过，57 段共 2,210 个生产页面状态检查通过。
  独立复核核对所有素材哈希、逐条字幕和 cue 对应，并检查 63,526 帧状态保持。
- 使用匹配的 Headless Shell 独立观察 SU03、SU08、SU23、SU46、SU55 的 15 个状态；
  对象提示切换、撤去后保留及思考窗口正确。生产 composition 实测 SU01 原速加载及短段播放推进正常。
- 实际完整语境试听、整集连续音画同步及用户导出后的成片验收仍未完成。
  #339／#340 与父规格 #334 尚未完成，不把自动检查或短段播放观察当作整集验收。
