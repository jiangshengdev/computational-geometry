# 为什么不会漏掉交点 · 第 2 章下集

当前制作依据为 [规格 #306](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/306)
及执行票 #307–#315。新版覆盖六章，保持一集；权威进度与验收记录在 CNB。
用户已授权整个规格及全部执行票。画面、定稿和新版配音接入已经完成，
#315 的整合核对和交付材料继续推进；完整试听与成片验收尚未完成。

## 当前制作阶段

`WhyNeighbors` 已使用新版原速配音。1920×1080 逻辑画布、60 fps，沿用原工程。
54 页、192 个逐步教学行；每行保留完整表达式与对应字幕，页内累积。
普通页结束后保留完整画面 1 秒，分镜中明确标记的推导密集页保留 2 秒；
两处反证思考页保留 5 秒，不与页末停留叠加。
54 段原始音频合计 1832.285 秒（约 30 分 32 秒）。当前时间线 116077 帧，
即 1934.617 秒（约 32 分 15 秒）；这不是已导出或已验收的成片。
每页从头到尾连续播放完整原速 WAV，逐步揭示、引用提示和字幕由定稿语义映射
及真实词时间驱动。不再使用无配音预览的步骤时长，不在页内补阅读空白或重复
添加音频前导；不改变 WAV、语速、词时间及口播内部停顿。

- 第一章：具体高度、固定相减次序、正零负的含义。
- 第二章：两条直线分别相减、系数差与常数情形。
- 第三章：数值数轴、一般比例、完整代数推导及两种变号方向。
- 第四章：无事件不换序、交点前区间、夹层两侧排除与相邻性反证。
- 第五章：三类新邻接、换序依据、最早漏点从检查到报告的反证。
- 第六章：不多报、不重复、原始输入对身份、局部与总工作量边界。

内容依据是 `docs-site/docs/segment-intersection/why-neighbors-proof.mdx`。
图示明确区分真实数值案例、一般示意和待排除的假设，不冒充算法执行轨迹。

## 制作入口

在本目录执行，仅使用已安装组件：

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查须将匹配 Remotion 4.0.539 的 Chrome Headless Shell 157.0.8080.0
真实路径设置到 `REMOTION_BROWSER_EXECUTABLE`。入口使用系统分配的独立临时端口、
真实生产组件和无头浏览器，结束时关闭自己启动的服务；不调用视频或静帧导出。
可用 `--shots=V-replace,V-squeeze` 限定复查范围，`--screenshots` 仅保存浏览器页面截图。
可见窗口需要当次单独授权。

内容检查核对引用先讲后用、本页来源齐全、数学排版、逐步揭示、提示结束后保留及页末停留。
布局检查核对每步前后、提示起中末、依据与正文边界、图示标签、字幕和页末状态。
这些检查不能替代实际试听、音画同步、连续成片观看或可见桌面验收。

## 权威内容与历史素材边界

- `src/storyboard.ts`：六章页面、稳定 `V-…` 标识、字幕、逐行操作说明、公式编号、直接依据、阅读密度与思考窗口。
- `src/lesson.ts`：从同一分镜派生生产页面与片段，不维护第二份教学文案。
- `src/timeline.ts`：标记 `measured-narration`；只消费新版 `V-…` 实测音频、字幕与语义计划。
- `src/TeachingPage.tsx`：复用 `MathLessonPage`、`TeachingMathLines`；多依据同时可查，同页与跨页来源按当前操作局部提示。
- `src/ProofDiagram.tsx`：高度比较、比例、交点前区间、夹层假设、邻接变化及最早漏点因果示意。
- `src/LayoutCheck.tsx`：同一生产页面的状态检查，沿用共享检查能力。

`narration-text.json` 是按新版字幕独立编写并审校冻结的 54 段 `V-…` 口播正文。
`speech-text.json` 在保持冻结正文逐字一致的前提下记录局部读音；
`sentence-plan.json` 记录原字幕语义句与口播分段，包含 219 个原句末边界和
560 个内部边界，分别请求 400ms 和 200ms。它同时提供字幕与口播的语义映射，
供 dry-run、实测字幕对齐及逐步讲解映射共同复用，不生成或推测词时间戳。
版本哈希、独立文本审校、词典查证、两轮全文盲审与历史核销证据以
[#313](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/313) 的完成记录为准。

原 `N01–N31` WAV 及其时间记录保留，但不参与新版 composition。
旧字幕、文本和标注可从本地 Git 历史查看；历史验收结论不覆盖新版。
新 `audio-timing.json` 绑定 54 段 WAV 的 SHA-256、SSML 指纹、原始合成词事件
及完整评估响应；`captions.json` 只包含新版字幕。所有 WAV 均为 Azure 原始
48 kHz、16 bit、单声道 PCM，已核对真实格式与完整解码。

`video:adopt-narration --staging=<完整暂存目录>` 使用已有评估核对整批素材，
聚合全部失败再报告；不请求合成，不改变原试听目录。全部目标满足时间与字幕
校验后复用公共发布入口接入正式素材。该操作不是试听或成片验收。
`video:audit-narration` 复用匹配当前音频的完整响应，保存到 `out/narration-audit/`；
有自动标记时仍返回非零，不删改标记。当前覆盖 54/54，原始标记为
`Mispronunciation=145`、`Omission=2`、`Insertion=1`。

本集将发音听辨与词时间有效性分开：文本一致、真实时间有效的发音疑点可以先
用于同步，同时保留 `pending-listening`，不能据此宣称读音正确。其他工程默认
仍使用原有严格策略。未确认的漏读、插入、文字错配、缺失时间或重叠时间继续拒绝。
`src/listening-review.json` 保存用户对 `V-last-event` 的字母 r 和
`V-reverse-between` 的“也”的试听确认，绑定音频哈希、指纹、原始响应位置及字词。
仅对这些已确认的误识别复用原有有效合成词事件；不改写原始评估或编造时间。
用户另接受 `V-heights` 末尾“差”的读音，绑定 WAV SHA-256
`865a1e36bf155aa7982a596db875fcf45d0b41e9c53b326409c8236ab4fa1dee`。
这些局部结论不代表其余片段已逐句试听，原始漏读／插入计数仍不满足导出前的零标记要求。

仍可运行 `pnpm --config.verify-deps-before-run=false run video:sentence-pauses`
及 `pnpm --config.verify-deps-before-run=false run video:narration --dry-run`，
后者仅检查文案、音色、SSML 与句界，不请求语音服务。

此前约 35–45 分钟是文本阶段排期估计；当前以本页顶部的实测音频与时间线为准。

## 试听与最终交付

运行 `pnpm --config.verify-deps-before-run=false run video:listening-guide`
生成本地完整试听材料，位置由命令输出。材料按制作顺序包含全部 54 段完整口播、
对应原速 WAV、原始自动标记及位置、已有局部确认、音频哈希和 SSML 指纹。
生成前核对当前正文、素材与评估绑定，复用已有检查能力；不请求语音服务，
不改变音频、原始标记或验收状态。生成材料含本机绝对音频路径，仅保存在被忽略的
`out/` 中，不上传 CNB 或提交 Git。反馈使用片段 ID、时间位置及实际问题即可。

完整试听尚未核验，用户对三个局部疑点的既有结论继续有效，不重复索取。
源音频材料不含时间线添加的阅读停留，不能代替真实成片连续观看。
现行导出门禁仍按原始漏读和插入计数执行；人工确认没有自动改写该门禁。
本阶段不提供可执行导出命令，助手不渲染或导出视频及静帧。

旧 `out/why-neighbors-frames/`、`out/why-neighbors-audio.wav`、无声视频及 MOV
保留。旧 MOV 时长约 502.700 秒，不能作为新版 1934.617 秒的验收对象。
新版 PNG 与 WAV 入口分别使用独立的 `out/why-neighbors-306-frames/` 和
`out/why-neighbors-306-audio.wav`；后续无声视频和 MOV 也应使用 `306` 前缀的新路径。
共享入口继续禁止覆盖已有输出、动态分配独立端口并核验匹配版本的 Headless Shell。
导出门禁解除后按公共五阶段模板准备命令，核对当时实际版本、输出路径和帧编号；
不能用 dry-run、源音频试听或无头状态检查宣称成片已经验收。

参考继承见 [production-reference.md](production-reference.md)。
