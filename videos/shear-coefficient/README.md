# 剪切系数为什么不能随便选

规格：[CNB #209](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/209)。当前只实现 [#210 代表样例](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/210)，遵循 [视频工程规则](../AGENTS.md)。#211–#214 尚未实施，必须先取得用户对本样例的明确确认。

## 当前交付

`Shear210` 共 6 页、25 段原速 Azure 配音，60 fps、9517 帧，实测时间线总长约 158.62 秒。包含独立开场、公式解释、点名下标、A/B 分式计算及 A 水平越过 B 的动画。普通页完整停留 3 秒，两张计算页 5 秒。字幕和独立口语稿分开维护；素材、字词边界、合成指纹及短句字幕均在本工程中。

25 段口语稿已逐处补充多音字、变调及轻声的局部拼音标注，包括数值“一”、短语“一百”“同一个”和“不”的不同读法；同时合并 `210-15` 中被句号截断的算式，并同步字幕断句。正式音频与时间数据已重新生成，未改变音色或音频速率。更新后通过完整口语稿 dry-run、25 段音频解码及素材一致性检查、运动中点同步测试和 180 个生产页面时间状态检查；状态数量随新音频边界变化。上述结果不代表实际整句读音或自然度已通过试听。

实际试听、数学读法、自然度、用户导出成片、可见桌面验收和样例确认均待完成。工程检查不能替代这些验收。助手不得渲染或导出视频。

已通过：lint／类型检查、完整口语稿 dry-run、25 个音频解码与实测时长核对、素材／字幕／指纹一致性、所有页末静默状态及 181 个生产页面时间状态的无头检查。逐页查看了 6 张生产画面浏览器截图。新增的运动中点同步测试经历失败后修复通过。规范与规格两路代码审查发现的文档、数字配色问题已修正并复核关闭。CNB 状态未修改。

## 参考继承对照

参考第一集 `videos/shear-intuition`，实际本地版本 `5f854b255a32afa38a4a9c7123fe486f5e3d6dea`。已读取该版本对应实际组件、配置、生成脚本和 README；第一集未修改。第二集使用既有脚手架的 Remotion 4.0.538（参考为 4.0.537），不增加依赖。

| 能力 | 参考与本工程对应实现 | 本集差异 |
| --- | --- | --- |
| 浅底版式、空间与字号 | `TeachingPage.tsx` | 保留 1920×1080 逻辑画面、左右图文列；只保留固定轴视图 |
| 统一数学混排与间距 | `MathText.tsx`、`MathLines.tsx` | 原实现移植；点名改为 A/B |
| 短句字幕、静默保留 | `Subtitles.tsx`、`speech-timing.ts`、`captions.ts` | 按本集独立字幕和口语稿生成；页内静默保留最后一句 |
| 标签描边与遮挡 | `SvgMathText`、`Diagram.tsx`、`LayoutCheck.tsx` | 保留描边；按高度 200 的场景重新安排标签位置 |
| 对象配色、当前步骤强调 | `teaching-emphasis.ts`、`MathLines.tsx` | 蓝色对应 A、紫色对应 B、棕色对应系数；数值显式标注归属 |
| 分组、等号对齐与行距 | `math-lines.ts`、`MathLines.tsx` | 保留显式分组、72/96 行槽及未来步骤空间；替换为本例计算 |
| 易错读音、字母与独立口语稿 | `speech-text.json`、`azure-speech.ts` | 使用 why 消歧 y；局部拼音标注撇号与颠倒；增加无逗号校验 |
| 实测音画同步与页末停留 | `timeline.ts`、`narration.ts`、`azure-alignment.ts` | 按本集音频生成；运动中点另与“正上方”实测边界对齐 |
| 内容与生产布局检查 | `check-content.ts`、`LayoutCheck.tsx`、`check-layout.ts` | 覆盖本集全部页及字幕、揭示、运动和静默边界；不保留第一集题目断言 |
| 输出配置与导出门禁 | `remotion.config.ts`、`scripts/render.ts` | 继承 4K/60fps、H.265 required、PNG、AAC 192k、并发4；只导出样例 |

本集二维图显式不等比例：横向每单位 200 逻辑像素、纵向每单位 2 像素；横向 1 单位与纵向 100 单位均为 200 逻辑像素，形成正方形网格。始终显示“不等比例示意”，开场解释画面长度不可跨轴比较。其余视频的等比例默认规则不变。图示为固定数学示意，不是算法执行轨迹。

## 使用

在本工程目录运行。只使用用户已安装的 Node.js（^22.18.0 或 >=24）、pnpm、依赖、Chrome、playwright-cli、ffmpeg 和 ffprobe。以下入口关闭运行前自动安装依赖。

```sh
pnpm --config.verify-deps-before-run=false run video:dev
```

在 Studio 选择 `Shear210` 预览。需要重新生成配音时，先检查完整口语稿，再使用已配置的 Azure 环境；音色固定为 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`，失败不回退。

```sh
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:narration
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false exec node --test src/timeline.test.ts
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局入口启动独立临时端口和无头 Chrome，结束时关闭自己的进程；`--screenshots` 仅保存浏览器页面截图，不渲染视频。生产组件会拒绝缺少实测音频的预览，不使用估计时长兜底。

仅供用户自行导出（助手不得执行）：

```sh
pnpm --config.verify-deps-before-run=false run video:export
```

先执行音频与内容检查及同一生产布局检查，通过后才输出 `out/shear-coefficient-sample.mp4`。4K 输出使用 1920×1080 的 2 倍栅格化；硬件编码不可用时直接失败。导出入口不代表已完成成片验收。
