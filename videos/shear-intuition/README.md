# 剪切如何改变坐标

第一集规格为 [CNB #203](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/203)，制作任务为 #204–#208。参考直线方程教程的制作方式，遵循 [视频工程规则](../AGENTS.md)，工程保持自包含。

## 当前状态

已实现 48 个镜头、14 个完整教学页面和对应的 Azure 原速配音。整集入口为 `ShearIntuition`；`Shear204`、`Shear205`、`Shear206`、`Shear207` 为独立片段入口，`LayoutCheck` 复用生产页面检查内容容纳与标签重叠。

实测音频驱动时间线为 16241 帧，60 fps 下约 **4 分 30.68 秒**。`204-12` 和 `207-01` 的问题音频结束后各有 240 帧思考窗口，答案在后续镜头出现。音频时长向上取整到整帧，每段前有 12 帧引入；不改变原始音频或播放速度。

教学顺序：扫描线与竖直线段动机 → 正纵坐标点移动 → 负高度思考题 → 固定点的斜坐标读数 → 完整逆变换 → 新横轴不变 → 新纵轴刻度 → 第二次思考与两种操作对照 → 下一集引子。示意不是算法执行轨迹。

## 环境与命令

本次检查使用 Node.js 24.17.0、pnpm 11.8.0，以及已安装的 FFmpeg、ffprobe、Chrome 和 Playwright CLI。工具入口直接执行 TypeScript，要求 Node.js 22.18+（22.x）或 24+，具体范围见 `package.json`；不支持 Node.js 20。依赖由用户安装，锁文件统一使用 `pnpm-lock.yaml`：

```sh
pnpm install
```

以下命令均在本工程目录执行，并关闭运行前自动安装依赖：

```sh
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

现有配音可直接使用，无需再次请求 Azure。只有重新生成配音时需要 `AZURE_SPEECH_KEY` 和 `AZURE_SPEECH_ENDPOINT` 环境变量；不要把凭据写入源码或任务记录。音色固定为 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`，服务失败停止，不改换音色。先 dry-run 核对口语稿，再按需生成某个片段：

```sh
pnpm --config.verify-deps-before-run=false run video:narration --issue=204
```

不传 `--issue` 会生成全部配音。生成器完整校验镜头 ID 和读音对象，在本次目标音频全部解码成功后发布音频及时长，并生成字幕时间数据。`video:check-content` 会拒绝口语稿、字幕或镜头 ID 与生成数据不一致的情况。

`video:build` 只打包工程，不渲染视频；产物 `build` 已忽略。用户预览时可自行执行：

```sh
pnpm --config.verify-deps-before-run=false run video:dev
```

预览命令不自动打开浏览器。助手启动服务仍须遵循项目端口隔离规则；可见窗口需要单独授权。

布局检查使用系统分配的临时端口、独立无头 Chrome 会话，结束后关闭本次会话和服务。需要已有 `playwright-cli`（本次为 0.1.22）及 Google Chrome；缺少时由用户安装，脚本不会安装组件。可选 `video:check-layout --screenshots` 将关键生产页面的浏览器截图写入系统临时目录，供人工检查；它不调用 Remotion 视频或静帧导出。

## 用户导出

制作配置遵循 [视频工程规则](../AGENTS.md)：1920×1080 逻辑排版、2 倍输出 3840×2160、60 fps；H.265 硬件编码 `required`、`yuv420p`、PNG 中间帧、AAC 192 kbps、并发 4，视频码率保持默认不指定。本次未验证硬件编码器实际导出结果。

以下命令仅由用户执行；助手没有执行：

```sh
pnpm --config.verify-deps-before-run=false run video:export
```

入口先检查音频与文案一致性、解码、时长和同一套生产页面布局；任一检查失败就停止。通过后导出 `out/shear-intuition.mp4`。默认使用系统 Google Chrome，也可通过 `CHROME_EXECUTABLE` 指向已有浏览器。硬件编码不可用会直接失败，不回退软件编码。`out` 已忽略，不纳入提交。

## 文件映射

| 文件                                                  | 职责                                            |
| ----------------------------------------------------- | ----------------------------------------------- |
| `src/storyboard.ts`                                   | 完整页面、逐步揭示、镜头 ID、字幕文案与思考窗口 |
| `src/speech-text.json`                                | 独立口语稿，支持局部 `text`／`pinyin` 对象      |
| `src/audio-timing.json`                               | 实测时长、服务字词时间、合成文本和音色          |
| `src/captions.json`                                   | 生成的短镜头字幕及起止时间                      |
| `src/Diagram.tsx`、`src/TeachingPage.tsx`             | 等比例几何图与生产排版                          |
| `src/timeline.ts`、`src/Composition.tsx`              | 原速音频、字幕、动画和停顿的编排                |
| `scripts/narration.ts`、`scripts/azure-speech.ts`     | 本工程自包含的 Azure 合成与素材发布             |
| `scripts/check-content.ts`、`scripts/check-layout.ts` | 内容与音频检查、完整生产页无头检查              |
| `scripts/render.ts`                                   | 带检查门禁的用户导出入口                        |

本工程按规格保持自包含。Azure SSML 校验和浏览器检查入口沿用参考教程中已有的实现经验，运行时没有相邻工程导入；未修改旧教程。

## 检查与验收

已完成：本工程 lint／类型检查、48 个镜头完整口语稿 dry-run、48 个音频文件解码与实测时长核对、镜头／口语稿／音频／字幕 ID 对应检查、两次 4 秒窗口检查，以及 144 个关键教学状态的生产页面无头布局检查。检查包含隐藏未来步骤的完整占位，不通过缩字号、拆页或丢步骤处理失败。

以下验收仍为**未完成**，不能由上述工程检查代替：

- 完整试听：中文可懂性、数学读法、字母、坐标及自然度。
- 用户实际导出的完整视频：画面内容、旁白与公式／动画同步、两次思考窗口及结尾。
- 可见桌面验收。

助手未渲染或导出整片／片段，也未启动可见窗口。CNB #203–#208 保持开放；正式任务状态以 CNB 为准。
