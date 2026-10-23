# 由两个端点写出直线方程

依据 [CNB #197](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/197) 和 #198–#202 制作的八段中文教程。采用 [视频工程规则](../AGENTS.md) 中的默认制作配置、口语稿与音频规则、布局检查及验收要求。本工程将原始 30 fps 时间数据换算为默认输出帧率，保留原始动画时序和配音速度，另行延长页末阅读停留。完整 composition 为 `LineEquationTutorial`；四组独立检查入口为 `Parts1And2`、`Parts3And4`、`Parts5And6`、`Parts7And8`。

当前共 30 页（含开场 4 页）。页末停留采用公共规则，15 个推导密集页在 `src/derivations.ts` 显式标记；思考窗口为 4 秒。当前时间线为 44026 帧，60 fps 下约 **12 分 13.77 秒**；页末时间向上取整到整帧。

## 使用

在本目录执行以下命令。需要已有的项目依赖、Node.js 22.18+、pnpm 和 Chrome。下列视频导出命令供用户自行执行，助手受上级视频工程规则中的渲染禁令约束。

```sh
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false exec node scripts/render.ts
```

以下命令使用上述默认制作配置：

```sh
pnpm --config.verify-deps-before-run=false exec node scripts/render.ts render LineEquationTutorial out/line-equation-tutorial.mp4
```

完整输出为 `out/line-equation-tutorial.mp4`，输出目录被 Git 忽略。Chrome 不在 macOS 默认应用位置时，用 `CHROME_EXECUTABLE` 指定现有可执行文件。

```sh
pnpm --config.verify-deps-before-run=false exec node scripts/render.ts render Parts1And2 out/parts-1-2.mp4
pnpm --config.verify-deps-before-run=false exec node scripts/render.ts still LineEquationTutorial out/frame.png --frame=1200
```

## 内容维护

- `src/narration.json`：从 #189–#196 已确认 Resolution 提取的逐镜旁白、原始时间窗与画面要求，作为制作素材使用。权威规格和任务状态仍在 CNB。
- `src/speech-text.json`：全部 56 段的独立口语稿及 `196-2` 的空白静默项，按镜头 ID 对应字幕。
- `src/scenes.ts`：按镜头 ID 对应逐步公式、说明与图形；提示时间相对于原分镜窗口，播放时按该镜头实测时长映射。
- `src/Diagram.tsx`：固定数学示意图；不属于算法执行轨迹。
- `src/coordinates.ts`：开场与正文共用的坐标映射，遵循上级坐标比例规则。正文可在对应 `Cue.coordinateScale` 中显式设置 `{ mode: "independent", reason: "具体教学原因" }`，开场通过 `CoordinateDiagram` 的 `scale` 参数指定；画面会显示“不等比例示意”。当前所有镜头均使用默认等比例。
- `src/timeline.ts`：根据实测音频生成的 `src/audio-timing.json` 排列各镜头、片段和全片。第 2、4 段问题结束后保留 4 秒；第 8 段使用独立的 4 秒静默镜头。
- `src/Intro.tsx`、`src/intro-storyboard.ts`：本工程独立维护的开场画面与展示文案。字幕和时间线与其他章节共用同一份数据。
- `scripts/azure-speech.ts`：本工程内的 Azure 请求函数。

已包含配音素材。重新生成配音的环境要求和续跑流程见 [公共规则](../AGENTS.md#配音生成与续跑)：

```sh
pnpm --config.verify-deps-before-run=false exec node scripts/narration.ts
```

生成前可给上述命令添加 `--dry-run`，按上级规则核对音色、口语稿及 `documents` 中的 SSML。

口语稿格式及读音示例统一见 [公共规则](../AGENTS.md#口语稿与读音)。本工程输入错误会定位到镜头 ID 与从零开始的片段索引；口播公式内部的句号不会强制拆开对应的完整公式字幕。

针对标注转换、作用范围和非法输入的测试：

```sh
pnpm --config.verify-deps-before-run=false exec node --test scripts/azure-speech.test.ts
```

本工程配音共 56 段，开场文件为 `189-1.mp3` 至 `189-4.mp3`。

全部 56 段素材已按禁用逗号、包含逐处读音标注的口语稿重新生成，保留 Azure 原始音频及语速；`audio-timing.json`、`word-timing.json` 与 `captions.json` 已同步更新并通过对应检查，不再保留历史 `tempo` 字段。当前 Flash 音色已接受中文 `sapi` 标注，全部音频通过解码和时长检查；实际发音、自然度及音画同步仍待试听与成片验收。

## 验收边界

按上级验收边界执行；本教程的核对依据为 #197 及各 Resolution，另须检查第 2、4、8 段思考窗口。当前待验收项见上述素材状态。

## 正文行距与内容超限检查

正文的教学分组在 `src/derivations.ts` 显式定义，组的 `count` 必须覆盖该页全部保留行；新增或删除推导步骤后需同步更新。`left` 用于题目、独立判断与结论，`equals` 仅用于连续等式推导。分页、字号、音轨和揭示时间保持原有编排。

`src/math-lines.ts` 统一管理行槽和基线：普通行 72px，组间增加 24px；含分式的完整组统一使用 96px 行槽。

```sh
pnpm --config.verify-deps-before-run=false run video:check-layout
```

检查要求本机已有 Playwright CLI 和 Chrome。命令启动独立 Studio，按上级布局检查规则检查 `LayoutCheck` 中的 4 个开场画面及 26 个完整正文页；不是外观快照测试，也不渲染或导出视频。失败页记录 `FAIL`；`scripts/render.ts` 的导出入口先执行同一检查，失败即停止导出。
