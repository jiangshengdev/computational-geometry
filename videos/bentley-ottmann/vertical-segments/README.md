# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

本工程统一使用 pnpm，依赖版本由 `pnpm-lock.yaml` 管理，依赖构建许可由 `pnpm-workspace.yaml` 管理。

以下入口均在本集工程目录执行：

- 由用户安装依赖：`pnpm install --frozen-lockfile`。
- 无头启动预览服务：`pnpm --config.verify-deps-before-run=false run dev --no-open`。
- 检查：`pnpm --config.verify-deps-before-run=false run lint`。
- 打包（不渲染）：`pnpm --config.verify-deps-before-run=false run build`。

当前是空白初始化工程，尚未接入项目教学内容与共享制作配置。导出须在后续完成项目门禁及入口接入后，按[工程操作说明](../../../docs/agents/videos/operations.md)提供用户执行命令；助手不得渲染或导出视频。

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
