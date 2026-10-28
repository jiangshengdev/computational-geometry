# 我们究竟要求什么 · 上集

本工程依据 [#287](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/287)，
在 [#289](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/289) 的代表样例基础上，
完成 [#290](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/290) 与
[#291](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/291) 的完整内容制作。
全片覆盖 U01–U52，内容见 [分镜](storyboard.md)。
保留已调整的代表样例，并沿用其字幕、数学排版和正式配音。

采用 Remotion 4.0.539、1920×1080 逻辑画布、60 fps，保留 2 倍输出配置。
共享字幕、数学排版、配音与时间线工具来自 `videos/shared`，不导入相邻集专有内容。
参考能力对照见 [制作对照](production-reference.md)。

## 参考能力接入

| 能力             | 本工程实现                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| 字幕与静默保留   | 共享 `Subtitles`、`writeCaptions`、`createShotTimeline`；字幕数学使用中性色                                           |
| 数学与中英文间距 | 本集 `MathText.tsx` 接入共享 `createMathText`，完整公式交给 KaTeX                                                     |
| 图示或推导       | 本集 `InputDiagram.tsx` 保持等比例与相同坐标；输入点用菱形，分栏保留身份                                              |
| 空间与逐步呈现   | 三份输入依次出现；最后同图展示与问题出现，思考期间不显示答案                                                          |
| 配色             | 默认中性色，输入身份使用稳定对象色，字幕与标题不随对象染色                                                            |
| 原始音频与读音   | 共享 Azure 工具、局部拼音、字母拼读；口播句号对应原始字幕句号时停顿 400ms，其余口播句号停顿 200ms；实测时长驱动时间线 |
| 内容与布局检查   | 共享内容与生产页面检查；检查本集实际镜头，不复制历史镜头编号或豁免                                                    |

以上是实现对应关系，不能替代实际读音、布局或样例验收结果。

## 素材与入口

- `src/storyboard.ts`、`src/continuation.ts`：完整教学页与逐步揭示；新增段字幕见 `src/full-captions.json`。
- `src/narration-text.json`：从字幕派生并独立审校的冻结纯文本。
- `src/speech-text.json`：局部拼音与句界停顿；拼接后须等于冻结纯文本。
- `scripts/narration.ts`：调用共享配音流程，整批通过后才发布原速 PCM WAV。
- `src/audio-timing.json`、`src/captions.json`：由实测音频生成，禁止填造时间。
- `public/narration/`：原速 48 kHz、16 bit、单声道 PCM WAV。
- `src/TeachingPage.tsx`、`src/timeline.ts`：生产页面与实测时间线。
- `out/narration-audit/`：绑定当前音频哈希的识别、发音评估原始结果。

所有命令在本工程目录执行，仅使用已安装组件：

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查前设置 `REMOTION_BROWSER_EXECUTABLE` 为现场核验过的
Chrome Headless Shell 157.0.8080.0。检查通过系统分配端口无头运行，
不渲染或导出视频；可添加 `--screenshots` 保存浏览器截图。

`video:narration` 去掉 `--dry-run` 会请求 Azure 并写音频，
仅在文本与拼音完成独立审核且有生成授权时使用。
默认音色为 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`；
凭据仅从既有运行环境读取，不写入仓库。
`video:audit-narration` 对当前素材进行识别与发音评估，不代替整句试听。

## 验收边界

完整制作源、52 段正式配音、字幕和实测时间线已齐备；内容、音频解码、
无头布局及相关类型检查通过。全部 52 段均有绑定当前素材的识别与发音评估记录；
自动评估覆盖完整不等于读音验收通过。完整试听、真实成片及可见桌面验收尚未完成。
文本、拼音、实际音频、无头页面与成片验收分别记录，
不得将代码或自动检查通过表述为整集已验收。
下列入口只供用户导出；助手禁止执行渲染，仅可检查 `--dry-run`。

## 用户导出入口

- `video:preflight`：独立内容、音频解码和全页布局预检；不被导出入口自动调用。
- `video:export`：使用已核验浏览器及系统分配的独立端口，生成 `out/intersection-goals-frames/` 中的 4K PNG。
- `video:export-audio`：同一时间线的 48 kHz、16 bit、双声道 PCM WAV，输出 `out/intersection-goals-audio.wav`。
- PNG 与 WAV 命令均支持 `--dry-run`，不会覆盖已有产物。完整五阶段流程见 [工程操作说明](../../../docs/agents/videos/operations.md#五阶段命令模板)。

### 当前版本的导出参数

五阶段命令及每步继续条件统一见[公共模板](../../../docs/agents/videos/operations.md#五阶段命令模板)，工作目录为本工程。当前时间线为 42,652 帧、60 fps，
约 11 分 50.87 秒。已核验 Remotion 4.0.539 的默认 PNG 编号为
`element-00000.png` 至 `element-42651.png`；导出后仍须核对实际目录。

| 模板参数 | 本工程值 |
| --- | --- |
| `FPS` | `60` |
| `START_NUMBER` | `0` |
| `PNG_PATTERN` | `out/intersection-goals-frames/element-%05d.png` |
| `SILENT_VIDEO` | `out/intersection-goals-silent.mov` |
| `TIMELINE_WAV` | `out/intersection-goals-audio.wav` |
| `FINAL_MOV` | `out/intersection-goals.mov` |
| `MUX_TOOL` | `../../shared/tools/mux-mov.ts` |

此前使用的 `REMOTION_BROWSER_EXECUTABLE` 路径为 `../../line-equation-tutorial/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell`；提供命令前仍须按公共规则现场核验真实路径和版本，不能将此记录当作当前环境已核验。所有输出使用不存在的新路径，保留有效产物。

制作、试听、端口与交付规则见 [视频工程规则](../../AGENTS.md)
及其链接的各阶段文档。
