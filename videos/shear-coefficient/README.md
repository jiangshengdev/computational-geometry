# 剪切系数为什么不能随便选

第二集规格为 [CNB #209](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/209)，制作任务为 #210–#214。依赖声明与配置参考第一集，遵循 [视频工程规则](../AGENTS.md)。当前仍是空白脚手架，尚未实现教学内容、配音和检查工具。

需要用户安装依赖后使用。Node.js 要求为 `^22.18.0 || >=24`；包管理器为 pnpm。Remotion 保留本工程的 `4.0.538`，新增 KaTeX、Azure Speech SDK 及相应类型依赖。

逻辑画面为 1920×1080、60 fps，通过 2 倍比例输出 4K；编码配置与第一集一致。当前空白 composition 仍为 2 秒，不代表成片时长。配音、内容检查、布局检查及带检查门禁的导出脚本尚未移植，因此暂不提供这些命令。助手不得渲染或导出视频。

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

**Install Dependencies**

```console
pnpm install
```

**Start Preview**

```console
pnpm --config.verify-deps-before-run=false run video:dev
```

**Check source**

```console
pnpm --config.verify-deps-before-run=false run video:lint
```

**Upgrade Remotion**

```console
pnpm --config.verify-deps-before-run=false run video:upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
