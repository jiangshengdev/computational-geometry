# 视频工程操作说明

适用于仓库 `videos/` 下的视频工程；同时遵循 [视频工程规则](../../../videos/AGENTS.md) 中贯穿各阶段的约束。

## 浏览器检查环境

- 浏览器检查只能使用满足[唯一浏览器约束](configuration.md#唯一浏览器约束)的 Chrome Headless Shell，以无头模式及系统分配的临时端口运行，结束后关闭自身启动的进程。不得使用完整 Chrome 的无头模式替代。

## 共享操作说明

本节记录现有工程的操作入口，不要求尚未实现某项能力的工程提前提供脚本。命令均在对应工程目录执行；安装命令仅供用户自行执行。

### 基础命令

以下命令适用于 `shear-intuition`、`shear-coefficient`、`shear-integer-coordinates`、`shear-intersection-denominator`、`shear-safe-coefficient`、`shear-special-cases`、`shear-preserves-intersections`：

```sh
pnpm install
pnpm --config.verify-deps-before-run=false run video:dev
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:build
```

`video:dev` 启动 Studio，不自动打开浏览器；`video:build` 仅打包，不渲染视频。助手启动服务仍须遵循项目端口隔离规则，可见窗口需要单独授权。`line-equation-tutorial` 的命令见其 README，不套用本节入口。

### 配音环境与续跑

适用于 `line-equation-tutorial`、`shear-intuition` 和 `shear-coefficient`。这些工程已有配音素材；仅重新生成配音时需要 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_ENDPOINT` 和已安装的 FFmpeg、ffprobe。凭据不得写入源码或任务记录。使用[默认制作配置](configuration.md#默认制作配置)中的 Azure 音色，生成前先执行对应入口的 `--dry-run`，按[口语稿与读音](narration.md#口语稿与读音)规则核对完整输入。各工程的入口及片段选择参数见其 README。

`line-equation-tutorial` 和 `shear-intuition` 的续跑说明：生成失败时保留暂存目录，使用日志给出的 `--resume=<临时目录>`。仅复用完整 SSML（含音色、局部读音）及音频 SHA-256 均匹配的已完成片段，仍须重新校验；仅修改拼音也会使旧音频失效。全部目标片段通过检查后才发布正式素材。具体检查项及对齐机制见各工程 README。

### 内容与布局检查

以下入口适用于 `shear-intuition` 和 `shear-coefficient`：

```sh
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查需要满足唯一浏览器约束的已安装 Chrome Headless Shell 和 Playwright CLI，使用独立临时端口与无头会话，结束后清理自身进程。可添加 `--screenshots` 保存生产页面的浏览器截图，不调用 Remotion 视频或静帧导出。检查覆盖范围和实际结果仍在各 README 记录。

### 用户导出

所有视频默认分阶段进行，浏览器必须满足[唯一浏览器约束](configuration.md#唯一浏览器约束)，包括单独导出音轨：

1. 用户生成并保留 PNG 帧序列；检查数量、编号、尺寸及画面异常后再继续。
2. 用户将已检查的 PNG 序列独立编码为无声 H.265 视频；检查解码、帧数、时间戳及全片逐帧突变，可疑帧须与原 PNG 对照。
3. 无声视频检查通过后，再由用户导出同时间线的 48 kHz、16 bit、双声道 PCM WAV，并合入 MOV；保持原速，检查成片音画同步。没有已核验的同时间线音轨时，须从对应时间线单独导出，不能直接套用其他成片音轨。

最终合并入口为 `videos/shared/tools/mux-mov.ts`，参数依次为已检查的无声 H.265 视频、同时间线 WAV、新的 MOV 路径。通过 `pnpm --config.verify-deps-before-run=false exec node ../shared/tools/mux-mov.ts <video> <audio> <output.mov> --dry-run` 只读查看合并参数；去掉 `--dry-run` 仅供用户自行执行。入口检查编码、采样率、位深、双声道和时长，使用 `-c:v copy -c:a copy`，不新增音画编码，不裁短音轨，不覆盖文件或删除 PNG。时长接近不代表内容属于同一时间线，仍须按前述流程核对来源及同步。

- 出现已定位的错误帧时，先提供针对该帧的 `remotion still --frame=<帧号>` 命令，输出到独立文件，与原错误帧及相邻帧对照；不得默认要求重渲染整片。单帧正常仅证明该次输出正常，不能证明并发整片渲染已无异常。
- 每阶段完成并检查后再给下一阶段命令；未完成的检查明确标注，不将渲染退出码或文件头检查当作全片画面验收。
- 保留原始 PNG、错误帧、无声视频和对照产物；排查不授权删除、覆盖、替换或回退文件，也不授权改动 `.gitignore`。本流程不改变助手禁止渲染或导出视频的约束。

#### 导出命令的配置兼容性

- 提供命令前，读取当前工程的 `package.json`、`remotion.config.ts` 和实际导出入口，核对 CLI 参数与工程默认值合并后的有效配置。改变 `--codec` 或输出扩展名，不代表 `audioCodec`、硬件加速等独立配置会自动切换；不得只检查命令行上显式写出的参数。
- 单独导出 WAV 时，必须显式使用 `--codec=wav --audio-codec=pcm-16 --sample-rate=48000 --hardware-acceleration=disable`，并检查结果为双声道，避免继承视频编码和硬件加速要求。纯音频步骤关闭视频硬件加速，不改变无声 H.265 视频必须使用硬件编码的要求；浏览器参数仍须满足唯一浏览器约束。
- 针对当前已安装的 Remotion 版本，通过本地参数解析、编码兼容表或不触发渲染的校验入口，核验输出格式与音频编码组合后再给出命令。不得以实际渲染、自动下载或安装组件作为命令试错手段；参数校验通过只能声明参数兼容，不能声明音轨已导出或成片已验收。
- 修正某一步的参数错误时，只重试失败步骤；保留已生成的 PNG、无声视频和音轨，不默认要求重做前序步骤，也不通过覆盖既有产物绕过错误。

以下入口只完成 PNG 阶段，沿用上述分阶段检查与保留流程：

以下命令仅供用户自行执行，适用于 `shear-intuition`、`shear-coefficient`、`shear-integer-coordinates` 和 `shear-intersection-denominator`：

```sh
pnpm --config.verify-deps-before-run=false run video:export
```

入口先核验匹配版本的 Headless Shell，再执行音频与内容检查及同一生产布局检查，任一失败即停止；通过后输出到各工程的 `out/<工程名>-frames/`，不覆盖已有目录。添加 `--dry-run` 只展示参数，不生成画面或音轨。命令存在或前置检查通过不代表成片已验收。`line-equation-tutorial` 使用其 README 中的专用 PNG 导出命令；其他空白工程的接入状态以各自 README 为准。

### 空白工程的发布素材

适用于 `shear-integer-coordinates`、`shear-intersection-denominator`、`shear-safe-coefficient`、`shear-special-cases`、`shear-preserves-intersections`；路径相对于各自工程目录：

- 标题、简介与标签：`assets/bilibili-copy.md`。
- 两种比例封面及提示词：`assets/covers/`。
