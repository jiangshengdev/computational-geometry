# 第四章上集：找齐同点参与者，报告全部输入对

依据：[规格 #334](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/334)、[文案与画面 #335](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/335)，对应第四章文章第一至五节。

`SamePointParticipants` 是无配音的文案画面预览。`timeline.ts` 的 `provisional-silent-reading` 只供观察：每条短字幕暂留五秒，步骤前留半秒，本页保留已讲内容，页末停三秒，SP61 另留八秒思考。这些不是音频实测，也不代表成片时长。

## 内容与入口

20 页、57 个独立教学步骤，沿共端点、端点落在内部、四输入共点、点输入推进。保留 SP01–SP62 中仍在使用的稳定编号；重复步骤 SP28、SP30–SP32、SP42 已退出播放及稿件。旧块连续性引用第二章夹层结论，只补充闭端点的适用条件和纳入相遇块的用途；六对结果直接应用第一章枚举结论，不再逐行计数。完整、真实、唯一报告的新增联系保留；右侧整块排序和无端点共点的发现留给下集。

| 文件                                             | 职责                                                       |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `src/storyboard.ts`                              | 字幕母稿、正文来源、首次对象、图示动作、逐步保留与思考窗口 |
| `src/example.ts`                                 | 与文章一致的坐标及输入身份，供图示与数值核对共同读取       |
| `src/ParticipantDiagram.tsx`                     | 同点案例、角色、连续块、名单合并及六对结果的专用图示       |
| `src/TeachingPage.tsx`、`src/teaching-colors.ts` | 页面组合、对象身份色与逐句重点                             |
| `src/narration-text.json`                        | 从已审字幕派生、独立语义审校冻结的完整纯口播               |
| `src/speech-text.json`                           | 读音标注，拼接文字须与冻结口播完全一致                     |
| `src/timeline.ts`、`src/LayoutCheck.tsx`         | 静默预览与同一生产页面的状态检查                           |

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

## 检查与下一阶段

在本目录使用已安装依赖运行：

```sh
pnpm --config.verify-deps-before-run=false run lint &&
pnpm --config.verify-deps-before-run=false run video:check-content &&
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查使用当前 Remotion 对应的已安装 Chrome Headless Shell，在独立临时端口启动无头 Studio，检查真实生产组件。附加 `-- --shots=SP08,SP53 --screenshots` 可检查指定步骤并保存浏览器 DOM 截图，不执行视频或静帧渲染。

正式执行与审校证据记录在 #335，完成状态以该票当前记录为准。音频与同步由 [#336](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/336) 承接，整体验收由 [#337](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/337) 承接。本工程尚无正式配音、实测词时间或音画同步验收；没有执行视频渲染、成片或可见桌面验收。

共享命令与浏览器约束见 [工程操作说明](../../../docs/agents/videos/operations.md) 和 [视频制作配置](../../../docs/agents/videos/configuration.md)。
