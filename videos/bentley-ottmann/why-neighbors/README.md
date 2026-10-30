# 为什么不会漏掉交点 · 第 2 章下集

当前制作依据为 [规格 #306](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/306)
及执行票 #307–#313。新版覆盖六章，保持一集；权威进度与验收记录在 CNB。
画面阶段已完成；#313 交付独立口播与读音标注。#314 的配音、音画同步及
#315 的成片交付仍需后续明确授权。

## 当前制作阶段

`WhyNeighbors` 是无配音画面预览。1920×1080 逻辑画布、60 fps，沿用原工程。
54 页、192 个逐步教学行；每行保留完整表达式与对应字幕，页内累积，换页前保留
完整内容至少三秒。两处反证思考页保留五秒页末停留。
阅读窗口合计暂定 2224 秒（37 分 4 秒），不是实测音频或最终视频时长。
公式推导一般留十二秒，普通解释一般九秒，思考步骤显式留十二秒；后续按实际口播、
阅读和语义提示重新核对，不变速、不倒推伪造词时间。

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
pnpm --config.verify-deps-before-run=false run video:check-content
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

- `src/storyboard.ts`：六章页面、稳定 `V-…` 标识、字幕、逐行操作说明、公式编号、直接依据和暂定阅读窗口。
- `src/lesson.ts`：从同一分镜派生生产页面与片段，不维护第二份教学文案。
- `src/timeline.ts`：明确标记 `provisional-visual`；不读取历史音频或字幕时间数据。
- `src/TeachingPage.tsx`：复用 `MathLessonPage`、`TeachingMathLines`；多依据同时可查，同页与跨页来源按当前操作局部提示。
- `src/ProofDiagram.tsx`：高度比较、比例、交点前区间、夹层假设、邻接变化及最早漏点因果示意。
- `src/LayoutCheck.tsx`：同一生产页面的状态检查，沿用共享检查能力。

`narration-text.json` 是按新版字幕独立编写并审校冻结的 54 段 `V-…` 口播正文。
`speech-text.json` 在保持冻结正文逐字一致的前提下记录局部读音；
`sentence-plan.json` 记录原字幕语义句与口播分段，包含 219 个原句末边界和
560 个内部边界，分别请求 400ms 和 200ms。它同时提供字幕与口播的语义映射，
供既有 dry-run 和后续实测字幕对齐复用，不生成或推测时间戳。
版本哈希、独立文本审校、词典查证、两轮全文盲审与历史核销证据以
[#313](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/313) 的完成记录为准。

原 `N01–N31` WAV、`audio-timing.json`、`captions.json` 保持原样，作为历史素材。
旧文本及标注可从本地 Git 历史查看。历史音频不参与新版 composition，
既往哈希、配音评估和试听结论不代表新版已完成。
本次仅交付文本，未合成、替换、评估或试听配音。

配音、字幕时间生成和导出脚本保留为工程后续入口，但当前尚无新版实测音频。
`video:check-content --decode` 会明确拒绝将历史音频当作新版验收；当前
`video:preflight` 不代表新版可交付。后续按 #314 的实测素材接入。
文本阶段可运行 `pnpm --config.verify-deps-before-run=false run video:sentence-pauses`
及 `pnpm --config.verify-deps-before-run=false run video:narration --dry-run`，
后者仅检查文案、音色、SSML 与句界，不请求语音服务。

冻结口播含 7950 个汉字、107 个独立英文字母及 `alpha`、`beta` 两个词。
按每分钟约 220–280 个汉字作粗略排期，并为字母、句间及页末阅读留出余量，
预计整集约 35–45 分钟，尚未实测。这只是排期假设，不是合成语速参数；
不据此调整音频速率或缩短必要阅读时间。现有 37 分 4 秒仍只是画面预览时间，
#314 必须按原速实测音频、逐行语义及阅读停留重新核对。
本阶段不提供成片导出命令，助手不渲染或导出视频及静帧。

参考继承见 [production-reference.md](production-reference.md)。
