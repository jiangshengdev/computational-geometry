# 由两个端点写出直线方程

依据 [CNB #197](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/197) 和 #198–#202 制作的八段中文教程。工程时间轴为 1920×1080、30 fps；可按下方命令采样输出 15 fps，保持原始播放时长和音频速度。完整 composition 为 `LineEquationTutorial`；四组独立检查入口为 `Parts1And2`、`Parts3And4`、`Parts5And6`、`Parts7And8`。

## 使用

在本目录执行以下命令。需要已有的项目依赖、Node.js 22.18+、pnpm 和 Chrome；不自动安装任何工具。pnpm 参数关闭运行前自动安装依赖的行为。

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false exec node scripts/render.ts
```

本次交付采用 15 fps；去掉抽帧参数即可按工程原始 30 fps 渲染。并发数可按本机资源调整：

```sh
pnpm --config.verify-deps-before-run=false exec node scripts/render.ts render LineEquationTutorial out/line-equation-tutorial.mp4 --every-nth-frame=2 --concurrency=12
```

完整输出为 `out/line-equation-tutorial.mp4`。输出目录被 Git 忽略，不强制暂存。渲染脚本使用已有 Chrome、无头模式和系统分配的临时端口。Chrome 不在 macOS 默认应用位置时，用 `CHROME_EXECUTABLE` 指定现有可执行文件。

```sh
pnpm --config.verify-deps-before-run=false exec node scripts/render.ts render Parts1And2 out/parts-1-2.mp4
pnpm --config.verify-deps-before-run=false exec node scripts/render.ts still LineEquationTutorial out/frame.png --frame=1200
```

## 内容维护

- `src/narration.json`：从 #189–#196 已确认 Resolution 提取的逐镜旁白、原始时间窗与画面要求，作为制作素材使用。权威规格和任务状态仍在 CNB。
- `src/speech-text.json`：全部 56 段的独立口语稿及 `196-2` 的空白静默项，按镜头 ID 对应字幕；坐标明确读横纵坐标，乘法、负数、下标用口语写出，字母列举明确分隔。修改字幕后需人工同步核对口语稿。生成脚本只读取此稿，不用字幕原文兜底。
- `src/scenes.ts`：按镜头 ID 对应逐步公式、说明与图形；提示时间相对于原分镜窗口，播放时按该镜头实测时长映射。
- `src/Diagram.tsx`：固定数学示意图；不属于算法执行轨迹。
- `src/coordinates.ts`：开场与正文共用的坐标映射，默认两轴单位长度相等；保持绘图区尺寸并扩展显示范围。正文可在对应 `Cue.coordinateScale` 中显式设置 `{ mode: "independent", reason: "具体教学原因" }`，开场通过 `CoordinateDiagram` 的 `scale` 参数指定；画面会显示“不等比例示意”。当前所有镜头均使用默认等比例，不自动判断例外。
- `src/timeline.ts`：根据实测音频生成的 `src/audio-timing.json` 排列各镜头、片段和全片。第 2、4 段问题结束后保留 4 秒；第 8 段使用独立的 4 秒静默镜头。
- `src/Intro.tsx`、`src/intro-storyboard.ts`：本工程独立维护的开场画面与展示文案。字幕和时间线与其他章节共用同一份数据；开场动画随镜头时长映射，音频不调速。
- `scripts/azure-speech.ts`：本工程内的 Azure 请求函数。源码、配音和生成工具均不依赖相邻工程。

已包含配音素材，再次渲染不需要语音服务。重新生成配音使用 Azure 音色 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`，要求环境变量 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_ENDPOINT` 和本机已有 FFmpeg、ffprobe。可选的 `AZURE_SPEECH_VOICE` 必须与上述音色一致；失败时停止，不回退到系统语音：

```sh
pnpm --config.verify-deps-before-run=false exec node scripts/narration.ts
```

生成前可给上述命令添加 `--dry-run`，核对实际将发送的音色和完整口语稿；此模式不请求 Azure，也不写入音频或时长数据。

绝对禁止调速，包括合成请求中的语速参数、音频后处理和播放器倍速。脚本直接发送独立口语稿，原样保存 Azure 返回的 MP3；FFmpeg 只检查解码，ffprobe 只测量时长。全部 56 段通过检查后，替换素材及时间数据，文件统一以镜头 ID 命名，包括开场的 `189-1.mp3` 至 `189-4.mp3`。镜头时长由原始音频时长加段首、段尾停顿决定，不让语音迁就旧时间窗。生成后的时间线、音频和实际画面需一起检查。解码和时长通过不代表读法正确；坐标、字母、公式仍需试听核验。

现有全部 56 段素材仍是此前调速后的版本，尚未按新口语稿重新生成；现有 `audio-timing.json` 中保留的 `tempo` 是历史记录，不代表原速。本次迁入开场资源只统一文件名并测量已有音频，不改变音频内容；重新生成时全部章节都会使用原速音频更新时长。

## 验收边界

工程检查不能替代最终视频的内容与音画验收。发布或关闭任务前，应按 #197 及各 Resolution 核对真实成片，完整试听中文可懂性及同步，并检查第 2、4、8 段思考窗口。无头渲染不代表已执行可见桌面验收。
