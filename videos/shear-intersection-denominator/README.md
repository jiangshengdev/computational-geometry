# 从消元法到分母上界

两条直线的交点，分母能有多大？从初中消元法讲起｜剪切变换④

规格：[CNB #226](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/226)。当前只制作 [#227 代表样例](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/227)，遵循 [视频工程规则](../AGENTS.md)。样例尚待用户确认；确认前不制作 #228、#229，也不开展 #230 全片串联。

## 样例内容与入口

Studio composition `Shear227` 使用六页生产教学组件、20 段独立口播，60 fps、9297 帧，总长 154.95 秒：

| 页面     | 内容                                     | 完整画面停留 |
| -------- | ---------------------------------------- | ------------ |
| 前置回顾 | 统一整数缩放、约定整数系数、M≥1 与系数界 | 3 秒         |
| 两条直线 | X+Y=1、X−Y=0，整数端点与公共点           | 3 秒         |
| 消元练习 | 两式相加，思考抵消哪一项，不展示分数答案 | 4 秒静默     |
| 求横坐标 | 展开括号、抵消 Y、2X=1、除以非零的 2     | 5 秒         |
| 求纵坐标 | 代入 X−Y=0、两边加 Y、交点有序数对       | 5 秒         |
| 两式核对 | 分别代回原方程，说明分母来自除法         | 5 秒         |

图示两轴每单位均为 300 逻辑像素，使用同一投影；蓝线、紫线与交点有局部对应色。直到求出两个坐标后才标出 `P=(1/2,1/2)`，练习期间保留题目与最后字幕。所有公式、坐标、刻度与数学字幕统一通过 KaTeX 排版，未来推导行预留空间。

`speech-text.json` 是从审校后的 `storyboard.ts` 字幕派生的独立口播，使用局部拼音与大写字母 IPA；字幕保留自然书面标点。`public/narration/` 保存原速服务音频，`audio-timing.json` 和 `captions.json` 由公共制作流程生成，不手写或估算词时间。全部目标通过检查后才替换正式素材。

## 参考继承对照

参考第三集 `videos/shear-integer-coordinates` 的本地快照 `167bf29d90727b3a32baefa47d78e9902e6c1ac8`，公共能力迁移提交 `c6c2bd8`。已读取实际生产组件、配置、README 制作记录及公共规则。

| 能力                         | 参考实现与本集接入                                                         | 主题差异                                                   |
| ---------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 字幕样式、短句切换、静默保留 | `shared/ui/Subtitles`、`shared/speech/timing` → `TeachingPage`、`timeline` | 本集独立字幕和口播，字幕统一中性色                         |
| 统一数学混排与间距           | `shared/ui/MathText` → 本集 `MathText`                                     | 例题分式、绝对值及系数条件                                 |
| 图示标签描边与遮挡           | `shared/ui/MathText` 的 `SvgMathText` → `Diagram`；公共 DOM 检查           | 两条直线及公共点，等比例投影；不沿用缩放动画               |
| 页面空间                     | 第三集 `TeachingPage` 的 1920×1080、左右图文列                             | 本集六页内容，右列仍为 900 逻辑像素                        |
| 局部强调                     | `shared/ui/TeachingMathLines` → 本集页面配置                               | 普通公式采用中性色，当前步骤底色和下划线；图示对象局部着色 |
| 推导分组、等号对齐与行距     | `shared/math/math-lines`、`shared/ui/TeachingMathLines`                    | 显式分组；72/96 行槽、24 组距；分式整组预留高度            |
| 字母、多音字、变调与轻声     | `shared/speech/azure-speech` → 本集 `scripts/azure-speech`                 | 逐句局部拼音、大写字母 IPA；不启用人工放行对齐疑点         |
| 实测同步与页末停留           | 第三集时间线规则提取为 `shared/speech/shot-timeline`，两集共同调用         | 本集无连续缩放运动；4 秒练习与 3/5 秒停留                  |
| 内容与生产页面检查           | `shared/checks/content`、`dom`、`layout` → 本集入口                        | 检查揭示、题目保留、答案泄露、等比例、标签与溢出           |
| 制作配置                     | 既有 `remotion.config.ts`                                                  | 保留公共默认 4K/60 fps、H.265 硬件配置；本轮不渲染         |

未继承参考中的非重点公式持续着色；本集显式采用中性色。公共公式组件的默认行为保持不变。时间线提取仅涉及共享规则，第三集教学内容和正式素材未变。布局入口新增显式浏览器路径选项，本集调用前核验版本，不沿用普通 Chrome。

## 使用与必要检查

Node.js ^22.18.0 或 >=24，Remotion 4.0.538。仅使用已有依赖。以下命令在本工程目录运行：

```sh
pnpm --config.verify-deps-before-run=false run video:dev
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
```

`video:dev` 不自动打开浏览器；在 Studio 选择 `Shear227`。代理启动服务须使用系统分配的独立临时端口。`video:narration --dry-run` 只打印经过校验的完整口播和 SSML；去掉 `--dry-run` 才请求 Azure。环境与原速约束见[配音规则](../../docs/agents/videos/narration.md)。中断后使用日志给出的 `--resume=<暂存目录>`，已有片段只在指纹及音频检查通过时复用。

无头检查前，将 `REMOTION_BROWSER_EXECUTABLE` 设为本机已经安装的 Chrome Headless Shell 的绝对路径。入口从当前 Remotion renderer 获取所需版本，核验二进制真实路径与 `--version`；缺失或不匹配直接失败，不下载或回退。

```sh
pnpm --config.verify-deps-before-run=false run video:check-layout --screenshots
```

布局检查通过生产 `ShotScene` 覆盖全部字幕切换、揭示前后、静默起止及页末完整状态，使用系统临时端口和无头会话，并关闭自身进程。截图是浏览器 DOM 截图，不是 Remotion 静帧或视频导出。用户导出入口属于 #230，本样例不提供整集导出入口。

## 交付状态

内容、独立字幕与口播、原速正式音频、实测时间线及制作入口已完成。已通过完整口播 dry-run、20 段音频解码与时长检查、素材指纹与字幕一致性、4 秒练习及全部页末停留检查、本集 lint／类型检查。生产组件的 154 个时间状态全部通过无头布局检查，并逐页查看六页完整画面的浏览器截图。

共享时间线提取后，第三集整集与三个分段入口的 64,174 个逐帧状态均与参考提交一致，第三集 lint／类型检查通过。未运行全仓库测试。独立规范审查提出的持续公式着色、读音标注遗漏及重复时间线三项已修正；规格审查未发现阻断缺陷。

合成期间遇到零时长词边界及对齐疑点，均由原有检查停止。对受影响句子作数学等义改写或局部读音标注后重新合成，未编造词时间、调速或人工批准疑点。无头检查最初超时；进程采样显示耗时集中于字体就绪时的布局树重建，改为逐状态复用节点后完成全部检查，没有减少覆盖、降低阈值或改用其他浏览器。运行时核验的 Headless Shell 为当前 Remotion 指定的 `157.0.8080.0`。

**待验收**：用户代表样例确认、全部实际整句音频的读音与自然度试听、真实成片同步及可见桌面验收。自动对齐、解码、类型检查和无头截图均不能替代上述验收。助手未渲染或导出视频，未修改 CNB 状态或父规格；#227 尚未满足用户确认门禁，#228–#230 未开始。
