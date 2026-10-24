# 视频制作配置

适用于仓库 `videos/` 下的视频工程；同时遵循 [视频工程规则](../../../videos/AGENTS.md) 中贯穿各阶段的约束。

## 唯一浏览器约束

- 视频工程的浏览器自动化、布局检查及 Remotion 视频、静帧、纯音频导出，只允许使用当前工程已安装 Remotion 版本指定的 Chrome Headless Shell。这是硬性约束，不是可覆盖的默认值；不得以仅导出音频、不生成画面或已经启用无头模式为由例外。
- 提供命令或执行相关操作前，必须核验当前 Remotion 版本、该版本指定的 Headless Shell 版本，以及已安装二进制的真实路径和实际版本；核验一致后固定使用该二进制。不能仅凭文件存在、缓存编号较新或名称含有 `headless` 判断匹配，也不能直接采用未经版本核验的 Playwright 缓存浏览器。
- Remotion CLI 命令必须显式指定 `--chrome-mode=headless-shell` 和已核验的 `--browser-executable`；API 或其他自动化工具必须显式传入同一已核验二进制的路径。禁止使用完整 Google Chrome、Chrome for Testing、其他 Chromium 或不匹配版本的 Headless Shell；完整 Chrome 的无头模式不满足本约束。
- 缺失对应二进制、版本不匹配或无法完成核验时，停止提供可执行导出命令及依赖该浏览器的操作，报告缺失项，等待用户自行安装并明确通知后重新核验。禁止自动安装、自动下载、删除路径参数触发下载或回退到其他浏览器。
- 依据：Remotion [issue #9473](https://github.com/remotion-dev/remotion/issues/9473) 报告完整 Chrome 并发渲染时偶发单帧内容丢失或画面重复平铺；[PR #9577](https://github.com/remotion-dev/remotion/pull/9577) 仅补充浏览器选用建议，不是代码修复。使用 Headless Shell 不替代实际产物检查。

## 默认制作配置

- 默认输出为 3840×2160、60 fps，不抽帧。Remotion 工程默认保留 1920×1080 逻辑排版，以 2 倍渲染比例直接栅格化为 4K；换算已有帧率数据时，保持原始播放时长、动画时序和音频速度。
- 默认采用 H.265 硬件编码、`yuv420p` 像素格式，生成并保留无损 PNG 帧序列；最终成片为 MOV，音轨采用 48 kHz、16 bit、双声道 PCM，不再编码为 AAC。配音源素材必须遵循[无损配音源素材](narration.md#无损配音源素材)，由 Azure 直接生成 PCM WAV。硬件加速设为 `required`，不可用时直接报错，不静默回退到软件编码；macOS 使用 VideoToolbox。视频仍为有损编码，不宣称整条流程无损。
- 当前 Remotion 的 H.265＋PCM 容器兼容表不允许直接输出 MOV。沿用分阶段流程：PNG → 无声 H.265，独立导出同时间线 PCM WAV，最后由 FFmpeg 复制两条流封装为 MOV。不得只修改输出扩展名来绕过兼容性检查，也不得因容器限制回退到 AAC。
- 默认视频码率为 `null`，不指定 CRF 或目标视频码率，保留 FFmpeg／硬件编码器默认行为及默认预设；不要将用于 H.264 的 `setX264Preset` 套用于 H.265。实际画质、文件大小和速度需通过成片验证。
- 默认并发数为 4，用于控制 4K 页面和 PNG 缓冲的内存占用；该值不是经基准测试确认的最快配置。
- 默认使用 Azure 音色 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`。项目显式覆盖后，以该项目确认的音色为准；环境变量不得静默改变已选音色，失败时不得改换音色或回退到系统语音。
