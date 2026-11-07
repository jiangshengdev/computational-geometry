# 第五章上集工程

本集由 Remotion Blank 模板创建，配置参考 `same-point-participants`。需求以 [#343](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/343) 和 [#344](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/344) 为准。

## 当前配置

- Remotion `4.0.540`、React `19.3.1`；数学排版、语音 SDK 和开发工具沿用第四章版本，保留已安装的精确版本约束。
- 复用 `videos/shared/config/remotion.ts` 与共享 TypeScript 配置，ESLint 接入 `componentPolicy`，不导入相邻视频的内容或素材。
- Composition ID 为 `OverlapReporting`，逻辑画布为 1920×1080、60 fps，输出比例为 2，对应 3840×2160。
- 共享配置采用 PNG、H.265、`yuv420p`、必须使用硬件编码、48 kHz PCM、并发 4；禁止覆盖输出，完成的 Sequence 不继续保持活动。
- 保留初始化器生成的 `allowBuilds.esbuild: false`，不执行 esbuild 安装脚本；不因旧工程允许就照搬批准配置。
- `dev` 不自动打开浏览器。代理运行服务仍须遵循[端口隔离规则](../../../docs/agents/runtime.md)。

## 检查入口

在本集目录执行 `pnpm --config.verify-deps-before-run=false run lint`，进行 ESLint 与 TypeScript 检查；执行 `pnpm --config.verify-deps-before-run=false run build` 只进行打包，不渲染视频。

当前仍是 60 帧的空白占位工程；该时长不代表教学片长。尚未接入分镜、教学画面、正式音频、内容／布局检查、实测时间线或导出入口。不得把基础配置与打包成功视为视频制作或成片验收完成。下集内容制作仍遵循既定前置任务。

## 制作与导出

遵循[视频工程规则](../../AGENTS.md)与[工程操作说明](../../../docs/agents/videos/operations.md)。浏览器必须匹配本集 Remotion 指定的 Chrome Headless Shell；使用前单独核验，不自动下载。

正式导出须在后续阶段完成相应检查并接入项目五阶段模板，由用户执行；本工程目前不提供导出命令。配音沿用项目默认音色与原始语速，在获得相应授权和通过门禁后接入。

## Remotion 许可

使用条件见 [Remotion 官方许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
