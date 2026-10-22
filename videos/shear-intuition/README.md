# 剪切如何改变坐标

第一集规格为 [CNB #203](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/203)，制作任务为 #204–#208。参考直线方程教程的制作方式，遵循 [视频工程规则](../AGENTS.md)，工程保持自包含。

## 当前状态

已实现 56 个镜头、16 个完整教学页面和对应的 Azure 原速配音。整集入口为 `ShearIntuition`；`Shear204`、`Shear205`、`Shear206`、`Shear207` 为独立片段入口，`LayoutCheck` 复用生产页面检查内容容纳与标签重叠。

实测音频驱动时间线为 19967 帧，60 fps 下约 **5 分 32.78 秒**。`204-12` 和 `207-01` 的问题音频结束后各有 240 帧思考窗口，答案在后续镜头出现。音频时长向上取整到整帧，每段前有 12 帧引入；不改变原始音频或播放速度。

教学顺序：扫描线与竖直线段动机 → 正纵坐标点移动 → 负高度思考题 → 固定点的直角／斜坐标读数对照 → 完整逆变换 → 从 (2,0) 推广到新横轴不变 → 新纵轴刻度逐步推导 → 第二次思考与两种操作同屏对照 → 下一集引子。示意不是算法执行轨迹。

## 环境与命令

本次检查使用 Node.js 24.17.0、pnpm 11.8.0，以及已安装的 FFmpeg、ffprobe、Chrome 和 Playwright CLI。工具入口直接执行 TypeScript，要求 Node.js 22.18+（22.x）或 24+，具体范围见 `package.json`；不支持 Node.js 20。依赖由用户安装，锁文件统一使用 `pnpm-lock.yaml`：

```sh
pnpm install
```

以下命令均在本工程目录执行，并关闭运行前自动安装依赖：

```sh
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false exec node --test scripts/speech-timing.test.ts
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

现有配音可直接使用，无需再次请求 Azure。只有重新生成配音时需要 `AZURE_SPEECH_KEY` 和 `AZURE_SPEECH_ENDPOINT` 环境变量；不要把凭据写入源码或任务记录。音色固定为 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`，服务失败停止，不改换音色。先 dry-run 核对口语稿，再按需生成某个片段：

```sh
pnpm --config.verify-deps-before-run=false run video:narration --issue=204
```

也可用 `--shots=204-10,206-03,206-04,206-16` 仅生成指定镜头；镜头 ID 必须存在且不能重复，不可与 `--issue` 同用。上述四段的口播将字母 `y` 写作 `why`，字幕和公式仍保留 `y`；其他字母和既有中文拼音标注不变。

不传 `--issue` 或 `--shots` 会生成全部配音。生成器完整校验镜头 ID、读音对象及讲解锚点，在本次目标音频全部解码、时长与字词边界校验成功后发布素材。合成输入的 SHA-256 指纹包含完整 SSML（包括音色和局部读音），仅修改拼音也会使旧音频失效。服务失败或校验失败即停止，保留临时诊断数据；可使用输出的临时目录配合 `--resume=<临时目录>` 复用指纹一致的暂存音频，仍须重新校验。

`video:build` 只打包工程，不渲染视频；产物 `build` 已忽略。用户预览时可自行执行：

```sh
pnpm --config.verify-deps-before-run=false run video:dev
```

预览命令不自动打开浏览器。助手启动服务仍须遵循项目端口隔离规则；可见窗口需要单独授权。

布局检查使用系统分配的临时端口、独立无头 Chrome 会话，结束后关闭本次会话和服务。需要已有 `playwright-cli`（本次为 0.1.22）及 Google Chrome；缺少时由用户安装，脚本不会安装组件。可选 `video:check-layout --screenshots` 将关键生产页面的浏览器截图写入系统临时目录，供人工检查；它不调用 Remotion 视频或静帧导出。

## 字幕、读音与教学时序

- 字幕采用参考教程的 40px、顶部分隔线与数学混排；按 Azure 字词时间切短句，合并短引导语。当前共 130 条字幕。同一教学页内静默保留上一句，换页重置；两次思考期间保留问题字幕。
- 全部 56 段口语稿已做文本核查，其中 48 段含局部读音对象，覆盖横、乘、撇、平行、长度、朝、量等语境。未标注片段交给 Azure 依语境合成；文本核查和服务成功不代表读音试听通过。
- 数学公式、轴名、点名、坐标和刻度均使用 KaTeX；中文保留中文字体。坐标轴正方向、读数辅助线及位移路线有箭头。重合横轴合并标注 x、x′。
- 图形运动和公式揭示使用口语片段锚点对应的实测时间。开场扫描线连续推进；先回顾直角坐标读数，再读斜坐标。新纵轴的坐标总结到推导完成才显示；结尾用同屏两图对照。

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
| `src/Diagram.tsx`、`src/TeachingPage.tsx`             | 等比例几何图、同屏对照与生产排版                |
| `src/MathText.tsx`、`src/Subtitles.tsx`               | 统一数学混排与字幕样式                          |
| `src/speech-timing.ts`                                | 字词校验、短句字幕和讲解锚点定位                |
| `src/timeline.ts`、`src/Composition.tsx`              | 原速音频、字幕、动画和停顿的编排                |
| `scripts/narration.ts`、`scripts/azure-speech.ts`     | 本工程自包含的 Azure 合成与素材发布             |
| `scripts/check-content.ts`、`scripts/check-layout.ts` | 内容与音频检查、完整生产页无头检查              |
| `scripts/render.ts`                                   | 带检查门禁的用户导出入口                        |

本工程按规格保持自包含。Azure SSML 校验和浏览器检查入口沿用参考教程中已有的实现经验，运行时没有相邻工程导入；未修改旧教程。

## 检查与验收

已完成：本工程 lint／类型检查、56 个镜头完整口语稿 dry-run、56 个音频文件解码与实测时长核对、合成指纹与镜头／口语稿／音频／字幕 ID 对应检查，以及两次 4 秒窗口的逐帧检查。必要回归覆盖拼音变更失效、字幕静默保留、字词异常与标点时间边界。

无头布局检查通过生产 `ShotScene` 在实际镜头帧上取样，本次 408 个状态全部通过，覆盖字幕切换、公式揭示前后、动画边界和思考窗口；检查字幕容纳、标签碰撞与结论是否提前可见，并保留隐藏未来步骤的完整占位。使用已有 Playwright CLI／Chrome（当前环境未提供 Browser 插件），不通过缩字号、拆页或丢步骤处理失败。浏览器截图用于人工核对，不作为样式快照断言。

以下验收仍为**未完成**，不能由上述工程检查代替：

- 完整试听：中文可懂性、数学读法、字母、坐标及自然度。本次环境无直接音频试听能力，未把文本核查、字词时间或音频解码当作试听结论。
- 用户实际导出的完整视频：画面内容、旁白与公式／动画同步、两次思考窗口及结尾。
- 可见桌面验收。

助手未渲染或导出整片／片段，也未启动可见窗口。本轮未修改 CNB #203–#208，也未执行 Git 提交或远程操作；正式任务状态以 CNB 为准。
