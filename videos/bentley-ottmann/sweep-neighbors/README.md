# 扫描过程与三类事件 · 第 2 章上集

依据 [#297](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/297)、
[#298](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/298) 和
[#299](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/299) 制作。
沿用《我们究竟要求什么》，按最新决议取消另做样例与样例确认。

`src/storyboard.ts` 是 61 段字幕与分镜原稿，覆盖四线段完整扫描过程。
`src/sweep-state.ts` 保存教学快照：输入、活动顺序、已发现交点、待处理清单、
已报告结果分别维护，发现、登记、到达、报告及换序分阶段呈现。
这不是算法执行轨迹，不调用或修改算法、公共接口及协议。

参考版本、共享能力及两集内容对应见 [制作参考](production-reference.md)。
下集仅准备分镜，不属于本集运行时依赖。

## 制作入口

所有命令在本目录执行；仅使用已安装组件。

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-sweep
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

- `narration-text.json`：由字幕派生并独立审校的纯文本。
- `speech-text.json`：词典查证后的局部拼音与句界停顿，拼接文字必须与纯文本一致。
- `scripts/narration.ts`：复用共享 Azure 制作流程，原速直接输出 48 kHz、16 bit、单声道 PCM WAV；全部目标通过才发布素材。
- `audio-timing.json`、`captions.json`：由真实音频词边界与时长生成，不填造时间。
- `timeline.ts`：60 fps、12 帧画面先行；逐行完整显示，思考窗口与页末停留独立编排。
- `teaching-cues.ts`：109 个语义短语锚点，驱动点、线段与记录提示；无逐词闪烁。
- `scripts/check-sweep.ts`：根据独立几何计算核对事件前后顺序、严格未来、去重、持续保留与结束状态。
- `LayoutCheck.tsx`：复用生产组件与共享检查，覆盖字幕切换、提示起中末、片段边界、静默和页末停留。
- `out/narration-audit/`：当前音频哈希与口播指纹绑定的识别、发音评估原始记录；输出目录不强制提交。

正式音色为 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`。
按用户最新要求，S35、S53、S58 中有问题的 Q 改用显式
`englishWord: "queue"`，请求英文单词读音；字幕、图示和输入身份仍为 Q。
该局部例外不改变其他片段的字母拼读。S53 因用户反馈 D 后句界有插入噪音，
将首句改为“新的邻居是 A 与 D 这两条线段。”，随后按用户要求将
“检查得到 queue”改为“这对邻居的交点是 queue。”并重新合成。
S53、S58 最新改写版均已获用户整句试听认可，并原样发布到正式素材及实测时间数据。
凭据仅从现有环境读取；去掉 `--dry-run` 会请求 Azure 并写音频，须先完成文本与拼音审核。
布局检查使用已安装且版本匹配的 Chrome Headless Shell 157.0.8080.0，
通过 `REMOTION_BROWSER_EXECUTABLE` 指定；入口会核验，使用临时端口无头运行并清理自身进程。
不打开可见窗口，不渲染视频或静帧。

## 配置与用户导出

1920×1080 逻辑画布、60 fps、2 倍输出配置；composition 为 `SweepNeighbors`。
`video:preflight` 复用独立内容、解码和布局检查。
`video:export` 与 `video:export-audio` 仅供用户运行，分别使用
`out/sweep-neighbors-frames` 和 `out/sweep-neighbors-audio.wav`，不覆盖已有产物。
助手不执行渲染或导出。用户实际导出前须按
[工程操作说明](../../../docs/agents/videos/operations.md)核对当前音频评估和五阶段条件，
不能把入口存在当作已经具备成片交付证据。

## 当前验收状态

分镜字幕与纯文本已审校；独立几何核对和语义锚点文本定位通过。
61 段原速 PCM 配音已从匹配缓存原样发布至 `public/narration/`；逐段哈希与发布前原音频一致，没有重新合成。
正式 `audio-timing.json`、`captions.json` 各含 61 段，均与当前口播指纹及音频哈希匹配。
S53 最新改写后的 queue 音频（11.23 秒，SHA-256 前缀 `311501ce7766`）已获整句试听认可，实测对齐、字幕与语义锚点检查通过。
S35 的 queue 音频（12.54 秒，SHA-256 前缀 `e4918dc94065`）已获用户整句试听认可，原样发布并完成时间修复、字幕与语义锚点检查。
S58 因用户反馈开头噪音，将“结果记录继续保留”改为“已经报告的结果继续保留”后重新生成（9.58 秒，SHA-256 前缀 `cbd0c5106510`）。该新版已获整句试听认可，并基于同一 WAV 的原始识别响应完成时间修复、字幕及语义锚点检查。
S23、S25 针对已反馈的“横坐标”与连续字母读音问题，已局部改写并重新生成试听。
S23 改为“线段 B 在横坐标为三的位置结束”和“线段 A 和线段 C 之间还隔着 B”；S25 改为“扫描线来到横坐标为三的位置”和“从下到上依次是线段 A 和线段 C”。
S25 改写版（14.12 秒，SHA-256 前缀 `413b0bde8c0f`）已获用户整句试听认可，原样发布并完成时间修复、字幕与语义锚点检查。
S23 按用户要求，将三个 B 的合成输入改为 `englishWord: "bee"`，字幕和图中身份仍为 B；该局部例外不影响其他片段。新版（13.07 秒，SHA-256 前缀 `6a2fbfdc8d05`）已获整句试听认可并原样发布。
已报告的局部试听问题均已完成认可版本的应用。S40、S43 保留已认可 WAV，实测时间修复已接入。61 段时间、字幕及语义锚点检查通过。
正式发布后 lint／typecheck、内容与全量音频解码检查通过；时间线为 17 页、42665 帧（60 fps），S02、S40 的 5 秒思考窗口保留。
全片音频评估已覆盖当前版本 61/61 段：复用 38 段有效结果，补齐 23 段；逐段响应与正式音频 SHA-256、口播指纹一致，无缺失或请求失败。
自动标记为 `Mispronunciation` 56 条、`Omission` 0 条、`Insertion` 0 条；27 段无自动异常。原始响应与汇总保存在 `out/narration-audit/`，不将自动标记等同于实际错读，也不将覆盖完成称为读音验收通过。
完整无头页面检查已覆盖 61 段、1045 个生产帧状态及 61 项中数混排检查：首次检查发现的状态说明／标题数学排版遗漏、扫描线标签越界及与 C 终点坐标重叠均已修正，失败片段定向复核通过；S38 临时端口冲突后已独立重试通过。其余有效结果复用，不重跑未受影响片段。使用匹配版本的 Chrome Headless Shell 157.0.8080.0，未渲染或导出视频。
本次修正后的 lint／typecheck、改动文件格式检查通过；规范与规格两条源码审查及修正复核完成，无遗留发现。
全片整句试听、真实成片和可见桌面验收尚未完成，不以已认可局部片段或自动检查替代。
