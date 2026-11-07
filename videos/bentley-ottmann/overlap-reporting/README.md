# 第五章上集工程

本集由 Remotion Blank 模板创建，配置参考 `same-point-participants`。需求以 [#343](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/343) 为准，文案与画面对应 [#344](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/344)，配音同步与交付对应 [#345](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/345)，真实成片验收对应 [#346](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/346)。

## 当前配置

- Remotion `4.0.540`、React `19.3.1`；数学排版、语音 SDK 和开发工具沿用第四章版本，保留已安装的精确版本约束。
- 复用 `videos/shared/config/remotion.ts` 与共享 TypeScript 配置，ESLint 接入 `componentPolicy`，不导入相邻视频的内容或素材。
- Composition ID 为 `OverlapReporting`，逻辑画布为 1920×1080、60 fps，输出比例为 2，对应 3840×2160。
- 共享配置采用 PNG、H.265、`yuv420p`、必须使用硬件编码、48 kHz PCM、并发 4；禁止覆盖输出，完成的 Sequence 不继续保持活动。
- 保留初始化器生成的 `allowBuilds.esbuild: false`，不执行 esbuild 安装脚本；不因旧工程允许就照搬批准配置。
- `dev` 不自动打开浏览器。代理运行服务仍须遵循[端口隔离规则](../../../docs/agents/runtime.md)。

## 检查入口

在本集目录执行 `pnpm --config.verify-deps-before-run=false run lint`，进行 ESLint 与 TypeScript 检查；执行 `pnpm --config.verify-deps-before-run=false run build` 只进行打包，不渲染视频。

本集有 16 页、43 个稳定教学步骤（`OR01`–`OR43`）。完整字幕与分镜在 `src/storyboard.ts`，独立纯文本口播在 `src/narration-text.json`；每步独立生成原速 PCM WAV，以实测时长构建时间线。下集内容制作仍遵循既定前置任务。

`src/speech-text.json` 保存与冻结纯文本逐字对应的局部读音标注。`src/sentence-plan.json` 记录原始字幕语义句与口播分段，复用共享 `sentence-pauses.ts` 校验句末 400ms／内部边界 200ms 的请求；共 278 个边界。`video:plan-narration` 离线重建全部 SSML，不调用服务。合成使用计划文件及其 SHA-256；默认不自动重试，`--continue-unstarted` 只继续未发送片段，保留结果未知的请求。评估通过 `--shots` 显式选择已完成片段，并保存独占请求记录。

`src/timeline.ts` 使用 `measured-narration`，复用共享完整音频时间线与播放组件。`src/audio-timing.json` 绑定当前 WAV 哈希、请求指纹和原始评估响应，`src/captions.json` 由原字幕与真实词时间生成。阅读估时与比例切分退出播放路径。每段引入 0.5 秒，完整音频后按教学步骤停留；每页末保留 3 秒，`OR42` 保留 8 秒思考，不裁切或调速音频。

当前时间线为 47,642 帧／60 fps，即 13 分 14.033 秒。当前正式音频检测覆盖 43/43 段，原始程序标记为 `Omission=0`、`Insertion=0`、`Mispronunciation=44`；没有缺失评估。发音标记不是已听辨确认的错误，实际试听尚未验收。OR38 的局部改句“同一组对只展开一次”已同步字幕、纯口播、读音、句界与所选音频。

本次类型检查、打包、内容与完整音频校验通过；已核验版本的无头浏览器检查通过 1,624 个生产布局状态。规范与规格两项源码审查均无未解决发现。这些结果不替代实际试听和真实成片验收。

独立对齐观察 422 个生产状态，覆盖语义动作、字幕边界、27 处同页衔接与 OR42 八秒思考窗。实际媒体观察范围为 OR16、OR17、OR34、OR35：均从 0 原速播放至 `ended`，没有重叠；OR34 连续场景观察确认 AD→BD 的顺序、单次描亮与结果保留。该范围不代表全片实际播放或听辨通过。

`src/visual-cues.ts` 将配对、加入和退出绑定到明确的语义短语；`src/operation-timing.ts` 使用真实词边界安排动作，同一句中的两次配对依次出现。已产生的成员与结果持续保留，强调在动作结束后撤去。结果区域预留本页完整容量，新增结果不改变已有图示的位置。

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
cd <仓库目录>/videos/bentley-ottmann/overlap-reporting
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
```

内容入口核对文章案例的全部输入对、独立案例范围、字幕标点完整保留、稿件 ID、实测提示及停留，并离线重建当前请求、核对全部正式音频与原始评估，分别报告三类标记。`--decode` 另检查完整解码；`video:preflight` 依次执行该解码检查与生产布局检查。遗漏或插入非零阻断采用和音频检查。同页交界保留上一镜头的实际末条字幕。布局检查覆盖每个字幕和语义动作的边界、中间状态及页末；运行前须设置经本机核验的 `REMOTION_BROWSER_EXECUTABLE`。`--screenshots` 保存浏览器截图到系统临时目录，不调用 Remotion 导出。程序通过不替代实际试听和成片验收。

## 制作与导出

遵循[视频工程规则](../../AGENTS.md)与[工程操作说明](../../../docs/agents/videos/operations.md)。浏览器必须匹配本集 Remotion 指定的 Chrome Headless Shell；使用前单独核验，不自动下载。

已接入独立预检、PNG 与同时间线 PCM 导出入口，均复用共享实现。正式导出按上述操作说明的五阶段模板由用户执行，提供命令前须核对当前全部音频评估与参数。PNG 目标为 `out/overlap-reporting-frames/`，音轨目标为 `out/overlap-reporting-audio.wav`；入口动态分配独立端口，不覆盖已有输出。助手未渲染视频，实际试听依用户要求留到全部制作之后，真实成片仍待用户导出后验收。

`assets/narration-request-evidence.json` 保留未决请求及所选替代版本的最小状态；`assets/narration-review/` 仅保留尚待试听核实的旧候选及原始评估，不参与播放。当前正式素材、字幕与离线检查不依赖系统临时目录。

## Remotion 许可

使用条件见 [Remotion 官方许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
