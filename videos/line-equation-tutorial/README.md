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
- `src/scenes.ts`：按镜头 ID 对应逐步公式、说明与图形；提示时间相对于原分镜窗口，播放时按该镜头实测时长映射。
- `src/Diagram.tsx`：固定数学示意图；不属于算法执行轨迹。
- `src/timeline.ts`：根据实测音频生成的 `src/audio-timing.json` 排列各镜头、片段和全片。第 2、4 段问题结束后保留 4 秒；第 8 段使用独立的 4 秒静默镜头。
- 首段直接复用相邻 `line-equation-demo` 工程的 `Lesson`，须一起保留，不能只复制本目录源码。

已包含配音素材，再次渲染不需要语音服务。重新生成配音要求本机已有 `say` 的 `Tingting (中文（中国大陆）)`、FFmpeg 和 ffprobe：

```sh
pnpm --config.verify-deps-before-run=false exec node scripts/narration.ts
```

脚本将数学符号转换为可读发音，通过 FFmpeg 调整语速，再测量编码后的音频。镜头随真实音频校准；过短的旁白缩短窗口，避免极慢语速。生成后的时间线、音频和实际画面需一起检查，不能只改 JSON 中的时长。首段四个已验证素材由原 demo 复制，保留原来源。

## 验收边界

工程检查不能替代最终视频的内容与音画验收。发布或关闭任务前，应按 #197 及各 Resolution 核对真实成片，完整试听中文可懂性及同步，并检查第 2、4、8 段思考窗口。无头渲染不代表已执行可见桌面验收。
