# 第四章上集：找齐同点参与者，报告全部输入对

依据：[规格 #334](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/334)、[#336 音频与同步](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/336)、[#337 整体验收](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/337)。父规格未修改。

`SamePointParticipants` 已接入 57 段完整原速 WAV，20 页、60 fps。时间线由实测音频时长及真实词事件计算，总长 1020.3167 秒；开口前保留半秒，页末保留完整画面及最后字幕，SP61 思考窗口仍为八秒。旧五秒阅读槽已退出播放计算。

## 当前音频与用户确认

用户要求保留最优音频，不进行实际试听，并明确确认“b/闭问题通过”，随后要求合并主干推送。按可验证词时间、较少发音标记、较早版本的顺序选出 57 段，版本与逐段 SHA-256 见 `out/best-audio/selection.json`。组合为原版 37、IPA v1 12、omission v2 4、context v3/v4/v6/v7 各 1。原始 WAV 逐字节复用，音色 Xiaoxiao、48 kHz／16 bit／单声道 PCM，无裁切、调速或重合成。

原始 Azure 计数：发音 61、漏读 1、插入 1；评估覆盖 57/57，缺失 0。SP06 原版 B／“闭”的两项严重标记由用户明确接受，未解决漏读／插入为 0，但原始计数没有归零。确认通过现有 `reviewedRecognition` 绑定该 WAV 哈希、口播指纹和具体词位置，采用原始识别事件的真实时长，不删除原始响应、不伪造词时间、不声称实际试听通过。所有 57 段通过真实词时间校验。其余发音标记保留为机器疑点。

## 当前文件与验证入口

- `public/narration/`：唯一一套所选完整音频，Git LFS 管理。
- `out/best-audio/selection.json`：选择依据、原始计数、逐段来源和候选比较。
- `out/best-audio/records/`：所选版本的原始评估及合成词事件，保持原始字节。
- `out/best-audio/requests.json`：所选独立口播、SSML、指纹及历史分句依据。
- `out/best-audio/audio-timing.json`：当前播放和字幕共用的实测时间及明确确认记录。
- `src/narration-map.json`：当前字幕原稿、对应口播短句、原分镜语义索引及提示对象；改写的八段使用自然书面标点并保留数学符号。
- `src/storyboard.ts`：教学正文、原始字幕语义索引、动作和思考窗口。`narration-text.json`、`speech-text.json`、`sentence-plan.json` 为原始冻结稿，只用于历史复核；当前播放读取上述选定版本。
- `src/timeline.ts`、`Composition.tsx`：复用共享实测时间线和完整音频播放组件；已引入内容与短时提示分别维护。

仅离线检查，不请求 Azure：

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-audio
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查仅使用已核验、匹配 Remotion 4.0.540 的 Chrome Headless Shell 157.0.8080.0，并分配独立临时端口。助手未安装任何组件；本环境复用了已经安装的同版本依赖。

## 历史输出清理与未决请求

冗余历史 out 已从当前树移除；全部已提交原始文件可从提交 `a4d50dfba776d140266b5d2f2dc4023b1f0e4426` 及 GitHub LFS 恢复，未重写历史。清理前另保留工作区归档 `/workspace/scratch/ch4-upper-history-a4d50df`，包括忽略文件与从未执行的 context-v8 计划。746 个历史文件的路径、大小和 SHA-256 见 `out/best-audio/history-index.json`。

`out/best-audio/unresolved/omission-v2/` 原样保留旧计划、SP41 诊断及请求清单。SP41 仍为 uncertain，SP58 仍为 started，服务端最终状态未知；没有重放旧请求。清单 SHA-256 仍为 `6758e28a7a989204305ef80fc5ade058cd32cc6a6b8fafce40a9d167a4c131fd`。本次整合没有新服务调用。

历史生成脚本仍保留供审计，但已从 package 命令入口退役；它们依赖已归档的原计划，不是当前播放或续跑入口。恢复历史记录不构成重新请求服务的授权。禁止为重试改写或删除未决清单。

## 验收边界

数学示例、字幕对应、所有实测词时间、完整解码与哈希通过。逐帧状态检查覆盖内容保留、语义动作进度、同页衔接与全页停留，独立复核修复了分句索引、静默回退和收集动作重启问题。具体浏览器覆盖及剩余事项见 `out/best-audio/verification.json`。

按用户要求未进行实际试听。浏览器状态检查不证明实际连续播放的音画同步或成片验收；尚未完成可见桌面连续播放核验及成片验收。未渲染、导出或发布视频，不提供导出命令。#336、#337 仍保持未完成，不将主干合并等同于整集验收通过。

## 参考继承与观察位置

代码基准为 `511068a` 时的第三章下集 `exact-sweep-decisions`。共享基础模块直接从 `videos/shared/` 引用，工程不导入相邻视频业务源码。

| 要求               | 基准入口 → 本集入口                                                                                    | 必要观察状态                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 页面、方向与空间   | 两集 `TeachingPage.tsx` → `MathLessonPage`，显式 `diagramPosition="left"`；正文 850、图示 800、间距 65 | SP04/SP06 输入递增；SP27/SP29/SP33 条件与结论；无图页居中                         |
| 数学与中数间距     | `SemanticMathText`、`TeachingMathLines`，公式 42、文字 36，长文换行                                    | SP06 混排、SP33 下标与夹层依据；未强调、强调与撤去                                |
| 对象色及局部重点   | 显式 `objectMarks`、`activeMarks`；字幕与标题中性                                                      | SP02 条件切换、SP08 A→B→P、SP22–SP24 角色色                                       |
| 图示语义提示       | `DecisionDiagram` 的共享 `AttentionMarks`、`point`、`stroke` → `ParticipantDiagram`                    | SP04 描亮、SP08 身份到交点、SP37 两路合并、SP41 六对指向同一 P、SP53 三对身份切换 |
| 依据静态保留       | `TeachingReferences`，`active:false`                                                                   | SP27 介绍对象、SP29 核对条件，SP33 才显示第二章夹层结论；不重演两次变号反证       |
| 字幕短句与静默保留 | 共享 `validateCaptionClauses`、`groupCaptionClauses`；本阶段没有词时间                                 | 短句切换、同页步骤间保留末条、跨页清空旧字幕                                      |
| 未讲内容与思考     | 未来行预留空间但不可见；合并后才出现完整名单                                                           | SP27–SP33 不预设 W 的边界高度；SP61 思考窗不显示 SP62                             |

数值图横纵单位相同，坐标轴正方向有箭头。点输入用同位置、同尺度分图区分身份，菱形不表示面积。一般夹层图仅表示顺序，不编造新坐标。防重复对照及问题核销以 #335 的当前记录为准；技术检查不替代新旧材料的教学内容对照。
