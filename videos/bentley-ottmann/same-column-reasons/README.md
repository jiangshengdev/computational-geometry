# 第六章下集：同列逐点更新为什么成立

正式配音接入对应 [#358](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/358)，无声教学稿见 [#357](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/357)，父规格为 [#353](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/353)。内容依据是文章《横坐标相同，也不能一起换序》第四至七节。正式执行与独立审校记录以 CNB 为准，不在本地另建任务档案。

本集以已审校的字幕、独立口播与教学画面接入正式音频。独立工程由原生入口初始化，依赖与本集 Chrome Headless Shell 已安装；没有导入相邻工程的教学内容或音频。Composition 为 `SameColumnReasons`，逻辑画布 1920×1080、60 fps，共享配置采用 4K 输出参数。正式素材与实测 JSON 由批次核验通过后采用；缺少素材时不回退估算时间，不创建占位时间。

## 当前制作源

| 文件                                          | 职责                                                     |
| --------------------------------------------- | -------------------------------------------------------- |
| `src/storyboard.ts`                           | 字幕原稿、逐步正文、教学动作、来源与前置引用；SR01–SR50  |
| `src/narration-text.json`                     | 从已审校字幕派生的独立自然口播；不与字幕共用标点         |
| `src/speech-text.json`                        | 冻结口播的局部读音标注；拼接必须逐字一致                 |
| `src/sentence-plan.json`                      | 逐句句界；共享工具据此生成标准 break，保持冻结正文       |
| `src/audio-timing.json` / `src/captions.json` | 核验后采用的实测词时间与保留原文的字幕时间               |
| `src/ReasonDiagram.tsx`                       | 本集专用的一般理由图示与过程，不是算法轨迹               |
| `src/TeachingPage.tsx`                        | 共享成熟页面、数学排版、依据、对象色与局部强调           |
| `src/timeline.ts`                             | `measured-narration`；完整原速音频、实测词边界与语义动作 |
| `src/LayoutCheck.tsx`                         | 使用实际生产页面检查引入、讲解、收束及静默状态           |

本集从第一节重新编号，始终属于第六章。字幕以自然标点保留完整原文，在语义分句处切换。每行正文先完整显示，再开始完整原速音频；同页片段保留已讲内容与上一句字幕。每页最后另留三秒完整画面，开场与收束也适用。旧阅读估算已退出播放路径。动画按实际口播短句推进，字幕分组不重启动作；SR20 的插入与移空、SR29 的选邻居与回溯分开绑定对应语句。SR46 延长、SR47 结束及 SR48 空组退出分别沿各自语义推进。

## 制作与检查入口

以下入口只使用本集已安装依赖，运行前不自动安装。布局检查的浏览器由 `REMOTION_BROWSER_EXECUTABLE` 指向本集 `node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell`，共享核验器要求与 Remotion 4.0.540 指定的 158.0.8127.2 一致。检查使用系统分配的独立端口与无头会话，结束后清理自有进程。

| 入口                  | 覆盖                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| `lint`                | ESLint（含共享组件禁用策略）与 TypeScript                                |
| `build`               | Remotion 打包，不渲染                                                    |
| `video:check-content` | 字幕完整性、时间线连续性、整行先显示、同页字幕与页末保留、口播和标注绑定 |
| `video:check-layout`  | 生产页面边界、图示标签、数学解析、无媒体元素及多个过程状态               |
| `dev`                 | 不自动打开窗口的 Studio；代理诊断使用共享临时端口入口                    |

布局入口支持 `--shots=SR10,SR28` 限定受影响步骤，`--screenshots` 保存生产页面浏览器截图到系统临时目录。截图不调用 Remotion 静帧导出。工程公共流程见[工程操作说明](../../../docs/agents/videos/operations.md)；本集复用共享批次计划、合成、评估、采用、校验、预检及用户导出路径。

正式音频入口为 `video:plan-narration`、`video:synthesize`、`video:assess`、`video:adopt-measured-audio` 与 `video:check-audio`。整批正式采用前校验原始 WAV 格式、哈希、请求指纹、冻结口播、词时间和评估记录；字幕显式处理 SR01、SR24、SR36、SR38、SR41 的一个书面短句对应多个口播短句。`video:preflight` 连续执行内容与布局检查；`video:export` 和 `video:export-audio` 为用户手动导出入口，助手不得执行实际渲染。公共参数与五阶段导出步骤见工程操作说明；预检通过不等于实际听辨或成片验收。

## 参考继承与教学对应

实际参考为第四章 `same-point-updates` 与第五章 `overlap-reporting`、`overlap-discovery` 的生产页面。共享能力直接复用，本集独立维护专用内容及图示。以下对照结合 `storyboard.ts` 的逐页来源和逐步动作阅读。

| 参考入口及实际行为                                                                       | 本集对应                                             | 需要观察的状态                       |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| 第五章 `TeachingPage`：`MathLessonPage`、`diagramPosition="left"`、850/800 列宽、65 间距 | 所有有图页；无图开场和条件链由共享布局居中           | 第一行、完整页、前后片段             |
| 第五章 `basis` 与 `TeachingReferences`：95 高度静态依据                                  | `block`、`outside`、`target`、`equal`、`high-ending` | 只用已介绍对象；依据不随局部强调闪烁 |
| 第四、五章 `TeachingMathLines`：按 `visibleStep` 累积，隐藏行预留空间                    | 各页步骤，数学与普通文字采用同一组合                 | 引入前、每次推进与静默保留           |
| 第五章语义对象色、正文局部重点、中性字幕                                                 | 蓝色第一组与其最远右端、橙色第二组；琥珀色当前关系   | 强调前、中、撤去；不靠字幕染色       |
| 第四章局部块与外侧邻接过程                                                               | SR04–SR05、SR17–SR23 的不同处理进度、边界和空块      | 当前块变化时其他高度保持             |
| 第五章分行范围、覆盖延长与空组                                                           | SR36–SR48；新增闭端等号与完整未来的独立职责          | 当前范围、闭端、延长、退出与未来成员 |
| 第四、五章页末静默及短句字幕保留                                                         | 本集实测音频时间线；整页另留三秒                     | 相邻片段两侧、最终字幕与完整页       |

图示统一采用原生 780×560 SVG，显示尺寸与 viewBox 为 1:1，数学标签使用共享 `SvgMathText`。位置和范围图是无数值的一般示意；阶段顺序、身份分行和列表位置均标明含义，不用它们冒充移动后的几何坐标。图形的变化不承担一般证明本身，证明由逐步正文与口播说明。

## 前置内容与新增推理

| 旧材料具体位置                                                   | 本集承接             | 新增内容                                                           |
| ---------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| 上集 SC38–SC44；文章第一至三节                                   | SR01–SR05、SR24      | 沿用 E=(t,h)、F=(u,v) 与完整未来，不重演四线段                     |
| 第二章 `why-neighbors` V-no-events、V-lower-bound、V-upper-bound | SR06–SR08、SR23      | 无事件开间隙的边界允许同列端点，闭端点仍提供覆盖                   |
| 第四章 `same-point-participants` SP33–SP40                       | SR09–SR14            | 从最低高度逐个保持不递减，接到高处定位；非竖直唯一高度保证两路收集 |
| 第四章 SP49–SP60、下集 SU06–SU20；第三章两侧斜率                 | SR15–SR18、SR22–SR23 | 点输入不能留到同列高处；块外允许同列其他事件，保留各自进度         |
| 第四章 SU23–SU33、第五章 OD37–OD39                               | SR19–SR21            | 引用边界分类，检查条件改为完整位置与闭覆盖                         |
| 第五章 OD40–OD49；第二章保留并按序取出                           | SR25–SR33            | 低处不改高处成员、不插入目标等高块；既有检查仍在目标之前           |
| 第五章 OR20–OR28、OR32–OR41                                      | SR34–SR35            | 同线同列开始仍是同点；其他高度不混入报告身份                       |
| 第五章 OD03–OD11                                                 | SR36–SR45            | 从 t<r_i 改为 t≤r_i，允许最大右端等于本列，未来与覆盖分别核验      |
| 第五章 OD21–OD30                                                 | SR46–SR48            | 延长、结束和空组按各自精确位置发生，引用既有结论，不重演旧案例     |

## 验收边界

文稿审校与无声稿检查记录在 #357；正式音频和本阶段复核记录在 #358。类型、内容、布局检查不代替教学含义和动态过程核对。实际听辨、动态过程、可见桌面与真实成片验收分别记录，不以离线检查或接口接入代替。

当前采用 50 段完整原速 PCM WAV，源音频合计 861.900 秒；完整时间线 58,633 帧、60 fps，即 977.217 秒。全部正式素材已完成识别与发音评估，以及完整解码、格式、哈希、请求指纹与实测时间校验。当前原始程序计数为 `Omission=0`、`Insertion=0`、`Mispronunciation=38`，覆盖 50/50 段；38 条发音标记留待实际听辨，不是已确认错读。

SR46 初次请求和一次授权重试未保存音频，旧入口未保留底层错误，不能回溯判因。随后经授权的诊断请求取得 `FailedPrecondition / Unkown phoneme / 1007`：实际 SSML 中的 `lve 4` 不符合 Azure SAPI 的 `lue 4`。共享转换器已修复并补充回归测试，项目配音规则同步区分稿件拼音与服务音素；正确的口播和拼音原稿未改。修正后仅重新合成 SR46，16.690 秒，三类评估标记均为零；其余 49 段请求和音频保持不变。

`assets/narration-request-evidence.json` 保留三次未取得音频的原请求状态、脱敏诊断及最终替代素材对应关系，防止误重放。当前制作源能重建正式请求，`src/audio-timing.json` 保留原始评估和词时间，`public/narration/` 保存正式 WAV；播放和离线检查不依赖暂存批次或语音服务。

## 用户五阶段导出

本阶段 lint、内容检查、构建及 2,288 个生产布局状态检查通过。独立无声观察覆盖关键语义动作、短句边界及静默保留；SR15 提前淡出问题已修正，并定向复查报告结束前保留、移去过程及终态保持。以上不替代连续播放、实际听辨或成片同步验收。批次暂存、构建和浏览器临时日志已清理，正式素材与最小请求证据保留。

下列命令每个代码块均从仓库根目录开始，由用户按顺序执行。当前输出为 3840×2160、60 fps，共 58,633 帧，编号 0–58632；已核验 Remotion 4.0.540 的命名为 `element-%05d.png`，实际输出后仍须核对。PNG／WAV 的 dry-run 已通过，未执行渲染；交付时四个输出路径均不存在，不覆盖后续产物。

1. 独立预检。已有有效内容、音频和布局结果无需重复执行；修改后可使用此入口。

```sh
cd videos/bentley-ottmann/same-column-reasons
REMOTION_BROWSER_EXECUTABLE=node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell pnpm --config.verify-deps-before-run=false run video:preflight
```

2. 生成 PNG。核对连续编号、58,633 张图片、4K 尺寸和画面异常，通过后进入下一步。

```sh
cd videos/bentley-ottmann/same-column-reasons
REMOTION_BROWSER_EXECUTABLE=node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell pnpm --config.verify-deps-before-run=false run video:export
```

3. 硬件编码无声 H.265。检查解码、帧数、时间戳及逐帧突变，可疑帧与原 PNG 对照，通过后导出音轨。

```sh
cd videos/bentley-ottmann/same-column-reasons
ffmpeg -n -framerate 60 -start_number 0 -i 'out/same-column-reasons-frames/element-%05d.png' -an -c:v hevc_videotoolbox -allow_sw 0 -pix_fmt yuv420p -tag:v hvc1 out/same-column-reasons-silent.mp4
```

4. 导出同时间线完整原速 PCM WAV。入口显式采用 WAV、pcm-16、48000 Hz 并关闭视频硬件加速；检查实际音轨为 48 kHz、16 bit、双声道且时间线一致后再封装。

```sh
cd videos/bentley-ottmann/same-column-reasons
REMOTION_BROWSER_EXECUTABLE=node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell pnpm --config.verify-deps-before-run=false run video:export-audio
```

5. 复制两条流封装 MOV，不重新编码。保留 PNG、无声视频和音轨，进入 #359 的整集听辨与成片音画同步验收。

```sh
cd videos/bentley-ottmann/same-column-reasons
pnpm --config.verify-deps-before-run=false exec node ../../shared/tools/mux-mov.ts out/same-column-reasons-silent.mp4 out/same-column-reasons-audio.wav out/same-column-reasons.mov
```
