# 从任意端点求出完整交集

第三章上集，composition：`CompleteIntersection`。权威规格为 [CNB #320](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/320)，文案与画面阶段为 [#321](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/321)。制作源及对应关系见 [production-reference.md](./production-reference.md)。

本工程停在配音接入之前：五节、21 页、64 个教学步骤 `CI01`–`CI64`。没有正式音频、音频实测时间或音画同步结论。`timeline.ts` 的阅读窗口按字幕长度暂定，保留半秒完整行预显、页末停留及 `CI61` 的四秒观察窗；总时长不能作为成片时长。后续 [#323](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/323) 接入原速完整 WAV、实测字幕与语义短语时间，再由 [#325](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/325) 验收整集。

## 内容入口

- `src/storyboard.ts`：先行审校的字幕、分镜与稳定步骤 ID；每页指向第三章原文节名，每步记录首次引入、画面操作、保留内容及观察窗口。
- `src/narration-text.json`：从字幕派生并独立审校的冻结纯文本，数学公式口语化，保持自然词组及字母边界。
- `src/speech-text.json`：与冻结稿逐字相同的读音准备稿，通过局部 `{text,pinyin}` 标注维护；字幕不读取这些发音标注。
- `src/IntersectionDiagram.tsx`：本集局部图示；横纵每单位均为 80 个逻辑像素，重合输入保持原位置。
- `src/TeachingPage.tsx`：统一教学页、完整行先显示、逐行累积、中性色短字幕；语义提示由当前短句选择对象。
- `src/JudgmentPath.tsx`：第五节才把已讲分支汇成完整路径，不在开场揭示整图。
- `src/LayoutCheck.tsx`：真实生产组件的无声 DOM 检查，不执行 Remotion 静帧或视频导出。

## 工程命令

在本目录运行，仅使用已安装工具。首次缺依赖时由用户自行执行 `pnpm install --frozen-lockfile`；助手不安装组件。日常检查关闭 pnpm 自动安装：

```sh
pnpm --config.verify-deps-before-run=false run lint
pnpm --config.verify-deps-before-run=false run video:check-content
pnpm --config.verify-deps-before-run=false run video:check-layout
```

布局检查前须将已安装且匹配 Remotion 4.0.539 的 **Chrome Headless Shell 157.0.8080.0** 真实路径设置为 `REMOTION_BROWSER_EXECUTABLE`。检查入口会验证版本、使用系统分配的独立端口并关闭自己启动的进程。可用 `--shots=CI47,CI48` 限定受影响片段；`--screenshots` 仅保存浏览器页面截图到系统临时目录。缺少工具时停止，不自动下载或回退浏览器。

预览入口为 `pnpm --config.verify-deps-before-run=false run dev --port=<独立临时端口>`，不自动打开窗口；代理使用系统分配端口，不能复用普通开发端口。可见窗口须另获授权。

本票不提供导出入口。后续配音与同步参见 [公共时间线规则](../../../docs/agents/videos/timeline.md)，试听及成片验收参见 [交付规则](../../../docs/agents/videos/delivery.md)，助手禁止渲染或导出。
