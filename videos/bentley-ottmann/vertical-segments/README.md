# 第七章：用剪切处理竖直线段

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

内容依据为 [规格 #363](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/363)，无声教学稿制作对应 [#364](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/364)。

基础配置参考第六章上下集：依赖清单采用 Remotion 4.0.540，接入共享 Remotion、TypeScript 与 ESLint 组件策略；Composition 为 `VerticalSegments`，逻辑画布 1920×1080、60 fps，按 2 倍比例输出 4K。共享配置使用 PNG、H.265 硬件编码、48 kHz PCM、并发 4，禁止覆盖已有输出。当前保留 60 帧空白占位，不代表教学时长。

## Commands

本工程统一使用 pnpm，依赖版本由 `pnpm-lock.yaml` 管理，依赖构建许可由 `pnpm-workspace.yaml` 管理。

以下入口均在本集工程目录执行：

- 首次对齐依赖清单后，由用户运行 `pnpm install --no-frozen-lockfile` 更新锁文件并安装；锁文件同步后，后续使用 `pnpm install --frozen-lockfile`。
- 启动预览服务（不自动打开窗口）：`pnpm --config.verify-deps-before-run=false run dev`。
- 检查：`pnpm --config.verify-deps-before-run=false run lint`。
- 打包（不渲染）：`pnpm --config.verify-deps-before-run=false run build`。

当前已接入共享基础配置，尚未制作教学内容、配音或本集专用检查及导出入口。依赖清单更新不等于实际安装完成；安装后须核对依赖和必要检查。导出须在后续完成项目门禁及入口接入后，按[工程操作说明](../../../docs/agents/videos/operations.md)提供用户执行命令；助手不得渲染或导出视频。

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
