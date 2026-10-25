# 特殊情况与原坐标

竖直线段、重叠线段、一个点，剪切后怎么办？｜剪切变换⑥

规格为 [#236](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/236)，任务为 #237–#240。用户本轮明确要求一次性实施、取消样例审核等待；该授权不替代整句试听与真实成片验收，也不允许助手渲染或导出视频。遵循[视频工程规则](../AGENTS.md)。

## 播放入口与内容

默认 composition 为 `ShearSpecialCases`。同一内容源提供 `Shear237`、`Shear238`、`Shear239` 独立片段；默认全片还包含总结与第⑦集预告。共 20 页、59 段，时长以正式原速音频的实测数据为准。

| 片段         | 教学内容                                                             |
| ------------ | -------------------------------------------------------------------- |
| #237 · 16 段 | 回顾、分数坐标、第一处思考、横坐标差推导、竖直线段变斜               |
| #238 · 24 段 | 非竖直分类、重合位置、平行与共线三类、第三线穿越、点输入与第二处思考 |
| #239 · 16 段 | 实际正／零系数分支、原坐标与公共分母、两条数值路径、分配律           |
| #240 · 3 段  | 总结、边界与第⑦集预告                                                |

内容依据：[同横坐标、退化输入与原坐标](../../docs-site/docs/segment-intersection/shear/special-cases.mdx)。当前算法核验入口为 `src/algorithms/segment_intersection/bo/sweep.rs` 的 `choose_shear`：有非零竖直线段时选正系数，否则返回零。没有修改算法或求交协议。

演示用 `s=1/2` 与算法安全系数严格分开；图示和原坐标算例均显示演示标识。图使用等比例坐标、轴箭头、数学标签和原始输入身份。重叠表示完整区间，第三线穿越场景同步变换参与线段和交点。原坐标数值例子取 `(x,y)=(1/2,3/2)`、`D=2`，两条路径均得到 `(5/2,3)`，精确分数已核对。

## 第⑤集能力对应

参考固定为第⑤集本地提交 `e1c571e`；读取实际生产组件、时间线、配音脚本与配置，未将参考集的工程检查视为本集的试听或成片验收。

| 能力                         | 参考实现                              | 本集对应                                           |
| ---------------------------- | ------------------------------------- | -------------------------------------------------- |
| 字幕短句、中性颜色、静默保留 | `Subtitles`、实测字幕查询             | 同一公共组件及字幕模块                             |
| 数学混排、分式、中文间距     | `createMathText`、`TeachingMathLines` | 同一公共实现，完整教学行揭示                       |
| 图示标签与遮挡               | `SvgMathText` 与 DOM 检查             | 本集 `SpecialDiagram`，描边和标签检查复用          |
| 页面分配、重点与推导分组     | `TeachingPage` 显式分组               | 本集图文页或居中正文；分配律使用等号对齐           |
| 读音消歧与字母               | Azure 公共文档构造器                  | 独立 `speech-text.json`，局部拼音和 `say-as="characters"` 字母拼读 |
| 实测时间、两处思考与页末     | `createShotTimeline`                  | 原速音频加停顿；两处各四秒，普通页三秒、密集页五秒 |
| 生产页面状态检查             | 第⑤集 `LayoutCheck`                   | 提取为公共 `ShotLayoutCheck`，两集均调用           |
| 全段语音评估                 | 第⑤集评估脚本                         | 提取公共 `auditNarration`，绑定音频哈希与口播指纹  |

教学行先于对应首个发音完整显示，本页已讲行保留。问题口播结束后静默四秒，答案随后揭示；不把页末回看计入下一页。普通页面与密集推导页在分镜中显式区分。

## 素材与检查

- `src/storyboard.ts`：页面、完整教学行、独立书面字幕、思考窗口与动画锚点。
- `src/speech-text.json`：逐段独立口语稿；字幕标点不随合成停顿改写。
- `public/narration/*.wav`：Azure 原始 48 kHz、16 bit、单声道 PCM；不调速。
- `src/audio-timing.json`、`src/captions.json`：实际服务词时间、素材哈希、口播指纹及生成字幕。
- `out/narration-audit/`：逐段评估原始响应与汇总；忽略的诊断产物，不强制提交。

在本工程目录使用以下入口：

```sh
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:check-layout --screenshots
pnpm --config.verify-deps-before-run=false run video:audit-narration
```

布局检查使用现有 `playwright-cli`、系统分配的独立临时端口和匹配的 Headless Shell。先设置经现场核验的 `REMOTION_BROWSER_EXECUTABLE`；未配置或版本不匹配时直接停止，不下载或回退。支持 `--shots=237-01,237-02` 仅复查受影响片段。检查页面直接使用生产组件，覆盖揭示前后、字幕切换、动画、思考窗口和页末。

配音使用默认 Azure 音色 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`。合成按三段一批处理；失败时等待已发起请求结束，保留暂存数据并停止，只有全部段落通过才发布正式素材。使用日志给出的 `--resume=<临时目录>` 续跑；复用要求格式、SSML 指纹和音频哈希一致。实际生成需用户管理的 Azure 环境凭据，不在仓库保存。

## 用户导出入口

本集采用 3840×2160、60 fps；1920×1080 逻辑布局以两倍直接栅格化。制作配置与[五阶段流程](../../docs/agents/videos/operations.md#五阶段命令模板)一致：独立预检 → 保留 PNG → 无声 H.265 硬件编码 → 同时间线 PCM WAV → 复制封装 MOV。

`video:export` 只负责 PNG，`video:export-audio` 只负责同一 `ShearSpecialCases` 时间线的 WAV。`video:preflight` 独立完成音频解码、内容及完整生产布局检查，仅报告结果；是否需要预检由人类判断。两个导出入口不读取预检记录或状态，不要求预检通过，不重复预检，也无需跳过参数；仍核验浏览器、动态分配独立端口并禁止覆盖已有输出。具体覆盖范围见[公共预检说明](../../docs/agents/videos/operations.md#用户导出)。浏览器只能是 Remotion 4.0.538 对应的 Headless Shell 157.0.8080.0。

```sh
pnpm --config.verify-deps-before-run=false run video:preflight
pnpm --config.verify-deps-before-run=false run video:export --dry-run
pnpm --config.verify-deps-before-run=false run video:export-audio --dry-run
```

移除 `--dry-run` 仅供用户按五阶段检查顺序执行。PNG 目录为 `out/shear-special-cases-frames/`；WAV 为 `out/shear-special-cases-audio.wav`。WAV 参数明确指定 `wav`、`pcm-16`、48000 Hz、关闭视频硬件加速；当前 Remotion 混音输出双声道，生成后仍须实际检查。无声 H.265 仍要求硬件编码。后续编码与 MOV 封装按实际 PNG 编号及已核验产物准备，不能将存在入口视为已导出。

## 本轮验证状态

- 20 页、59 段；60 fps、32,108 帧，约 535.13 秒。正式 PCM WAV、独立口播、字幕及实测时间一致，全部音频完整解码通过。两处四秒思考窗口、全部普通页三秒和密集页五秒停留、教学行先于口播显示检查通过。
- lint、TypeScript 和源码格式检查通过；精确分数核验覆盖两点分离、穿越交点和两条缩放路径。音频源格式／续跑测试、超界词时间修复测试及并发批次失败不发布测试共八项通过。
- 使用匹配的 Headless Shell 无头检查全部 59 段、629 个生产页面状态（四个不重叠批次分别为 163、155、169、142），全部通过。覆盖揭示、字幕切换、动画、两处思考窗口及页末；查看全部 20 页完整截图，并详细核对穿越、点输入与分配律页面。浏览器截图不代表可见桌面或真实成片验收。
- 第⑤集公共模块接入后的 lint、类型和内容检查通过；回顾、分列推导和思考窗口共 54 个生产状态通过。既有音频与教学内容未修改，旧评估标记仍保留。
- Standards 审查的两项问题（读音稿漏注／语境、重复布局 runner）及 Spec 审查的两项问题（原坐标算例演示标识、穿越图示同步）均已修复；批处理失败安全的窄范围复核未发现问题。
- 全部 59 段均有与当前音频 SHA-256、口播指纹绑定的语音评估结果：33 段无标记，26 段有标记，共 33 处 `Mispronunciation`、0 处 `Omission`、0 处 `Insertion`，无缺失评估。评估命令因此非零退出，不能称为配音验收通过；自动标记不等于已确认错读。
- `237-11` 已应用整句试听确认的 v3 原速 PCM：后两句为“点 P 的纵坐标小于点 Q 的纵坐标。剪切系数 S 大于零。”，保留字母 IPA。正式音频与试听样本 SHA-256 一致，评估为零标记；对应口播、书面字幕及实测时间同步更新，其余 58 段素材未变。修正后内容／解码、lint／类型检查及该段 11 个生产页面状态检查通过。
- 待试听片段：`237-01、237-04、237-05、237-14、238-02、238-03、238-04、238-05、238-06、238-07、238-10、238-11、238-12、238-13、238-14、238-19、239-02、239-03、239-04、239-05、239-08、239-10、239-12、239-14、239-15、239-16`。原始响应和逐项证据保存在 `out/narration-audit/`。
- PNG 与 WAV 用户入口仅执行 dry-run，版本、路径与参数兼容性已核验。除 `237-11` 已整句试听确认外，全片试听、真实成片内容与音画同步、可见桌面验收尚未完成。未渲染或导出视频，未修改或关闭 CNB 父规格及任务。

## 发布素材

沿用 `assets/bilibili-copy.md` 与 `assets/covers/` 中已有标题、简介、封面和提示词。本轮不自动上传。
