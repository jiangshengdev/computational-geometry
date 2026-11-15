# 第十集：总工作量为什么受控

已接入全部 45 段原速配音，其中 TW06/TW21/TW26/TW34 使用已选新版。完整对照见 [四段采用记录](assets/narration-comparison.md)，当前证据和停点见 [配音交接](NARRATION_HANDOFF.md)。

独立 Remotion 工程。父规格 [CNB #407](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/407)，阶段票 [#408](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/408) → [#409](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/409) → [#410](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/410) → [#411](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/411)；配音同步 [#412](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/412)、作者导出与真实成片验收 [#413](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/413) 分阶段推进；本轮仅 #412 接入和同步，#413 不执行。

依据为[第十章中文正文](../../../docs-site/i18n/zh-Hans/docusaurus-plugin-content-docs/current/segment-intersection/total-work.mdx)。#396 是文章规格，不是本集父规格。第九集成果不改动。

当前为实测原速配音版本：16 页、45 个独立教学步骤，1920×1080 逻辑尺寸、60 fps；45479 帧（12:37.983）。音频合计 688.6725 秒；每镜引入0.5秒，同页间隔0.5秒，16个页末均完整保留至少2秒。全片无裁切、调速或重合成。机器检测45/45匹配当前素材：漏读0、插入0、发音标记43；实际听辨和真实成片验收未完成。

## 预览与检查

在本集目录运行（依赖已按锁文件安装）：

```sh
cd /workspace/computational-geometry/videos/bentley-ottmann/total-work
pnpm --config.verify-deps-before-run=false run dev
```

打开终端实际显示的 Studio 地址，选择 **TotalWork**，以 1x 播放。`LayoutCheck` 是使用同一生产页面的静态状态检查入口，支持 `?auditShot=TW22&auditFrame=600` 定位。正式播放读取 `public/narration/*.wav`；先确认 Git LFS 文件已恢复为 RIFF 音频。

代理检查须按[端口隔离规则](../../../docs/agents/runtime.md)使用自有临时端口，不能接入或关闭用户服务。浏览器只使用已核验且与 Remotion4.0.543 匹配的 Chrome Headless Shell158.0.8127.2。当前云环境的检查命令：

```sh
export REMOTION_BROWSER_EXECUTABLE=/workspace/.local/share/remotion-browsers/158.0.8127.2/chrome-headless-shell-linux64/chrome-headless-shell
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-text
pnpm --config.verify-deps-before-run=false run video:check-layout
```

仅改动局部时可使用 `video:check-layout --shots=TW03,TW22`，保留其他有效结果。依赖缺失时按用户授权和项目规则处理，不依赖相邻集的 node_modules。跨机器需核验本机浏览器版本和路径。历史无声目视见 `src/visual-review.json`，当前实测同步记录见 `src/measured-review.json`；布局检查不能替代该记录。

## 制作源与来源

- `src/lesson.json`：页面、稳定 TW 镜头 ID、中文字幕、重点、正文来源、旧内容复用位置及新增推理；画面与字幕共用这一来源。
- `src/narration-text.json`：独立纯口语稿；`src/sentence-plan.json` 显式对应原字幕语义句与口播内部短句。
- `src/speech-text.json`：保留冻结文字的读音标注与语义停顿；纯文本／拼音审校记录见 `src/text-review.json`，不是实际声音验收。
- `src/timeline.ts`：从完整音频与词时序构造镜头、字幕、语义提示及页末停留；`lesson.json`中的readingSeconds仅保留为无声分镜历史参考，已退出播放和检查计时。`TeachingPage` 复用共享教学页、数学排版与已讲依据，`WorkDiagram` 承载本集图示。
- `src/case-evidence.json`：从真实 Rust HTTP 执行轨迹摘录的事件、成员与完整结果，含原轨迹哈希及源码来源。教学停步和快照数不作为普通求交操作数。

主案例为 Geometry Lab `multiway-endpoints`，按原点报告时刻展示四条不同支撑直线上的闭线段。局部 1 事件、4 组、6 新对与全程 E=7、H=10、k=6 分开。短对照 `overlap-group` 的新输出为1、2、0、0，x=3仅删除短成员，两个长成员与已报告完整区间保留。

### 参考继承与新增内容

| 能力／前置内容 | 已有来源 | 本集承接及新增 |
| --- | --- | --- |
| 左图右文、依据区、完整教学行、已讲内容保留 | 第九集 TeachingPage 的 `diagramPosition="left"`、MathLessonPage、TeachingReferences、TeachingMathLines | 本集显式左图右文，依据105逻辑像素；无图页整体居中，未来行预留空间；正文局部重点色、字幕中性 |
| 数学标签与对象身份 | 共享 SemanticMathText；项目 inputColors | SVG数学标签与viewBox1:1，四输入稳定颜色和身份标签；重叠按身份/结果分行，不移动几何高度 |
| 输入对数与输出下界 | pairwise-baseline D24–39 | TW11/15/36仅引用计数结论，用于事件见证、组对注入和队列对数界，不重演枚举证明 |
| 同点参与、三类唯一报告 | same-point-participants SP37–48；overall-correctness OC22–29、55 | TW01–06引出局部/全程账本；TW13–29新增参与量与成员访问的当场支付 |
| 同线报告与纯结束事件 | overlap-reporting OR09–28、38–41 | TW20–29说明旧输出不能反复支付全组扫描，新增展开量和外层循环计费 |
| 覆盖与局部更新 | overlap-discovery OD05–14、25、33–39；overall-correctness OC35–39 | TW30–37累计维护、排序、检查及重复预约，不重证发现正确性 |
| 数值长度与操作次数区别 | pairwise-baseline D39；精确判断正文数值成本边界 | TW41–45同一事件三栏区分普通操作、数值单次成本与教学额外成本，不给秒数 |

图示的选择、揭示和配对过程按语义安排；旧共享 AttentionMarks 存在脉动半径，当前新图采用单向揭示、固定对象尺寸和不重复闪烁的局部强调，不沿用该脉动。此处只记录本集差异，不修改共享模块或旧视频。

## 已有无声版验证（历史基准）

真实 Rust 轨迹核对两个案例的事件、参与身份和输出，并记录现有后端可执行文件与相关源码哈希。当前 PATH 无 cargo，锁文件重新构建未成功；轨迹输入、身份与报告条件另对照当前源码核验。工程 lint／类型、内容与停顿映射检查通过；自动布局覆盖全片941个生产状态，修复后另复查受影响355个状态及TW26的21个状态，未将布局计数当作教学验收。

独立画面审校观察45镜起始、中态、阅读末态及同页／跨页接缝；另以1x实际抽查开场、配对构建、重叠退出、完整TW26及TW33→34。无头播放观察帧率约19–49fps，未做全片连续播放、稳定60fps或可见桌面验收。具体发现、修复和受审版本见 `src/visual-review.json`。

规范审查：无阻断项；六对标签平行数据的轻微维护问题已改为由配对身份派生。规格审查：TW26单组分支沿用跨组图的问题已改为点—段支付／无点不展开，并另做独立画面复查。45镜、259口播短句的纯文本与拼音已完成同一版本的两次顺序独立全文盲审及历史核销，无剩余问题；阶段记录见 `src/text-review.json`；它们不代表实际发音验收。

## 当前接入、离线核验与停点

当前制作源已落实所选版本；完整音频、合成词事件、评估原始响应与实测词时间绑定于 `src/audio-timing.json`，采用来源与成功请求回执见 `assets/narration-adoption.json`。既有成功批次已整理，原始四段对照保留在 `assets/narration-review/`，其余旧批次可从 f441193 / 200c28f 历史读取；不参与当前播放。

`narration:plan --dry-run` 可离线重建当前SSML；`narration:captions` 由当前实测音频和审校映射生成字幕；`narration:check` 完整解码并核对45段哈希、时长、请求指纹、全部原始机器标记及生成字幕一致性。它们都不调用语音服务。合成/评估入口仅供另行授权的未来修复，不能重放已成功请求。

本轮不导出或发布，不改 #407/#412/#413 状态。#413 的作者导出入口和真实成片验收仍须后续实施；当前没有成片，也未完成实际听辨、全片连续播放或可见桌面验收。用户明确要求在知晓四段复测及残余疑点后接入，本记录不把该授权扩大为一般听辨豁免。
