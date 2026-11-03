# 从任意端点求出完整交集

第三章上集，composition：`CompleteIntersection`。权威规格为 [CNB #320](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/320)，文案与画面阶段为 [#321](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/321)。制作源及对应关系见 [production-reference.md](./production-reference.md)。

五节、21 页、64 个教学步骤 `CI01`–`CI64` 已接入独立原速 PCM WAV、实测词时间与字幕。`timeline.ts` 复用共享完整音频时间线；旧的按字数阅读窗口已退出计算。教学行预显半秒，逐步累积；每页完整画面保留 3 秒，`CI61` 原有 4 秒观察窗保留。当前时间线为 57,921 帧（60 fps，约 16 分 5 秒），不是已经导出的成片。后续 [#325](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/325) 仍须核对整片声音、实际播放同步与用户导出的真实成片。

当前 64/64 正式音频均有绑定音频哈希和口播指纹的识别与发音评估，原始响应及汇总位于 `out/narration-audit/`。原始程序标记为遗漏 0、插入 0、发音异常 40；这些是自动标记，未当作人耳确认的错误，也未删除或标为已试听通过。CI16 的 E 已获用户确认采用 IPA `/iː/`，其他字母仍使用默认英文拼读；该确认不代表其他字词或整集人耳验收完成。提供导出命令前仍须按[导出前音频检查](../../../docs/agents/videos/operations.md#导出前音频检查)核验当前版本，区分检测覆盖、三类自动标记与实际试听结论。

## 内容入口

- `src/storyboard.ts`：先行审校的字幕、分镜与稳定步骤 ID；每页指向第三章原文节名，每步记录首次引入、画面操作、保留内容及观察窗口。
- `src/narration-text.json`：从字幕派生并独立审校的冻结纯文本，数学公式口语化，保持自然词组及字母边界。
- `src/speech-text.json`：与冻结稿逐字相同的读音准备稿，通过局部 `{text,pinyin}` 标注维护；字幕不读取这些发音标注。
- `src/sentence-plan.json`：逐个字幕原句对应既有口播短句；共享工具按原句末尾 400ms、句内短句末尾 200ms 生成显式停顿，保留朗读文字与读音标注。
- `public/narration/`、`src/audio-timing.json`、`src/captions.json`：选定的完整原始 WAV、源哈希、请求指纹、实测词时间及字幕；不按磁盘上其他历史文件猜测版本。
- `src/IntersectionDiagram.tsx`：本集局部图示；横纵每单位均为 80 个逻辑像素，重合输入保持原位置。
- `src/ConceptDiagram.tsx`：六组无数值几何示意，配合端点辨认、点归属、坐标投影、候选点范围、零分母前提和边界比较；逐步保留已讲对象，复用共享标签与语义提示，不替代一般论证。
- `src/TeachingPage.tsx`：统一教学页、完整行先显示、逐行累积、中性色短字幕；语义提示由当前短句选择对象。
- `src/JudgmentPath.tsx`：第五节才把已讲分支汇成完整路径，不在开场揭示整图。
- `src/LayoutCheck.tsx`：真实生产组件的无声 DOM 检查，不执行 Remotion 静帧或视频导出。

## 工程命令

在本目录运行，仅使用已安装工具。首次缺依赖时由用户自行执行 `pnpm install --frozen-lockfile`；助手不安装组件。日常检查关闭 pnpm 自动安装：

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
pnpm --config.verify-deps-before-run=false run video:sentence-pauses
pnpm --config.verify-deps-before-run=false run video:plan-narration
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
```

`video:sentence-pauses --write` 仅重建显式停顿，不改朗读文字或拼音；修改原句或口播后，先按语义更新对应映射再运行。`video:plan-narration` 输出 64 个独立请求的完整 SSML、指纹、原文及 SSML 字符数，并按[官方计费规则](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech#billable-characters)从实际 SSML 排除 `speak`／`voice` 标签、保留其他标记、汉字计双份，计算本批请求量；不联网、不合成、不写音频。该计算不是账户免费余额、Azure 账单或报价；识别评估及失败重试另计。音频调用仍须先按 #323 展示完整请求计划并取得确认；该计划不表示文本、实际发音或音画同步已验收。

`video:narration` 接入共享单并发合成与续跑，读取本集独立口播和分句映射，保留原速 PCM WAV；传入 `--dry-run` 时只打印请求。当前显式启用 `stageOnly`，不复制正式音频或写入正式时间线，不能用时间校验通过代替待完成的读音核验。运行时在当前进程桥接 `SPEECH_KEY`／`SPEECH_ENDPOINT`，并沿用会话 HTTPS 代理，不持久化凭据。缺少密钥、服务拒绝或检查失败时保留暂存素材；通过日志中的 `--resume=<暂存目录>` 复用指纹、格式与哈希匹配的素材，不因重试改变音色或语速。`--shots=CI39` 等选择只限定本次请求，正式替换仍要求整集素材、读音核验与字幕时间齐全。

`video:check-staging --staging=<已有暂存目录>` 只检查源 WAV 的格式、解码、哈希、当前请求与时间数据，在暂存目录保存检查结果；失败非零退出，不发布素材，不代替试听。`video:audit-narration` 复用当前音频哈希对应的有效响应；尚有已知问题待修时不提前重跑最终全片检测。缺失评估或仍有自动标记时，该命令非零退出，不能把覆盖完成当作读音通过。正式接入的源 WAV 保留原字节，曾确认的 IPA 版本直接复用，没有重新合成来替代用户确认素材。

布局检查前须将已安装且匹配 Remotion 4.0.539 的 **Chrome Headless Shell 157.0.8080.0** 真实路径设置为 `REMOTION_BROWSER_EXECUTABLE`。检查入口会验证版本、使用系统分配的独立端口并关闭自己启动的进程。可用 `--shots=CI47,CI48` 限定受影响片段；`--screenshots` 仅保存浏览器页面截图到系统临时目录。缺少工具时停止，不自动下载或回退浏览器。

预览入口为 `pnpm --config.verify-deps-before-run=false run dev --port=<独立临时端口>`，不自动打开窗口；代理使用系统分配端口，不能复用普通开发端口。可见窗口须另获授权。

## 用户导出入口

已接入共享的 `video:preflight`、`video:export` 和 `video:export-audio`。先按上文设置匹配版本的 `REMOTION_BROWSER_EXECUTABLE`。`video:preflight` 独立执行完整音频解码、内容及生产布局检查，不包含语音识别与发音评估，不自动执行导出。

PNG 入口使用 `CompleteIntersection`，按 2 倍比例输出 3840×2160、60 fps 帧序列到 `out/complete-intersection-frames/`；音轨入口从同一 composition 输出 `out/complete-intersection-audio.wav`，显式使用 48 kHz、16 bit PCM 并关闭视频硬件加速。两者均复用共享入口的浏览器版本核验、系统分配独立端口及禁止覆盖保护，不依赖预检状态，不改变原始音频语速。

以下命令只检查参数，不生成画面或音轨：

```sh
pnpm --config.verify-deps-before-run=false run video:export --dry-run
pnpm --config.verify-deps-before-run=false run video:export-audio --dry-run
```

实际导出由用户按[五阶段命令模板](../../../docs/agents/videos/operations.md#五阶段命令模板)执行，先核验当前音频检测结果，再依次检查 PNG、无声 H.265、同时间线 WAV 与 MOV；合并入口为 `../../shared/tools/mux-mov.ts`。入口及 dry-run 不代表音轨或成片已验收，助手禁止渲染或导出。后续配音与同步参见[公共时间线规则](../../../docs/agents/videos/timeline.md)，试听及成片验收参见[交付规则](../../../docs/agents/videos/delivery.md)。
