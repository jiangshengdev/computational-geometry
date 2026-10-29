# 为什么不会漏掉交点 · 第 2 章下集

依据 [#297](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/297)、
已完成的分镜票 [#298](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/298)
及实施票 [#300](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/300)。
最新拆票决议以第一章为已确认参考，不另设样例批准。

31 段独立字幕与口播，23 个教学页：高度差变号、无事件不换序、
交叉前必相邻、新邻接必检查、最早漏点反证、不多报不重复及工作量边界。
本集不修改算法、文章、公共 API 或执行轨迹，不把教学示意当作算法运行结果。

## 制作入口

在本目录执行，仅使用已安装组件：

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:sentence-pauses
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查须设置已核验匹配 Remotion 4.0.539 的 Chrome Headless Shell
157.0.8080.0 路径至 REMOTION_BROWSER_EXECUTABLE。使用独立临时端口、无头页面；
不渲染视频或静帧。dev 入口不自动打开可见窗口。

## 内容与素材

- storyboard.ts：#298 的字幕与叙事分组；字幕保留自然标点。
- lesson.ts：物理分页、完整公式、已讲依据、页末停留及片段映射。
- narration-text.json：独立数学口语稿；sentence-plan.json 按原字幕语义区分句界。
- speech-text.json：局部读音标注与显式句末 400ms／句内 200ms 停顿。
- caption-plan.ts：公式字幕与多句口语说明的显式对应，不以标点数量相等代替语义。
- ProofDiagram.tsx：一般论证的几何示意、局部邻接前后对照及最早漏点因果链。
- teaching-cues.ts：实测短语锚点；整行先完整显示，语义提示结束后内容仍保留。
- audio-timing.json、captions.json：由实际音频生成；不估算词时间或调整音频速度。
- LayoutCheck.tsx：实际生产组件的逐步揭示、字幕、提示起中末、静默与页末状态。

字幕、数学排版、提示圈与描亮、原速 PCM 配音、时间线和检查复用 videos/shared，
不导入相邻集专有内容。参考与证明对应见 [production-reference.md](production-reference.md)。

## 输出配置与验收

1920×1080 逻辑画布、60 fps、2 倍输出，composition 为 WhyNeighbors。
音色 zh-CN-Xiaoxiao:DragonHDFlashLatestNeural，服务直接输出 48 kHz、
16 bit、单声道 PCM WAV。音频保留原速。

video:preflight 为独立内容、音频解码和布局检查；video:export 与
video:export-audio 仅供用户运行，分别输出 out/why-neighbors-frames、
out/why-neighbors-audio.wav，不覆盖已有产物。提供导出命令前遵循
[工程操作说明](../../../docs/agents/videos/operations.md)中的配音门禁和五阶段模板。

完整制作源已就绪：文本、配音评估、无头页面、用户整句试听和真实成片验收分别记录。
工程检查不能替代试听或成片验收；助手不渲染或导出视频。

初次冻结口播覆盖 31 段、184 个短句，已完成纯文本独立审核及同一标注版本的
连续两轮独立全文盲审与历史核销。当时正文 SHA-256 为
`77d9e21d88d8914c093eebc17d0ac69ac0e352317049dae8d04f387e2650992a`，
标注稿 SHA-256 为
`6e56bdcb45cb4b124b79d63995fe2ff98babaf1a3680b397c49577670c07da12`。
字母首尾、语义句界、实际音色、PCM 输出和 SSML 拼读已检查。

用户试听确认 N16 的 W 与 N26 开头“检查”漏读后，局部制作独立试听并获确认采用。
N16 仅将 W 的合成输入改为英文 `double you`，字幕和画面仍保留 W；
N26 开头改为“在检查这对线段时”，同步字幕及揭示锚点。
N23、N26 的字幕及相关定义行明确 p 为横坐标，与口播含义一致。
N18 的 p 后杂音与结尾漏读经用户试听确认；单词和原文 IPA 版本未获采用，
最终以 IPA `piː` 朗读三个 p，并改为“在横坐标 p 对应位置的值”，
结尾为“这就违背了简化条件”。该完整片段已获用户试听确认。
三段原样采用已确认 WAV，不重新合成；其余 28 段复用原素材。

| 采用片段 |     时长 | WAV SHA-256                                                        |
| -------- | -------: | ------------------------------------------------------------------ |
| N16      | 12.52 秒 | `1e93e7dcd28c244778ca095dd6034036616f36163f578c931e97ed63e54183a1` |
| N18      | 22.81 秒 | `74ec8543e63ccd7e306528c97b9ae89772896150092bf54f2b8cd0a100db0843` |
| N26      | 15.82 秒 | `5b0f2a58dee942c26aa8443b22a45aba8e5ed28f020c79241cf2906d231c1262` |

当前正式素材覆盖全部 31 段，字幕与时间线由实测数据生成：30130 帧、502.167 秒。
类型、内容、完整解码、184 个语义句界及两个五秒思考窗口检查通过。
无头生产页面检查覆盖 592 个状态，通过；随后同步 p 的表述，
对受影响的 N23、N26、N27 共 57 个状态定向复查，通过。
N18 最终采用后，对其 23 个生产状态定向复查，通过；保留其他片段有效结果。
已查看代数推导、夹层反证、新邻接和最早漏点页面的浏览器截图；未渲染视频或静帧。
当前正文 SHA-256 为 `d9c460d10d17c5e208257cf67ba93809c917346ecea7c378e1f27372851c98bb`，
标注稿为 `5da422e7250498996d9a31d2e3bf52132220ee0c0f409d6db5ab5faa481b2df2`。

全片自动评估覆盖 31/31，结果位于 `out/narration-audit/`：
`Mispronunciation` 43、`Omission` 0、`Insertion` 0；其中 N16 为三类均零，
N18 为 3、0、0，N26 为 2、0、0。自动发音标记不等同于实际听辨错误。
已确认的漏读及 p 后杂音通过局部试听修复，原版与未采用试验保留为诊断证据。
N16、N18、N26 已获试听采用确认；全片实际试听及真实成片验收尚未完成，属于后续交付阶段。
