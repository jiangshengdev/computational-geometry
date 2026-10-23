# 统一缩放与坐标范围

分数坐标怎么变整数？一步步找出坐标的范围｜剪切变换③

规格：[CNB #215](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/215)。当前只实施 [#216 代表样例](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/216)，遵循 [视频工程规则](../AGENTS.md)。用户确认样例前，不进入 #217–#219。

## 样例内容

Studio composition `Shear216` 包含 8 页、28 段独立口播，60 fps、11371 帧，时长约 189.52 秒：分数坐标开场、正整数公共分母、两个方向使用同一倍数、P 的逐步计算、Q 的 4 秒练习与答案、固定单位长度的真实放大、放大后的视野调整。未制作 M、系数上界或整集串联。

例子为 P=(1/2,-2/3)、Q=(-1/3,1/6)，D=6，整数端点分别为 (3,-4)、(-2,1)。两轴始终等比例。几何放大阶段每单位固定为 65 逻辑像素，数学坐标乘 6；之后视野调整共同改变两轴单位长度与原点屏幕位置，数学坐标保持不变。所有点使用同一个倍数，因此线段形状保持、长度变为原来的 6 倍。

## 参考继承对照

读取的参考为第二集 `videos/shear-coefficient`，固定本地提交 `c4de9fb0bc6c6403baac02f1e86970b65b0fe5ee`。已检查实际生产组件、脚本、README 制作记录与公共制作规则。按自包含要求移植适用实现，不导入相邻工程，不修改第二集。

| 能力                         | 参考实现 → 本集实现                                                 | 本集差异                                                                    |
| ---------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 字幕样式、短句切换、静默保留 | `Subtitles.tsx`、`speech-timing.ts`、`captions.ts` → 同名文件       | 独立字幕原稿，保留自然标点；全部字幕中性色                                  |
| 数学混排、中英文间距         | `MathText.tsx`、`MathLines.tsx` → 同名文件                          | 支持本例分数、大小写及撇号；仅显式重点着色                                  |
| 标签描边及遮挡               | `SvgMathText`、`Diagram.tsx`、`LayoutCheck.tsx` → 同名实现          | P 为蓝色、Q 为紫色；等比例坐标替代第二集明确的不等比例示意                  |
| 页面空间                     | `TeachingPage.tsx` → 同名文件                                       | 保留 1920×1080 逻辑画面和左右图文列，图示在本集列宽内布置                   |
| 配色及当前步骤               | `teaching-emphasis.ts`、`MathLines.tsx` → 同名文件                  | 端点对应配色；当前计算行局部底色与下划线；辅助文字中性色                    |
| 分组、等号对齐及行距         | `math-lines.ts`、`MathLines.tsx` → 同名文件                         | 明确横纵推导分组；72/96 行槽、24 组距；未来步骤保留空间                     |
| 字母、易错读音与独立口播     | `speech-text.json`、`azure-speech.ts` → 同名文件                    | 本集逐句审校；局部拼音及大写朗读字母；实际整句试听仍待用户验收              |
| 实测同步及停留               | `timeline.ts`、`narration.ts`、`azure-alignment.ts` → 同名文件      | 缩放及镜头运动绑定本集实测词边界；普通页 3 秒、两页分式推导 5 秒；练习 4 秒 |
| 内容与生产布局检查           | `check-content.ts`、`LayoutCheck.tsx`、`check-layout.ts` → 同名文件 | 覆盖本样例的字幕、揭示、动画、静默；检查等比例、固定单位和整数终点          |
| 输出配置                     | 原有 `remotion.config.ts`                                           | 保留公共默认 4K/60 fps/H.265 硬件配置；本任务不执行视频渲染                 |

## 使用

Node.js ^22.18.0 或 >=24，Remotion 4.0.538。基础预览和打包入口见公共[操作说明](../../docs/agents/videos/operations.md#基础命令)。在 Studio 选择 `Shear216`。生产页面必须有全部实测音频数据，不使用估计时长兜底。

在本工程目录运行：

```sh
pnpm --config.verify-deps-before-run=false run video:dev
pnpm --config.verify-deps-before-run=false run video:lint
pnpm --config.verify-deps-before-run=false run video:narration --dry-run
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:check-layout --screenshots
```

配音环境要求与原速规则见公共[配音环境](../../docs/agents/videos/operations.md#配音环境与续跑)。`video:narration` 调用 Azure；`--dry-run` 只检查并打印实际输入。失败保留暂存目录，使用日志中的 `--resume=<目录>` 续跑；也支持 `--shots=<镜头ID>`。全部目标通过后才发布到 `public/narration/`、`src/audio-timing.json` 与 `src/captions.json`。生成脚本不读取字幕作为朗读兜底。

`video:check-layout` 使用系统临时端口、已有 Chrome 与 Playwright CLI，在无头浏览器检查生产组件。`--screenshots` 保存浏览器页面截图，不导出视频或 Remotion 静帧。

## 验收状态

已通过本工程 lint／类型检查、完整口播 dry-run、28 段音频解码及实测时长、字幕／配音指纹一致性、4 秒练习与全体页末停留检查，以及 182 个生产页面时间状态的无头布局检查。已逐页查看 8 页完整画面的浏览器截图。独立规范审查与规格审查均未发现阻断问题；未运行全仓库测试。

合成第 8 段时，字母 D 的零时长词边界未通过自动对齐复核；将该句口播中的“同一个 D”改为数学含义相同的“同一个倍数”，重新合成后通过原有检查。字母 D 的解释保留在第 6、9、11 段。未改音色、调速、估算词时间或降低检查门槛。

样例尚未获用户确认。实际整句试听、自然度、成片音画同步及可见桌面验收尚未完成；不得将自动对齐、解码或无头布局检查当作这些验收。助手未渲染或导出视频，父规格及后续任务未修改或关闭。
