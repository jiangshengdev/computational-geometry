# 作者导出与验收

仅供作者操作；助手本轮没有执行PNG、音轨、视频或MOV导出。当前正式音频覆盖61/61，原始机器计数 Omission=0、Insertion=0、Mispronunciation=32。用户明确跳过听辨，未把机器结果写成人工通过。音频版本与检查见 `src/audio-review.json`。

## 已核验参数与环境限制

composition为 `OverallCorrectness`，1920×1080、60 fps、54504帧、15:08.400。PNG入口使用2倍尺寸，预期3840×2160，共54504张。已读取本机Remotion4.0.543的文件命名实现：起始帧0、最后帧54503、5位编号，模式为 `out/overall-correctness-frames/element-%05d.png`。尚未生成PNG，作者生成后必须核对实际文件，不以此预测替代产物检查。

本机Chrome Headless Shell158.0.8127.2与Remotion匹配；两个导出入口只执行过dry-run，实际执行会各自申请独立临时端口，不复用dev。输出目录／文件当前不存在，入口禁止覆盖。

**第3阶段当前阻塞：** 本机Linux FFmpeg不含 `hevc_videotoolbox`，未发现 `/dev/dri` 或NVIDIA设备工具；编码器列表中存在其他硬件接口不证明有可用设备。因此不提供已知不适用的VideoToolbox执行命令，不回退软件编码。作者需在支持硬件HEVC的实际导出环境核验编码器、设备和项目路径后，按[项目五阶段模板](../../../docs/agents/videos/operations.md#五阶段命令模板)落实第3步；跨机器时也须重新核验匹配的Headless Shell路径。下面路径只对应当前云环境，不冒充作者其他机器路径。

## 第1步：独立预检

已有本版本有效结果可复用，无须仅为导出重跑。若源码或素材变化，按影响范围核对后再继续。设置当前云环境：

```sh
cd /workspace/computational-geometry/videos/bentley-ottmann/overall-correctness
export REMOTION_BROWSER_EXECUTABLE=/workspace/.local/share/remotion-browsers/158.0.8127.2/chrome-headless-shell-linux64/chrome-headless-shell
pnpm --config.verify-deps-before-run=false run video:preflight
```

## 第2步：PNG

仅作者执行。继续条件：已明确检查覆盖与未验收范围，输出路径不存在，匹配浏览器可用。不要在硬件导出环境尚未确定时把本机可生成PNG理解为整条导出链已可完成。

```sh
pnpm --config.verify-deps-before-run=false run video:export
```

生成后核对54504张、编号00000–54503、3840×2160、时间顺序和完整画面；保留PNG，发现异常时按项目规则定位具体帧。

## 第3步：硬件H.265无声视频

当前硬件前提缺失，暂停本阶段及后续执行。目标输入是上一步实测确认的PNG序列，60 fps，目标文件 `out/overall-correctness-silent.mp4`；要求硬件HEVC、无音频、yuv420p、hvc1、禁止覆盖。待作者环境核验后才能给出适用编码命令；禁止用另一集文件、软件编码或未核验设备代替。

## 第4步：同时间线PCM WAV

以下为已核验的本集入口，只有第3步无声视频完成并检查通过后才能执行。使用同一源码、正式素材及帧数；不得将原61条源音频简单拼接代替此时间线音轨。

```sh
pnpm --config.verify-deps-before-run=false run video:export-audio
```

入口显式选择WAV、PCM16、48kHz并关闭纯音频步骤的视频硬件加速。检查产物为双声道、完整15:08.400时间线及正确静默／页末窗口，保留原始音轨。

## 第5步：MOV

仅在无声视频和同版本音轨都已完成检查、目标MOV不存在时执行：

```sh
pnpm --config.verify-deps-before-run=false exec node ../../shared/tools/mux-mov.ts out/overall-correctness-silent.mp4 out/overall-correctness-audio.wav out/overall-correctness.mov
```

共享入口核对HEVC、48kHz／16-bit／双声道PCM及两轨时长，再直接复用两条流，不重编码、不裁短、不覆盖。此命令尚未执行，当前没有输入成片，不能把参数核验称为成片验证。

作者导出后提供可读取的当前MOV，核对全片画面、字幕、章节接缝、四处关键状态与同步。听辨按用户最新明确豁免处理，不补做也不虚构其结论。尚无当前成片，真实成片验收保持未完成；不自动发布或关闭#400／#405／#406。
