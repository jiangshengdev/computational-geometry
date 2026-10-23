# 特殊情况与原坐标

竖直线段、重叠线段、一个点，剪切后怎么办？｜剪切变换⑥

制作与验收遵循 [视频工程规则](../AGENTS.md)。当前工程是两秒空白 composition，尚未制作教学页面、字幕或配音。

## 配置与依赖

复用已完成工程 `videos/shear-coefficient` 的 Remotion 与 TypeScript 配置，参考配置提交为 `43e47fa`。各工程保留独立配置与依赖，不运行时引用相邻工程。

- Remotion 4.0.538；Node.js ^22.18.0 或 >=24；使用 pnpm。
- 1920×1080 逻辑画面、60 fps，配置 2 倍输出比例，对应 3840×2160。
- H.265 硬件编码 required、yuv420p、PNG 中间帧、AAC 192k、并发数 4；不设置 CRF 或目标视频码率。
- 依赖与参考工程一致，包括 KaTeX、Azure Speech SDK 及 Node/KaTeX 类型声明。
- 保留已批准的 `allowBuilds.esbuild: true`。

## 命令

在本工程目录运行：

```sh
pnpm install
pnpm --config.verify-deps-before-run=false run video:dev
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:build
```

`video:dev` 不自动打开浏览器；`video:build` 仅打包，不渲染视频。助手不得渲染或导出视频。

配音、内容检查、布局检查与带验收门禁的导出入口需在后续教学内容制作时接入，当前未配置这些尚不存在的脚本。配置继承不代表整集制作或成片验收完成。

## 发布素材

- 标题、简介与标签：`assets/bilibili-copy.md`。
- 两种比例封面及提示词：`assets/covers/`。
