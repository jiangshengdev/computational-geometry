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
3. 无声视频检查通过后，再由用户合入与本次画面时间线一致的音频，保持原速，检查成片音画同步。没有已核验的同时间线音轨时，须从对应时间线单独导出，不能直接套用其他成片音轨。

- 出现已定位的错误帧时，先提供针对该帧的 `remotion still --frame=<帧号>` 命令，输出到独立文件，与原错误帧及相邻帧对照；不得默认要求重渲染整片。单帧正常仅证明该次输出正常，不能证明并发整片渲染已无异常。
- 每阶段完成并检查后再给下一阶段命令；未完成的检查明确标注，不将渲染退出码或文件头检查当作全片画面验收。
- 保留原始 PNG、错误帧、无声视频和对照产物；排查不授权删除、覆盖、替换或回退文件，也不授权改动 `.gitignore`。本流程不改变助手禁止渲染或导出视频的约束。

以下为已有一体化入口的说明，不代表已实现上述分阶段流程；准备分阶段命令时，核对实际脚本，不直接用一体化导出代替：

以下命令仅供用户自行执行，适用于 `shear-intuition` 和 `shear-coefficient`：

```sh
pnpm --config.verify-deps-before-run=false run video:export
```

入口先执行音频与内容检查及同一生产布局检查，任一失败即停止；通过后按[默认制作配置](configuration.md#默认制作配置)输出到各工程 README 指定的文件。硬件编码不可用时直接失败。命令存在或前置检查通过不代表成片已验收。`line-equation-tutorial` 使用其 README 中的专用导出命令；五个空白工程尚无此入口，后续接入状态以各自 README 为准。

### 空白工程的发布素材

适用于 `shear-integer-coordinates`、`shear-intersection-denominator`、`shear-safe-coefficient`、`shear-special-cases`、`shear-preserves-intersections`；路径相对于各自工程目录：

- 标题、简介与标签：`assets/bilibili-copy.md`。
- 两种比例封面及提示词：`assets/covers/`。
