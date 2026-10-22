# 剪切如何改变坐标

第一集规格为 [CNB #203](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/203)，制作任务为 #204–#208。参考直线方程教程的制作方式，遵循 [视频工程规则](../AGENTS.md)，工程保持自包含。

## 当前状态

目前仅完成脚手架与基础配置。`MyComp` 仍是 2 秒空白 composition，采用 1920×1080 逻辑尺寸、60 fps；Remotion CLI 配置以 2 倍比例输出，并采用上级规则中的编码默认值。这不代表教学内容、配音或成片已经完成。

尚未接入配音生成、时间线、字幕、布局检查和用户导出包装脚本，不应套用相邻工程的脚本命令。

## 环境与命令

需要已有 Node.js（版本范围见 `package.json`）、pnpm 及项目依赖。依赖由用户安装，锁文件统一使用 `pnpm-lock.yaml`：

```sh
pnpm install
```

以下命令均在本工程目录执行，并关闭运行前自动安装依赖：

```sh
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:build
```

`video:build` 只打包工程，不渲染视频；产物 `build` 已忽略。用户需要预览时可自行执行：

```sh
pnpm --config.verify-deps-before-run=false run video:dev
```

预览命令不自动打开浏览器。助手启动服务仍须遵循项目端口隔离规则；可见窗口需要单独授权。

依赖包含 KaTeX、Azure Speech SDK 及对应类型，与参考工程版本范围一致。Remotion 配置仅供 CLI 使用；未来如通过 Node API 导出，须显式传入同等配置。

## 检查与验收

当前只能检查基础配置与空白工程。后续按 #203 增加教学内容后，再检查口语稿、原速配音、布局、两次思考窗口和音画同步；工程检查不能替代完整试听及真实成片验收。助手禁止渲染或导出视频。
