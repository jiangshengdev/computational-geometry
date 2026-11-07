# 第五章上集工程

本集由 Remotion Blank 模板创建，配置参考 `same-point-participants`。需求以 [#343](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/343) 和 [#344](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/344) 为准。

## 当前配置

- Remotion `4.0.540`、React `19.3.1`；数学排版、语音 SDK 和开发工具沿用第四章版本，保留已安装的精确版本约束。
- 复用 `videos/shared/config/remotion.ts` 与共享 TypeScript 配置，ESLint 接入 `componentPolicy`，不导入相邻视频的内容或素材。
- Composition ID 为 `OverlapReporting`，逻辑画布为 1920×1080、60 fps，输出比例为 2，对应 3840×2160。
- 共享配置采用 PNG、H.265、`yuv420p`、必须使用硬件编码、48 kHz PCM、并发 4；禁止覆盖输出，完成的 Sequence 不继续保持活动。
- 保留初始化器生成的 `allowBuilds.esbuild: false`，不执行 esbuild 安装脚本；不因旧工程允许就照搬批准配置。
- `dev` 不自动打开浏览器。代理运行服务仍须遵循[端口隔离规则](../../../docs/agents/runtime.md)。

## 检查入口

在本集目录执行 `pnpm --config.verify-deps-before-run=false run lint`，进行 ESLint 与 TypeScript 检查；执行 `pnpm --config.verify-deps-before-run=false run build` 只进行打包，不渲染视频。

当前为 #344 的文案与画面阶段：16 页、43 个稳定教学步骤（`OR01`–`OR43`）。完整字幕与分镜在 `src/storyboard.ts`，独立纯文本口播在 `src/narration-text.json`。正式音频和实测时间线由后续 #345 接续，本集目前静音，不提供导出入口。下集内容制作仍遵循既定前置任务。

`src/speech-text.json` 保存与冻结纯文本逐字对应的局部读音标注。下一阶段还须建立原始字幕语义句与口播分段的对应记录，按共享 `sentence-pauses.ts` 校验 400ms／200ms 句界请求，再检查实际请求并合成；当前标注稿不冒充已完成的合成请求计划。

`src/timeline.ts` 明确标记 `provisional-visual-inspection`：按字幕阅读窗口安排页面检查，每页末保留 3 秒，`OR42` 保留 8 秒思考；这些数值不是实测配音或成片时长。下一阶段必须以原速完整音频的实测数据替换阅读窗口，并重新核对语义提示、字幕与画面同步，不能把这套暂定时间作为音频元数据。

`src/visual-cues.ts` 将配对、加入和退出绑定到明确的字幕短语；同一短语中的两次配对在该短语窗口内依次出现。已产生的成员与结果持续保留，强调在动作结束后撤去。结果区域预留本页完整容量，新增结果不改变已有图示的位置。

## 内容与参考继承

每页分镜保留 `source`、`reference`，每步记录首次对象、画面动作、完整字幕、强调对象和必要思考窗口。内容依据是第五章文章第一至三节；本集只证明报告机制，不声称未来事件发现已证明。

| 本集 | 已讲依据 | 新增内容 |
| --- | --- | --- |
| OR03–OR08 | 第一章 `intersection-goals` U08–U12；第三章 `complete-intersection` CI36–CI45 | 同线组占一个顺序位置，固定直线与当前成员分离 |
| OR09–OR17 | 第三章 CI42–CI55 的完整闭区间；第一章原始身份 | 加入时已有完整端点，同点开始者逐一配对再加入 |
| OR18–OR28 | 第四章 `same-point-participants` SP07–SP09；第三章闭范围 | 组内闭端点交接，以及一般同线对恰好一次的三种起点情况 |
| OR29–OR40 | 第一章 U28–U29；第四章 SP34–SP40、SP52–SP59 | 从组展开当前成员，仅跨组非零对与含点对在当前位置报告 |
| OR41–OR43 | 已建立的三种报告时机 | 汇合与自检，明确未来发现留给下集 |

页面组合以第四章上集 `TeachingPage.tsx` 为基准：`MathLessonPage` 显式 `diagramPosition="left"`，正文使用 `createTeachingMathLines` 的换行和累积揭示；依据区使用 `TeachingReferences`，静态中性色；字幕也保持中性。对象色沿用文章的 A 蓝、B 橙、C 紫、D 绿；正文局部重点随当前讲解撤去。数学文字复用 `SemanticMathText`，提示描亮复用 `AttentionMarks` 的线段分支。

专用分图在 `OverlapDiagram.tsx`：共享固定坐标样例无法容纳本集横坐标 10 与纵坐标 −4，故本集维护案例坐标布局；同一比较组的子图尺度一致，不挪动重合成员。组身份槽和配对连线是关系示意，不冒充几何位置或真实执行轨迹。原始坐标与完整结果集中在 `example.ts`。

## 阶段检查

```sh
cd videos/bentley-ottmann/overlap-reporting
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
```

内容入口核对文章案例的全部输入对、独立案例范围、字幕标点完整保留、稿件 ID、暂定状态及停留，并复用共享语音构造入口离线核对标注格式和冻结文本一致性，不创建服务客户端。同页交界直接保留上一镜头的实际末条字幕。布局入口使用实际生产页面及共享检查器，覆盖每个字幕和语义动作的边界、中间状态及页末；运行前须设置经本机核验的 `REMOTION_BROWSER_EXECUTABLE`。`--screenshots` 保存浏览器截图到系统临时目录，不调用 Remotion 导出。具体完成状态与独立审核证据以 #344 为准，程序通过不替代独立视觉观察。

## 制作与导出

遵循[视频工程规则](../../AGENTS.md)与[工程操作说明](../../../docs/agents/videos/operations.md)。浏览器必须匹配本集 Remotion 指定的 Chrome Headless Shell；使用前单独核验，不自动下载。

正式导出须在后续阶段完成相应检查并接入项目五阶段模板，由用户执行；本工程目前不提供导出命令。配音沿用项目默认音色与原始语速，在获得相应授权和通过门禁后接入。

## Remotion 许可

使用条件见 [Remotion 官方许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
