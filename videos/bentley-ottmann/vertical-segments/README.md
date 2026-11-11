# 第七章：用剪切处理竖直线段

本集承接 [规格 #363](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/363)，当前制作范围为 [#364：完整无声教学稿与画面](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/364)。工程由远端原生 Remotion 初始化提交 `732e35a` 建立，配置在 `9381d5a` 对齐第六章；本次在该工程中制作，不复制相邻工程或依赖目录。

## 当前内容

五节、22 页、64 个稳定步骤 `VS01`–`VS64`。字幕原稿及来源、承接与新增联系在 `src/storyboard.ts`；独立自然口播在 `src/narration-text.json`。`src/speech-text.json` 仅承载局部读音标注，不是正式音频。当前提供离线请求计划及受计划指纹约束的配音入口；尚未请求或采用正式音频，不提供视频导出入口。

| 节                       | 步骤      | 内容                                                       |
| ------------------------ | --------- | ---------------------------------------------------------- |
| 第一节：竖直输入卡在哪里 | VS01–VS06 | 主案例 V、A、B 与同列两个高度的参与资格                    |
| 第二节：统一变换输入     | VS07–VS21 | 同一系数、端点表、事件对应及三个保证的分工                 |
| 第三节：走完主案例扫描   | VS22–VS46 | 六个端点和两个交点；P′ 后换序、新邻接、Q′ 的覆盖与严格未来 |
| 第四节：还原完整答案     | VS47–VS56 | 两对点结果；独立 V、W 案例的完整重叠区间                   |
| 第五节：接回点输入       | VS57–VS64 | 独立 V、Z₁、Z₂ 案例的三对结果与点输入退出                  |

所有实际计算使用 `s=1/262144`。`example.ts` 用整数分子与公共分母表示实际变换坐标，供画面输入及内容检查共用；其恢复函数返回原 x 坐标的同分母分子。几何过程图明确使用放大示意系数 `s_vis=1/2`，保持横纵单位相同，不把示意的水平距离用于实际候选判断。活动顺序竖列表示关系，不是几何坐标。

`timeline.ts` 明确标记 `provisional-visual-inspection`，按字幕阅读窗口安排无声检查时长，每页末另留 3 秒。该版本阅读窗口合计约 16.3 分钟，只服务当前无声稿检查，不是配音实测、最终时长或音画同步结论。正式音频阶段须用原速完整音频的实测数据替换阅读窗口，重新绑定语义动作及字幕。句子内的配对、换序与登记按对应字幕短语安排，提示结束后教学对象和本页结论继续保留。

## 正式配音准备（#365）

父规格 #363 的无声稿阶段 #364 已交付。当前补齐 `src/sentence-plan.json`，按原字幕的完整语义句映射冻结口播短句：171 个原句末请求 400ms，179 个内部短句末请求 200ms。`speech-text.json` 仅新增独立停顿对象，冻结正文和已有读音对象不变；350 个边界由共享句界校验检查。请求值不是实际静音长度。

`video:plan-narration` 和 `video:synthesize` 复用共享批次工具及第六章的薄入口，固定既有音色与 48 kHz / 16 bit / 单声道 PCM WAV，禁止调速和自动重试。当前环境缺少 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_ENDPOINT`，正式合成尚未执行；不将离线计划或 dry-run 视为音频验收。凭据只能由运行环境提供，不写入工程。

在本目录可离线重建并检查计划（以下命令均不请求服务）：

```sh
pnpm --config.verify-deps-before-run=false run video:plan-narration --dry-run > /tmp/vertical-narration-plan.json
plan_sha=$(sha256sum /tmp/vertical-narration-plan.json | cut -d ' ' -f 1)
pnpm --config.verify-deps-before-run=false run video:synthesize --plan=/tmp/vertical-narration-plan.json --plan-sha256="$plan_sha" --output=/tmp/vertical-audio-not-requested --dry-run
```

两个入口均支持 `--shots=VS01,VS02`，局部计划和执行须使用相同的显式片段集合。真实请求前须核实阶段授权、服务配置及当前免费层限制；请求计划须重新核对并绑定哈希。共享工具保留逐段状态、音频哈希和请求指纹，结果未知时不得直接重放。当前没有正式素材、词时间、评估或采用记录；后续依次完成合成、评估与整句听辨、采用实测字幕及语义动画时间、独立同步检查，再接入导出预检。未实现的音频采用入口不以占位结果替代。

当前 `Composition`、字幕和暂定时间线仍是已验证的无声版本。#366 的成片检查另依赖用户导出；助手不渲染或导出视频。

## 参考继承与本集差异

基准为第六章 `same-column-events` 和 `same-column-reasons` 在 `9381d5a` 的实际页面组合。具体旧内容片段及本集新增联系逐页记录在分镜的 `reference` / `source`，不重新推导剪切证明、系数分母界或邻居发现证明。

| 能力                           | 旧实现入口                                                 | 新版承接与观察入口                                                                   |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 左图右文、正文累积             | 两集 `src/TeachingPage.tsx`；显式 `diagramPosition="left"` | 同名入口复用 `MathLessonPage` / `TeachingMathLines`；VS33、VS53、VS62 及全片布局检查 |
| 静态历史依据                   | `TeachingReferences`，`active:false`                       | 仅引用已讲结论，保留必要条件；不随当前步骤闪烁                                       |
| 正文对象色、局部重点、中性字幕 | 语义 `lineMarks`、`activeMarks` 与 `colorMath`             | V 蓝、A 橙、B 紫、W 绿，与第七章文章一致；字幕关闭染色                               |
| 数学标签与坐标                 | `SvgMathText`，1:1 SVG 视口                                | 本例专用 800×600 图示，等单位网格与正向箭头；标签坐标与几何共用变换                  |
| 换序与新邻接                   | 第六章 `EventDiagram` 的顺序竖列，`timeline` 的语义锚点    | VS33/40 标签与形状共用位移；VS34–38 独立展示邻接、覆盖、未来与登记                   |
| 提示收束、跨片段保留           | 共享 `AttentionMarks` 线段描亮；第六章字幕末句保留         | 只复用单次线段描亮；端点使用定半径提示，不引入重复脉动；`visualAt` 保留已达状态      |
| 正式配音与实测同步             | 第六章实测时间线                                           | 本阶段不适用；独立口播和标注不冒充音频                                               |

本集新增专用剪切/逆变换、区间与点身份图示，是原参考不能直接表达的新几何任务；公共页面与检查能力仍从 `videos/shared` 复用，不导入相邻集的教学内容或音频。逆变换时整幅示意一起还原，避免把原坐标点直接混画在新坐标图中。

## 检查与运行

在本目录执行，使用已安装依赖。Remotion 固定为 `4.0.540`，要求 Headless Shell `158.0.8127.2`。本次新云实例已核验的浏览器路径为：

```sh
export REMOTION_BROWSER_EXECUTABLE=/workspace/.local/share/remotion-browsers/158.0.8127.2/chrome-headless-shell-linux64/chrome-headless-shell
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
pnpm --config.verify-deps-before-run=false run build
```

`build` 只打包。布局入口为当前生产页面建立独立系统临时端口的无头 Studio，覆盖字幕边界、语义动作中途、步骤切换和页末，结束关闭自身进程。可用 `--shots=VS33,VS38` 做局部复查，`--screenshots` 将浏览器截图写入系统临时目录；不调用 Remotion 静帧或视频导出。

内容检查覆盖实际坐标变换、八事件先后、两份范围与严格未来、点和区间逆变换、64 段字幕/口播对应及页末保留。它不代替独立文本、读音、视觉过程审查。已完成证据、问题核销及最终状态以 #364 正式记录和提交说明为准；未取得的实际听辨、正式音画同步、可见桌面和成片验收不属于本阶段完成声明。

## 配置

Composition 为 `VerticalSegments`，逻辑画布 1920×1080、60 fps，输出比例 2。继续复用共享 Remotion、TypeScript 与 ESLint 组件策略；本集 TypeScript 目标 ES2020、库声明 ES2023/DOM 支持精确整数和当前已安装运行时。共享配置的 H.265、PNG、48 kHz PCM、并发 4 与禁止覆盖设置保持原样；这些设置不授权助手渲染。

遵循 [视频工程规则](../../AGENTS.md)、[工程操作说明](../../../docs/agents/videos/operations.md)及 [Remotion 许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
