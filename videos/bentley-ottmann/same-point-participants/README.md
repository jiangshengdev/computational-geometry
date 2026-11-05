# 第四章上集：找齐同点参与者，报告全部输入对

Composition：`SamePointParticipants`。依据：[规格 #334](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/334)、[文案与画面 #335](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/335)、[音频与同步 #336](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/336)、[整体验收 #337](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/337)。

57 个教学步骤、20 页，60 fps、61,171 帧，约 16 分 59.52 秒。范围为第四章正文第一至五节：共端点、端点落在内部、多线共点、连续相遇块、完整配对与零长度点输入。整块更新及无端点提示的共点发现留给下集；防重复与一般论证沿用 #335 的已确认结果。

## 制作源与生成物

| 文件                       | 职责                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `src/storyboard.ts`        | 当前字幕母稿、教学行、语义操作、分页与停留                        |
| `src/narration-text.json`  | 当前采用的独立口播，保留数学身份字母                              |
| `src/speech-text.json`     | 对应口播的实际读音与显式停顿；SSML 由共享构造器生成               |
| `src/sentence-plan.json`   | 当前字幕原句与口播短句的语义对应，原句末 400ms／句内 200ms        |
| `src/caption-plan.json`    | 当前短字幕与口播的对应，`source`／`target` 定位本集教学操作       |
| `src/audio-selection.json` | 明确选定的版本、音频哈希、请求指纹及已确认识别例外                |
| `public/narration/*.wav`   | 唯一一套正式完整原速音频，Git LFS 管理                            |
| `src/audio-timing.json`    | 正式音频、真实词事件及原始评估响应；SP24 同时保留映射前的合成事件 |
| `src/captions.json`        | 从当前字幕计划和实测词时间生成的播放字幕                          |

当前稿件可重建全部 57 份已采用请求的原始 SSML 与指纹，不再把旧冻结稿当作当前制作输入。SP24 的两处 D 在读音稿中明确写为 `{ "letter": "D", "englishWord": "dee" }`；字幕、独立口播和教学对象仍为 D。其正式 WAV 为用户选定的 `D-dee-v1`，20.78 秒，SHA-256：
`efad0bbdd73fe5123e720d6a721ccf33dec10d7e1adfacdeed546bdeba031c16`。

音频均为服务直接返回的 48 kHz／16 bit／单声道 PCM WAV，未裁切、调速或重合成。字幕、时间线、页面和播放复用 `videos/shared/`；本集不导入相邻视频业务源码。运行和检查不读取 `out`，临时输出整体忽略，历史试听和诊断可从 Git 历史追溯。

## 本地入口

在本目录运行，仅使用已安装工具：

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

`video:check-content` 检查数学、语义提示、内容保留、停顿，以及当前稿件→请求→所选音频→原始评估→实测词时间→生成字幕的完整对应；`--decode` 追加完整解码。`video:check-audio` 可单独执行完整音频检查。三类自动标记分别报告，不等同于实际听辨结论。

`video:plan-narration` 仅打印当前完整 SSML、指纹和计量，不读取凭据、不请求服务、不写音频。后续合成仍须按[配音规则](../../../docs/agents/videos/narration.md)另行展示计划并取得授权；没有自动重试或历史续跑入口。

`video:adopt-measured-audio --staging=<完整暂存目录>` 默认只验证；目录内提供全部所选 `SP*.wav` 和 `audio-timing.json`。先维护当前稿件、字幕计划和明确选定的音频清单，再核对整批格式、解码、哈希、请求、原始评估及真实词时间；全部有效后，显式加 `--write` 才复制完整原始 WAV，并统一生成正式时间数据和字幕。不能仅保存试听就宣称正式采用。接入回归检查：`pnpm --config.verify-deps-before-run=false exec node --test scripts/adopt-measured-audio.test.ts scripts/speech-alias.test.ts`。

`video:preflight` 复用共享的完整解码、内容和布局检查；`video:export`、`video:export-audio` 复用共享用户导出入口。助手禁止渲染或导出；用户导出须遵守[工程操作说明](../../../docs/agents/videos/operations.md)的音频门禁和五阶段流程。浏览器由共享入口核验为当前 Remotion 对应且已安装的 Chrome Headless Shell，使用独立临时端口；不自动安装，不启动可见窗口。

## 参考继承

工程组织参考第三章上下集；画面基准沿用 `511068a` 时的 `exact-sweep-decisions`。以下已确认表现继续保留：

| 要求                                     | 本集实现与观察位置                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 左图右文、数学排版、对象色与临时重点分开 | `TeachingPage.tsx` → 共享 `MathLessonPage`，显式 `diagramPosition="left"`；正文 850、图示 800、间距 65；公式 42、文字 36                           |
| 对象选择、描亮与同页内容累积             | `ParticipantDiagram.tsx`／`ParticipantFlows.tsx`；SP08 A→B→P，SP36 D→A→C，SP37 合并名单                                                            |
| 依据静态保留，未讲内容隐藏               | SP27／SP29 不预设 W 的终点，SP33 才出现夹层依据；共享 `TeachingReferences` 使用 `active:false`                                                     |
| 原始身份与完整报告                       | SP41 六对对应一个 P；SP53 分别提示 C/Z₁、C/Z₂、Z₁/Z₂，同位置身份不合并                                                                             |
| 已确认箭头形态                           | 实心三角头部 8×8、连线普通 2／高亮 3；事件三终点收拢；SP35／SP36 查找箭头保留圆角修正                                                              |
| 完整原速音频、真实字幕与语义动作时间     | `timeline.ts` 读取正式时间和生成字幕；共享 `createShotTimeline`／`createNarratedLesson`；开口前半秒、页末三秒、SP61 八秒思考，答案 SP62 不提前显示 |

## 当前验收与未决请求

原始自动评估覆盖 57/57：Mispronunciation 60、Omission 1、Insertion 1。SP06 的 B／“闭”两项严重标记已获用户明确接受，确认仍绑定原音频哈希、请求指纹和具体词位置；原始响应与原始计数保留。其他发音标记仍为机器疑点。助手未实际听辨，不将源文件一致、解码或布局通过表述为声音验收通过。

#336、#337 仍未完成。既有 SP35 长播时钟偏差未稳定复现，连续音画同步仍未验收；真实成片、实际听辨与可见桌面验收分别保留。历史连续诊断见提交 `30e0b4d`，不作为当前版本完整播放验收。

`narration/unresolved/omission-v2/` 仅保留四份未决请求原始记录，不参与当前播放、生成或正式音频检查。旧 SP41 请求为 uncertain、SP58 为 started，服务端最终状态未知，禁止据此重试；清单 SHA-256 为 `6758e28a7a989204305ef80fc5ade058cd32cc6a6b8fafce40a9d167a4c131fd`。该旧请求状态与当前已选音频是不同事项。
