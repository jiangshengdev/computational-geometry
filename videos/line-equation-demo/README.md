# 为什么先找直线方程？

依据 [CNB #189 已确认分镜](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/189) 制作的第 1 段 demo。1920×1080、30 fps、40 秒，composition ID 为 `LineEquationIntro`。

在此目录使用 pnpm，预览命令如下（不自动打开桌面浏览器）：

```sh
pnpm exec remotion studio src/index.ts --no-open --port=49189
```

代理运行时应另选空闲临时端口，不复用用户已启动的服务。打开终端实际输出的地址，选择 `LineEquationIntro`，播放即可听到中文配音，也可以拖动时间轴检查各镜头。

- 0–8 秒：相交线段与交点，不显示交点坐标。
- 8–18 秒：依次突出两条线段，交点持续保留。
- 18–29 秒：淡出另一条线段，标出 A=(1,3)、B=(3,7)。
- 29–40 秒：以虚线延长 AB，引出下一段的问题。

`src/storyboard.ts` 保存确认稿原文和分镜时间；`src/Composition.tsx` 按帧驱动画面。这里的固定几何图示用于讲解动机，不是算法执行轨迹。

配音文件已包含在 `public/narration/`，预览不需要调用在线服务。配音为 macOS Tingting 合成语音 demo；脚本使用已安装的 `say`、FFmpeg 和 ffprobe，将各段语音适配到已确认时间窗，段首留 0.2 秒、段尾约 0.4 秒，不添加思考停顿。需要重新生成时，使用支持原生 TypeScript 的 Node.js（22.18+）：

```sh
node scripts/narration.ts
```

不要自动安装缺失工具或语音。检查源码：

```sh
pnpm run lint
```

如需导出视频：

```sh
pnpm exec remotion render src/index.ts LineEquationIntro out/line-equation-intro.mp4
```

`out/` 为忽略的本地产物目录。渲染需已有可用浏览器；可用 `--browser-executable` 指定本机 Chrome，避免自动下载。
