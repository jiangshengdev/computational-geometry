# 逐对检查 · 下集代表样例

本工程承接 [#289](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/289)，
父规格为 [#287](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/287)。
当前仅制作 D23–D32（有顺序计数、除以二与分式代入）；
全片内容仍见 [分镜](storyboard.md)。

采用 Remotion 4.0.539、1920×1080 逻辑画布、60 fps，保留 2 倍输出配置。
共享字幕、数学排版、配音与时间线工具来自 `videos/shared`，不导入相邻集专有内容。
参考能力对照见 [制作对照](../intersection-goals/production-reference.md)。

## 参考能力接入

| 能力             | 本工程实现                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| 字幕与静默保留   | 共享 `Subtitles`、`writeCaptions`、`createShotTimeline`；字幕数学使用中性色 |
| 数学与中英文间距 | 本集 `MathText.tsx` 接入共享 `createMathText`，完整公式交给 KaTeX           |
| 图示或推导       | 共享 `TeachingMathLines` 保持分式高度与等号对齐；D32 对照六对枚举           |
| 空间与逐步呈现   | D25 出现选择数量前，已讲文字由中央平滑移到左侧；两次选择分开揭示            |
| 配色             | 默认中性色，当前选择或推导行局部强调，字幕与标题不随对象染色                |
| 原始音频与读音   | 共享 Azure 工具、局部拼音、字母拼读；口播句号对应原始字幕句号时停顿 400ms，其余口播句号停顿 200ms；实测时长驱动时间线 |
| 内容与布局检查   | 共享内容与生产页面检查；检查本集实际镜头，不复制历史镜头编号或豁免          |

以上是实现对应关系，不能替代实际读音、布局或样例验收结果。

## 素材与入口

- `src/storyboard.ts`：代表段字幕与页面步骤；字幕独立保留书面标点。
- `src/narration-text.json`：从字幕派生并独立审校的冻结纯文本。
- `src/speech-text.json`：局部拼音与句界停顿；拼接后须等于冻结纯文本。
- `scripts/narration.ts`：调用共享配音流程，整批通过后才发布原速 PCM WAV。
- `src/audio-timing.json`、`src/captions.json`：由实测音频生成，禁止填造时间。
- `public/narration/`：原速 48 kHz、16 bit、单声道 PCM WAV。
- `src/TeachingPage.tsx`、`src/timeline.ts`：生产页面与实测时间线。
- `out/narration-audit/`：绑定当前音频哈希的识别、发音评估原始结果。

所有命令在本工程目录执行，仅使用已安装组件：

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查前设置 `REMOTION_BROWSER_EXECUTABLE` 为现场核验过的
Chrome Headless Shell 157.0.8080.0。检查通过系统分配端口无头运行，
不渲染或导出视频；可添加 `--screenshots` 保存浏览器截图。

`video:narration` 去掉 `--dry-run` 会请求 Azure 并写音频，
仅在文本与拼音完成独立审核且有生成授权时使用。
默认音色为 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`；
凭据仅从既有运行环境读取，不写入仓库。
`video:audit-narration` 对当前素材进行识别与发音评估，不代替整句试听。

## 验收边界

当前为代表样例制作阶段，尚未取得用户对本版本样例的确认。
文本、拼音、实际音频、无头页面与成片验收分别记录，
不得将代码或自动检查通过表述为样例或整集已验收。
本工程不提供助手渲染或导出入口。

制作、试听、端口与交付规则见 [视频工程规则](../../AGENTS.md)
及其链接的各阶段文档。
