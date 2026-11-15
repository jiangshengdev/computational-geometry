# 第十集：总工作量为什么受控

独立 Remotion 工程。父规格 [CNB #407](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/407)，阶段票 [#408](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/408) → [#409](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/409) → [#410](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/410) → [#411](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/411)；后续配音同步 [#412](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/412)、作者导出与真实成片验收 [#413](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/413) 本轮不执行。

依据为[第十章中文正文](../../../docs-site/i18n/zh-Hans/docusaurus-plugin-content-docs/current/segment-intersection/total-work.mdx)。#396 是文章规格，不是本集父规格。第九集成果不改动。

当前为无声阶段：16 页、45 个独立教学步骤，1920×1080 逻辑尺寸、60 fps。暂定阅读时间线 54420 帧（15:07.000），包括每页完整终态至少两秒。该时间不是配音实测，后续必须按完整原速音频重新确定字幕、提示及镜头时长。本集无音频文件、Audio 元素或语音服务入口。

## 预览与检查

在本集目录运行（依赖已按锁文件安装）：

```sh
cd /workspace/computational-geometry/videos/bentley-ottmann/total-work
pnpm --config.verify-deps-before-run=false run dev
```

打开终端实际显示的 Studio 地址，选择 **TotalWork**，以 1x 播放。`LayoutCheck` 是使用同一生产页面的静态状态检查入口，支持 `?auditShot=TW22&auditFrame=600` 定位。无声不等于缺失资源，当前没有声音是本阶段的设计。

代理检查须按[端口隔离规则](../../../docs/agents/runtime.md)使用自有临时端口，不能接入或关闭用户服务。浏览器只使用已核验且与 Remotion4.0.543 匹配的 Chrome Headless Shell158.0.8127.2。当前云环境的检查命令：

```sh
export REMOTION_BROWSER_EXECUTABLE=/workspace/.local/share/remotion-browsers/158.0.8127.2/chrome-headless-shell-linux64/chrome-headless-shell
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-text
pnpm --config.verify-deps-before-run=false run video:check-layout
```

仅改动局部时可使用 `video:check-layout --shots=TW03,TW22`，保留其他有效结果。依赖缺失时按用户授权和项目规则处理，不依赖相邻集的 node_modules。跨机器需核验本机浏览器版本和路径。实际目视与原速抽查记录见 `src/visual-review.json`；布局检查不能替代该记录。

## 制作源与来源

- `src/lesson.json`：页面、稳定 TW 镜头 ID、中文字幕、重点、正文来源、旧内容复用位置及新增推理；画面与字幕共用这一来源。
- `src/narration-text.json`：独立纯口语稿；`src/sentence-plan.json` 显式对应原字幕语义句与口播内部短句。
- `src/speech-text.json`：保留冻结文字的读音标注与语义停顿；纯文本／拼音审校记录见 `src/text-review.json`，不是实际声音验收。
- `src/timeline.ts`：暂定阅读计时、字幕窗口及页末停留；`TeachingPage` 复用共享教学页、数学排版与已讲依据，`WorkDiagram` 承载本集图示。
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

## 停点

本轮不生成或接入语音，不执行音画同步，不渲染静帧、音轨或视频，不发布。后续 #412 必须使用定稿文本、合法配置的原速语音服务和实际音频时序；#413 由作者按[项目五阶段流程](../../../docs/agents/videos/operations.md#五阶段命令模板)导出，再验收真实成片。当前没有成片，不能声明成片验收完成。
