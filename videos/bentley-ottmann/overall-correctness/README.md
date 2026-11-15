# 第九章：为什么整个算法始终正确

规格：[CNB #400](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/400)。正式接入61段原速音频；**54504帧、60fps、15:08.400**。当前61/61段机器评估为 **漏读0、插入0、发音标记32**。用户明确跳过听辨，实际听辨未执行；不将其写成人工验收通过。

当前状态与证据见[正式音频交接](NARRATION_HANDOFF.md)，作者后续操作见[导出与验收入口](AUTHOR_EXPORT.md)。助手未导出成片；当前环境缺少模板的VideoToolbox硬件编码器，作者成片验收尚未完成。工单状态不变。

## 唯一生产路径

- `src/storyboard.ts`：五节、23页、61镜，保留来源／前章参考／本章增量映射。仅OC14/19/20/52的五处字幕随已采用口播同步，数学含义不变。
- `src/sentence-plan.json` → `video:prepare-text` → `src/narration-text.json`：口播分句与纯文本；`src/speech-text.json` 为标音及200/400ms语义句界停顿。
- `public/narration/*.wav`：服务原始PCM源，完整原速播放。`src/audio-timing.json` 绑定音频哈希、口播指纹、原始评估与词时间；`src/captions.json` 由同一来源生成。
- `src/timeline.ts`：共享实测时间线；`cuesFor` 显式绑定OC35/39/45/52的真实短语边界。`src/Composition.tsx` 通过共享 `NarratedLesson` 播放完整源文件，无裁切或倍速。
- `TeachingPage.tsx`／`ProofDiagram.tsx`／`CoverageExtension.tsx`／`BoundaryRecords.tsx`／`NextEventTimeline.tsx`：已审图义与页面保持；没有重做其他画面。
- `src/audio-review.json`／`src/sync-review.json`：本次实际版本、机器计数、用户听辨豁免，以及分别记录的状态观察与静音播放范围。
- `src/text-review.json`／`src/visual-review.json`：此前无声阶段的独立审校证据；按各自基线和范围解释，不当作实测时间线的新验收。当前局部文稿采纳记录附于文本审校文件。
- `narration-staging/`／`narration-candidates/`／`assets/narration-review/`：按用户保留原始素材与对照的要求保留历史证据，不进入生产播放。已退役候选生成器和旧暂存汇总入口；历史文档的命令说明不是当前入口。

## 检查

依赖按本集锁文件维护，Remotion4.0.543、SpeechSDK1.53.0；未升级其他依赖。当前云的匹配Chrome Headless Shell为158.0.8127.2。

```sh
cd /workspace/computational-geometry/videos/bentley-ottmann/overall-correctness
export REMOTION_BROWSER_EXECUTABLE=/workspace/.local/share/remotion-browsers/158.0.8127.2/chrome-headless-shell-linux64/chrome-headless-shell
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-text
pnpm --config.verify-deps-before-run=false run video:check-content --decode
pnpm --config.verify-deps-before-run=false run video:preflight
```

`video:preflight` 运行完整音频／内容检查和生产布局检查，自动分配独立临时端口；不导出媒体。已有有效检查不要求反复执行。`video:check-layout --shots=OC35,OC39,OC45,OC52 --screenshots` 可检查指定镜，截图是浏览器证据，不是Remotion静帧导出。

## 审校边界

Standards与Spec新上下文独立复核已核对实测接入及局部字幕同步；实际状态观察与1x静音抽查单独记录，不以源码或构建代替视觉验收。全片原始音频已机器检测，不进行或宣称人工听辨。无当前导出成片，因此不能声明整集最终成片验收完成，亦不发布或关闭任何工单。
