# 第六章上集：同列事件，逐点更新

文案与画面见 [#354](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/354)，正式配音与实测同步见 [#355](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/355)，听辨与成片验收见 [#356](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/356)。父规格为 [#353](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/353)，内容依据为[第六章正文](../../../docs-site/docs/segment-intersection/same-x-events.mdx)第一至三节。正式审校、验收与问题核销以 CNB 任务记录为准。

## 当前阶段

本工程已接入正式配音和实测时间，18 页、44 个稳定片段 SC01–SC44。`SameColumnEvents` 使用共享 `NarratedLesson` 完整原速播放配音；`LayoutCheck` 只使用相同教学页面检查画面，不挂载或播放音频。

`src/storyboard.ts` 是字幕与分镜源，保存来源、教学动作及画面状态；`src/narration-text.json` 是独立口播，`src/speech-text.json` 保存保持同一全文的读音标注。`src/example.ts` 维护本案例输入与交点；几何图和顺序竖列由 `src/EventDiagram.tsx` 分别表达。

`src/timeline.ts` 采用 `measured-narration`：`src/audio-timing.json` 保存实测音频时长、词时间、哈希、指纹及原始评估响应，`src/captions.json` 由这些词时间生成。阅读估算与固定 90 帧动作时长已退出正式计算；加入、登记、报告、换序和退出使用实际口播短句时间。教学行先显示 30 帧，完整音频之后保留片段间一秒或页末三秒；静默期间保留页面和最后字幕。

当前总长 39,251 帧／60 fps，即 10 分 54.183 秒；44 条正式 WAV 位于 `public/narration/`，合计 551.880 秒，均为 48 kHz、16 bit、单声道 PCM。当前评估覆盖 44/44 段，`Omission=0`、`Insertion=0`、`Mispronunciation=37`，没有缺失评估。发音标记仍待整句听辨，不等于已确认错读。制作过程中未试听，未渲染或导出；实际听辨、成片音画同步及可见桌面验收未执行。

SC29 首版的 R 被评估为“二”，产生漏读、插入各一条，未采用为正式素材，也未宣称实际错读。仅调整首句为“这对线段在右方相交。交点用 R 表示。”并独立复查后生成单段候选，新版三类标记均为零；其余 43 段请求指纹和音频保持不变。旧版完整 WAV、请求及原始响应保留于 `assets/narration-review/`，不参与播放。用户明确保留已有 `build/` 与 `.playwright-cli/`；请求批次的续跑状态位于 `out/narration-sc355*`，正式播放和离线音频检查不依赖这些目录。

## 配置与入口

逻辑画布为 1920×1080、60 fps，共享配置采用 2 倍输出、PNG、H.265、PCM 48 kHz、硬件编码及禁止覆盖。工程独立安装依赖，公共能力引用 `videos/shared/`，不导入相邻视频的内容或依赖目录。

在本工程目录使用 `pnpm --config.verify-deps-before-run=false run <脚本>`：

| 脚本                                  | 范围                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `lint`                                | 当前源码、检查脚本的 ESLint 与 TypeScript                                             |
| `build`                               | Remotion 打包，不渲染                                                                 |
| `video:check-content`                 | 六对几何交集、顺序依据、严格未来、字幕和停留连续性                                    |
| `video:check-layout`                  | 实际生产页面的揭示、动作及字幕状态；可用 `--shots=SC23,SC29` 限定受影响步骤           |
| `video:plan-narration`                | 离线核对字幕原句、口播、读音、停顿与完整 SSML；可用 `--shots=SC29 --dry-run` 限定候选 |
| `video:synthesize`                    | 按请求计划及其 SHA-256 合成；支持显式 `--shots`，保留失败／未知状态，不自动重发       |
| `video:assess`                        | 对指定暂存批次取得原始识别、发音评估及实测词时间，不播放音频                          |
| `video:adopt-measured-audio`          | 复用共享采用流程；完整校验后生成正式音频、字幕及时间数据                              |
| `video:check-audio`                   | 离线核对当前 44 段格式、解码、哈希、请求、原始评估及字幕                              |
| `video:preflight`                     | 独立内容／音频／布局预检，不渲染                                                      |
| `video:export` / `video:export-audio` | 用户导出 PNG／同时间线 PCM WAV；助手仅执行 `--dry-run`                                |
| `dev`                                 | Studio，不自动打开可见窗口；代理检查使用共享入口分配临时端口                          |

布局检查需设置已核验的 `REMOTION_BROWSER_EXECUTABLE`。Remotion 4.0.540 指定 Chrome Headless Shell 158.0.8127.2；共享检查器核验实际二进制，不自动下载。`--screenshots` 将浏览器截图写入系统临时目录。详见[工程操作说明](../../../docs/agents/videos/operations.md)及[唯一浏览器约束](../../../docs/agents/videos/configuration.md#唯一浏览器约束)。

## 参考继承与防重复

实际参考是第四章 `same-point-updates` 的当前块替换，以及第五章 `overlap-reporting`、`overlap-discovery` 的生产 `TeachingPage.tsx`。本集复用 `MathLessonPage`、`TeachingReferences`、`TeachingMathLines`、`SemanticMathText` 与共享布局检查，专用案例独立维护。

| 旧基准与行为                                                             | 本集对应                                          | 检查范围                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------- |
| 第五章 `TeachingPage` 的 `diagramPosition="left"`、850/800 列宽、65 间距 | 全部有图页面直接使用同一组合                      | 引入、讲解、收束与相邻片段                         |
| 第五章 `basis`、`TeachingReferences` 的静态依据、95 高度预留             | 交集检查、无事件入口、P/Q/R 与未来规则页          | 依据不随局部重点闪烁                               |
| 第四、五章按 `visibleStep` 累积正文，隐藏未来行但保留布局空间            | 每页逐步保留已讲结论                              | 第一行至完整页及页末                               |
| 第五章对象色、局部重点色、中性字幕                                       | 输入身份沿正文蓝／橙／紫／绿；当前重点按语义收束  | 强调前、中、后与静默                               |
| 现有 `AttentionMarks` 线段渐进描亮                                       | 输入介绍与候选配对                                | 一次教学动作一次提示；不使用有反复半径变化的点提示 |
| 第四章局部块更新示意                                                     | P 后 Q 前保留低处右枝、高处左枝，顺序卡片独立移动 | 不以整列右侧几何采样替代中间状态                   |
| 第五章短句字幕与静默保留                                                 | 当前分镜自然标点分句，保留上一句与页末最后一句    | 实测词时间与完整原速音频；不代替实际听辨           |

对象色采用正文同一映射，公式使用共享数学排版。SVG 内嵌数学标签的显示尺寸与 viewBox 保持 1:1。交换时卡片横向错开，避免中途相互遮住；这只表达顺序操作，不移动真实输入坐标。

| 旧材料具体位置                                                           | 本集承接   | 新增内容                                                                 |
| ------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------ |
| 第三章正文第三节；`exact-sweep-decisions` ES07–ES09                      | SC08–SC13  | 只核对本例六对，引用唯一候选与闭范围，不重推求交公式                     |
| 第二章证明“没有事件，就不会改变顺序”；`why-neighbors` V-no-events        | SC14–SC20  | 同列左端逐个加入，再由实际端点与交点证明入口间隙无事件                   |
| 第四章第六、七节；`same-point-updates` SU04–SU10、SU23–SU33              | SC21–SC35  | 当前块右侧排序与边界检查接到同列不同进度，不照搬“块外同列无事件”的旧限制 |
| 第四章找齐参与者与闭端点报告；`same-point-participants` SP18–SP25、SP56  | SC20–SC36  | 在各自高度到站，先报告后更新，四个右端点分别退出                         |
| 第三章第七、八节；`exact-sweep-decisions` ES19–ES27                      | SC37–SC42  | 将严格未来扩为先比 x、同列再比 y；同点与过去仍排除                       |
| 第五章全文；`overlap-reporting` OR32–OR41、`overlap-discovery` OD31–OD54 | SC02、SC44 | 保留复杂输入条件与下集接口，不重复覆盖、发现和报告证明                   |

上集用案例建立规则，未证明所有允许输入。下集负责高度定位、同列发现的一般理由及同线组闭覆盖联系。本阶段的程序检查与无头观察不代替实际听辨、音画同步、可见桌面或真实成片验收。

## 正式配音阶段的检查与导出

当前版本的 ESLint、TypeScript、打包、内容与 44 条音频完整解码检查通过；全片布局检查覆盖 1,250 个生产状态。独立复核直接核对正式音频与请求、词时间、字幕和完整播放窗口，并逐张观察 34 个关键过程帧，覆盖 SC12 两组比较、SC15 登记、SC21 报告、SC22／SC27 换序及相邻衔接、SC29 登记、SC35 两次退出。未发现本阶段待修正项；这些无声观察不代替实际听辨和成片同步验收。

下列命令由用户依次执行，每个代码块均从仓库根目录开始。当前 Composition 为 `SameColumnEvents`，输出 39,251 帧，编号 0–39250，60 fps、3840×2160。已核验当前安装版本使用 `element-%05d.png`；实际 PNG 生成后仍须核对编号。交付时四个输出路径均不存在，禁止覆盖后续产生的文件。PNG 与 WAV 入口的 `--dry-run` 已通过，未执行渲染。

1. 独立预检：当前内容、音频及全片布局检查已完成，无需重跑；以下保留后续修改时的入口。

```sh
cd videos/bentley-ottmann/same-column-events
REMOTION_BROWSER_EXECUTABLE=../same-point-participants/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell pnpm --config.verify-deps-before-run=false run video:preflight
```

2. 生成 PNG；检查 39,251 张图片的连续编号、尺寸及画面异常，通过后再编码。

```sh
cd videos/bentley-ottmann/same-column-events
REMOTION_BROWSER_EXECUTABLE=../same-point-participants/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell pnpm --config.verify-deps-before-run=false run video:export
```

3. 硬件编码无声 H.265；完成后检查解码、帧数、时间戳和全片逐帧突变，可疑帧与原 PNG 对照，通过后再导出音轨。

```sh
cd videos/bentley-ottmann/same-column-events
ffmpeg -n -framerate 60 -start_number 0 -i 'out/same-column-events-frames/element-%05d.png' -an -c:v hevc_videotoolbox -allow_sw 0 -pix_fmt yuv420p -tag:v hvc1 out/same-column-events-silent.mp4
```

4. 导出同时间线完整原速 PCM WAV；入口显式采用 `wav`、`pcm-16`、48000 Hz，并关闭视频硬件加速。检查实际音轨为 48 kHz、16 bit、双声道且时间线一致后再封装。

```sh
cd videos/bentley-ottmann/same-column-events
REMOTION_BROWSER_EXECUTABLE=../same-point-participants/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell pnpm --config.verify-deps-before-run=false run video:export-audio
```

5. 复制已核验的两条流封装 MOV，不重新编码。保留 PNG、无声视频和音轨，随后进入 #356 的整集听辨与成片音画同步验收。

```sh
cd videos/bentley-ottmann/same-column-events
pnpm --config.verify-deps-before-run=false exec node ../../shared/tools/mux-mov.ts out/same-column-events-silent.mp4 out/same-column-events-audio.wav out/same-column-events.mov
```

## 无声阶段的检查记录

ESLint、TypeScript、内容检查与 Remotion 打包通过。内容检查包含六对完整交集、顺序与严格未来条件、44 段口播和标注的逐字一致性，以及字幕保留与动作语义锚点。

全片布局检查覆盖 1057 个生产状态，发现退出卡片的重叠后，修复为保留原槽并在退场结束移除；受影响范围复查 741 个生产状态通过，未变范围沿用原检查结果。独立画面对齐修复了交点引线、当前位置与原点区分、换序时机及局部强调四项问题。随后实际对照第五章 OD20，并补查 SC15 加入与登记、SC21 报告、SC29 登记的前后状态，未新增问题。

上述观察属于 #354 无声版本，不能替代 #355 实测同步版本的检查。完整审校版本、问题核销及阶段完成状态以对应 CNB 任务为准。
