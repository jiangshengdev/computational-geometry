# 不丢交点，不添交点

图形推斜了，交点会变吗？证明剪切不丢交点、不添交点｜剪切变换⑦

制作与验收遵循 [视频工程规则](../AGENTS.md)。当前实施范围是 [#242](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/242) 的代表样例，依据父规格 [#241](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/241)。样例含十一页、三十五段讲解，默认 composition 为 `Shear242`。样例尚未获用户确认，不能扩展 #243–#245。

当前源码已接入生产页面与共享时间线，35 段正式 PCM WAV、音频时间数据和字幕时间数据已生成。实测时间线为 24054 帧、400.9 秒（60 fps）；缺失素材时入口明确报错，不使用估计时长或空白声音代替。

## 配置与依赖

原空白模板配置来自 `videos/shear-coefficient` 的 `43e47fa`。本次实际页面能力参考 `videos/shear-special-cases`，固定本地版本 `1932f0bc30844c7cd3733ae5def0647ebb49b744`，已读取其 `TeachingPage`、`MathText`、`Composition`、`timeline`、`LayoutCheck` 与配音脚本。输出采用公共[默认制作配置](../../docs/agents/videos/configuration.md#默认制作配置)。

- Remotion 4.0.538；Node.js ^22.18.0 或 >=24。
- 依赖与参考工程一致，包括 KaTeX、Azure Speech SDK 及 Node/KaTeX 类型声明。
- 保留已批准的 `allowBuilds.esbuild: true`。

## 命令

安装、预览、检查和打包见公共[基础命令](../../docs/agents/videos/operations.md#基础命令)。

以下命令在本工程目录运行，只使用已安装依赖。配音生成需要用户管理的 Azure 环境凭据，禁止将凭据写入工程。

```sh
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:narration
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout
pnpm --config.verify-deps-before-run=false run video:audit-narration
```

配音失败后保留暂存目录，按日志使用 `--resume=<暂存目录>`；只有口播指纹、音频哈希及 PCM 格式均匹配的片段才会复用。全部目标片段通过后才发布正式素材和字幕时间。当前合成并发为一，避免同时请求多个片段；共享合成请求超时上限已从 55 秒提高到 120 秒，音色与语速保持不变。

布局检查前设置 `REMOTION_BROWSER_EXECUTABLE`，必须现场核验为 Remotion 4.0.538 对应的 Chrome Headless Shell 157.0.8080.0。检查使用系统分配端口和生产组件，可加 `--screenshots` 保存浏览器截图，不生成视频或 Remotion 静帧。当前未接入视频导出入口；不套用其他工程的导出命令。

## 参考继承核对

| 能力 | 当前对应实现及差异 |
| --- | --- |
| 字幕中性色、短句切换、静默保留 | 直接调用共享 `Subtitles`、`writeCaptions`、`createShotTimeline`；字幕使用下标，独立口播使用分隔字母 |
| 数学排版与中英文间距 | 调用共享 `createMathText` 和 `Latex`，公式不拆成逐字揭示 |
| 坐标标签描边、等比例与轴箭头 | `SegmentDiagram` 使用共享 `SvgMathText`；两轴同一单位长度，领域图示由本集维护 |
| 页面空间与跨页衔接 | 正文无图时居中；本集新增具体依据区与已讲图示，修正仅保留操作提示而丢失原式的教学缺陷 |
| 对象配色与当前步骤 | 线段蓝色、分点和当前教学行局部橙色；字幕及普通文字保持中性色 |
| 推导分组与对齐 | 直接调用共享 `createTeachingMathLines`，显式定义 `equals`/`left` 组，未来行保留尺寸 |
| 读音消歧 | 调用共享 Azure 入口，字母拼读与逐片段局部拼音标注；不沿用旧的字母 IPA 处理 |
| 音画同步与页末停留 | 实测 PCM 时长、词时间和共享时间线；本样例均为推导页，完整页面保留五秒 |
| 检查 | 共享内容检查与 `ShotLayoutCheck`；附加依据来源顺序及生产页面可见性检查，不复制检查框架 |

## 逐步教学审校

数学内容来源为 `docs-site/docs/segment-intersection/shear/intersection.mdx`。下表的镜头 ID 同时定位 `src/storyboard.ts` 中字幕和 `src/speech-text.json` 中独立口播。当前表仅记录源码审校，不代表实际音频或成片验收。

| 当前推导与口播 ID | 具体依据及此前介绍 | 本页可见位置 |
| --- | --- | --- |
| 01–04：具体端点、全程变化、中点、四分之一点 | 本页依次介绍 A、B，再计算横纵差和相应比例 | `numeric` 主场景累积行与坐标图 |
| 05–08：一般端点、下标、比例、闭区间 | 先定义坐标再定义 P 和 u；u 的分母使用非零线段 | `symbols` 主场景完整定义 |
| 09–11：垂足、相似、对应边比例 | 05 的端点定义，07 的点与长度比例；09 在主场景说明非水平、非竖直、内部点 | `similar` 上方依据、主场景条件与相似图 |
| 12–14：带方向坐标变化 | 09 的 H、K，11 的对应边比例；正负方向由本页口播解释 | `changes` 依据区、保留的三角形与当前变化等式 |
| 15–17：横坐标移项、展开、合并 | 12 的横向变化式；每个中间等式留在本页 | `horizontal` 依据区、参考图与等号对齐主场景 |
| 18–20：纵坐标移项、展开、合并 | 13 的纵向变化式，17 的横坐标结论 | `vertical` 依据区与累积推导 |
| 21–24：水平、竖直、端点、全部内部点 | 17、20 的完整分点式；退化三角形不用于证明端点 | `boundary` 依据区与主场景各情况 |
| 25–27：剪切系数、撇号与定义 | 本页首次完整介绍，再说明不使用小系数保序 | `shear` 主场景 |
| 28–29：代入横纵坐标 | 17、20 的分点公式，26 的剪切公式，以及比例范围 | `substitution` 上方三条原式、参考图与完整代入式 |
| 30–32：展开四项、换序、提因子 | 28 的完整代入式及29的纵坐标；页内保留四项和换序结果 | `expand` 依据区、参考图及累积等式 |
| 33–35：识别新端点 | 05 的原端点，26 的剪切定义，32 的整理式与29的纵坐标 | `endpoints` 依据区、参考图与新端点定义；后续证明只作预告 |

## 验收状态

- 字幕与独立口播已建立，服务输入 dry-run 已通过；不等于实际读音合格。
- 合成超时已提高到 120 秒；共享词边界与识别对齐的 ASCII 字母比较已忽略大小写，保留原稿、服务文本和实测时间，并继续检查漏字、顺序与时间有效性。相关 11 项测试通过。
- 07 原版的“除以”经用户试听确认漏读。两个独立试听版本均获读音确认，采用改动较小的 A 版：仅在“除以”前增加口播停顿，字幕同步使用逗号。已确认音频按哈希原样复用，未重新合成。
- 30 重试合成与识别对齐成功，35/35 段已完成整批生成。正式素材位于 `public/narration/`，`src/audio-timing.json` 与 `src/captions.json` 已生成；成功后生成入口已清理本轮续跑暂存目录。07 的正式音频保留用户确认的 A 版。
- ESLint、共享 lint、TypeScript、已修改源码的 Prettier 与差异空白检查通过。35 段内容、音频解码、口播指纹、哈希和页面停留检查通过；实际为 11 页，此前的“12 页”记录已更正。
- 规范与规格两路只读审查指出的字幕下标、跨页图示、适用条件及读音标注缺口已修正源码，当前完整正式音频与口播稿匹配。
- 全部 441 个生产页面状态的无头布局检查通过，使用已核验的 Chrome Headless Shell 157.0.8080.0；不等于可见桌面或成片验收。
- 全部 35 段实际音频已执行识别与发音评估，13 段无异常标记，22 段有自动疑点：`Omission` 4 处、`Insertion` 3 处、`Mispronunciation` 41 处，评估入口以非零退出码报告未通过。漏读/插入疑点集中在 01、03、08；07 A 版与30均无异常标记。原始响应与绑定当前音频哈希、口播指纹的汇总保存在 `out/narration-audit/`，须逐段整句试听复核，不能把自动标记直接视为已确认错误。
- 07 的 A 版整句试听已确认；整个代表样例确认、其余片段的整句试听、真实成片及可见桌面验收均未完成。
- 未渲染、未导出视频，未修改父规格或关闭任务。

## 发布素材

路径见公共[空白工程的发布素材](../../docs/agents/videos/operations.md#空白工程的发布素材)。
