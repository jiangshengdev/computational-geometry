# 视频工程操作说明

适用于仓库 `videos/` 下的视频工程；同时遵循 [视频工程规则](../../../videos/AGENTS.md) 中贯穿各阶段的约束。

## 浏览器检查环境

- 浏览器检查默认使用已有 Chrome、无头模式及系统分配的临时端口，结束后关闭自身启动的进程。可见窗口须遵循单独授权要求。

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

布局检查需要已安装的 Chrome 和 Playwright CLI，使用独立临时端口与无头会话，结束后清理自身进程。可添加 `--screenshots` 保存生产页面的浏览器截图，不调用 Remotion 视频或静帧导出。检查覆盖范围和实际结果仍在各 README 记录。

### 用户导出

以下命令仅供用户自行执行，适用于 `shear-intuition` 和 `shear-coefficient`：

```sh
pnpm --config.verify-deps-before-run=false run video:export
```

入口先执行音频与内容检查及同一生产布局检查，任一失败即停止；通过后按[默认制作配置](configuration.md#默认制作配置)输出到各工程 README 指定的文件。硬件编码不可用时直接失败。命令存在或前置检查通过不代表成片已验收。`line-equation-tutorial` 使用其 README 中的专用导出命令；五个空白工程尚无此入口，后续接入状态以各自 README 为准。

### 空白工程的发布素材

适用于 `shear-integer-coordinates`、`shear-intersection-denominator`、`shear-safe-coefficient`、`shear-special-cases`、`shear-preserves-intersections`；路径相对于各自工程目录：

- 标题、简介与标签：`assets/bilibili-copy.md`。
- 两种比例封面及提示词：`assets/covers/`。
