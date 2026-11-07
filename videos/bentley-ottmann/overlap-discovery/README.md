# 第五章下集工程

本集由 Remotion Blank 模板创建，配置参考 `same-point-updates`。需求以 [#343](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/343) 和 [#347](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/347) 为准。

## 当前配置

- Remotion `4.0.540`、React `19.3.1`；数学排版、语音 SDK 和开发工具沿用第四章版本，保留已安装的精确版本约束。
- 复用 `videos/shared/config/remotion.ts` 与共享 TypeScript 配置，ESLint 接入 `componentPolicy`，不导入相邻视频的内容或素材。
- Composition ID 为 `OverlapDiscovery`，逻辑画布为 1920×1080、60 fps，输出比例为 2，对应 3840×2160。
- 共享配置采用 PNG、H.265、`yuv420p`、必须使用硬件编码、48 kHz PCM、并发 4；禁止覆盖输出，完成的 Sequence 不继续保持活动。
- 保留初始化器生成的 `allowBuilds.esbuild: false`，不执行 esbuild 安装脚本；不因旧工程允许就照搬批准配置。
- `dev` 不自动打开浏览器。代理运行服务仍须遵循[端口隔离规则](../../../docs/agents/runtime.md)。

## 检查入口

在本集目录执行 `pnpm --config.verify-deps-before-run=false run lint`，进行 ESLint 与 TypeScript 检查；执行 `pnpm --config.verify-deps-before-run=false run build` 只进行打包，不渲染视频。

已接入完整字幕分镜、独立口播和教学画面，共 54 个稳定步骤（`OD01`–`OD54`）。本阶段只提供无声检查时间窗，`timingKind` 为 `silent-inspection-only`；没有正式音频或实测同步，暂定总时长不代表成片长度。上集当前版本的导出命令已经交付，下集承接其正式报告规则与“x 坐标／y 坐标”读法。

| 入口                       | 职责                                                     |
| -------------------------- | -------------------------------------------------------- |
| `src/storyboard.ts`        | 字幕原稿、教学行、首次对象、画面任务、来源与前置复用位置 |
| `src/narration-text.json`  | 独立口语稿；先审校字幕，再派生并独立审校                 |
| `src/speech-text.json`     | 保持冻结全文的局部读音标注；不代表实际配音验收           |
| `src/example.ts`           | 两个独立案例的精确输入与对象颜色                         |
| `src/DiscoveryDiagram.tsx` | 连续覆盖、延长、空隙、组层顺序与首次足够的教学示意       |
| `src/timeline.ts`          | 无声阅读时间窗、语义切换、字幕保留、页末三秒及思考八秒   |
| `src/LayoutCheck.tsx`      | 使用实际生产页面检查字幕、正文、标签及切换状态           |

内容检查和布局检查分别运行：

```sh
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查前设置经核验的 `REMOTION_BROWSER_EXECUTABLE`，仅使用匹配 Remotion 的 Chrome Headless Shell。可用 `--shots=OD15,OD20` 限定受影响片段，`--screenshots` 将浏览器截图保存到系统临时目录。入口使用独立临时端口，结束后关闭自己的进程，不导出视频或静帧。

## 教学范围与参考承接

本集五节依次说明当前覆盖、邻接不变时延长补检、空隙与重新激活、组层顺序和无端点交点发现。依据第五章文章第四至七节；各页的 `source` 与 `reference` 记录已有结论和新增连接。两个数值案例互相独立，一般证明不依赖这两个案例成立。

- 当前覆盖由所有活动成员共同包含当前位置推出。最远成员给出整段连续覆盖；未开始的身份不计入上限。
- 新邻接检查与持续邻接期间的延长补检都保留。无端点证明分别处理“形成时已足够”和“后来首次同时足够”，先取得预约，再引用有限清单的到站结论。
- `same-point-updates` 的左右顺序、块外关系和新邻接分类只引用适用结论；本集补充分组后的条件。`overlap-reporting` 的完整报告规则只用于承接。
- 页面沿用两集实际采用的 `MathLessonPage`、`TeachingReferences`、`TeachingMathLines` 与 `SemanticMathText`：显式左图右文、依据静态、中性字幕、正文对象色和局部重点色；不依赖相邻工程的内容或素材。
- 几何图使用等单位坐标，重叠成员分图显示。一般覆盖图按身份分行，明确不表示几何高度。无事件间隙、连续块及覆盖阈值图均为教学示意，不是真实执行轨迹。
- 字幕短句复用共享分句与组句能力，保留所有原始标点；同页新步骤引入前保留上一步末条字幕。教学行完整显示后开始检查时间窗，步骤累积保留。语义切换绑定具体字幕短语，正式音频阶段再按实测时间映射。

文案、读音与独立对齐的权威审核记录归 [#347](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/347)。类型、内容与布局检查分别只证明对应范围；文本、实际发音、音画同步和真实成片验收分开记录。

## 制作与导出

遵循[视频工程规则](../../AGENTS.md)与[工程操作说明](../../../docs/agents/videos/operations.md)。浏览器必须匹配本集 Remotion 指定的 Chrome Headless Shell；使用前单独核验，不自动下载。

正式导出须在后续阶段完成相应检查并接入项目五阶段模板，由用户执行；本工程目前不提供导出命令。配音沿用项目默认音色与原始语速，在获得相应授权和通过门禁后接入。

## Remotion 许可

使用条件见 [Remotion 官方许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
