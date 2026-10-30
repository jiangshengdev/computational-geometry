# 项目颜色参考

本目录提供 Tailwind CSS **3.4.17** 的完整静态色板和项目常用明暗组合，供文章、视频及界面选色。无需安装 Tailwind CSS，也不依赖其构建工具。使用规则见 [项目颜色规则](../../docs/agents/colors.md)。

## 文件与来源

| 文件 | 内容 |
| --- | --- |
| [tailwind-v3.json](tailwind-v3.json) | 22 个标准色系，每系 50、100、200、300、400、500、600、700、800、900、950 共 11 级，以及黑、白和 CSS 特殊值 |
| [project.json](project.json) | 项目常用的 `light`、`dark` 两组 HEX 色值，各含 17 种彩色及背景、正文、坐标轴色，保留现有文章配色 |
| [LICENSE](LICENSE) | 上游 MIT 许可证与版权声明，适用于引入的 Tailwind 色板数据 |

完整色板从 [3.4.17 官方源码](https://github.com/tailwindlabs/tailwindcss/blob/v3.4.17/src/public/colors.js)提取静态属性；未执行上游代码。在线浏览可使用 [v3 官方色板](https://v3.tailwindcss.com/docs/customizing-colors)。许可证来自[同版本 LICENSE](https://github.com/tailwindlabs/tailwindcss/blob/v3.4.17/LICENSE)。

保留上游的标准名称、色值和色阶。废弃别名 `lightBlue`、`warmGray`、`trueGray`、`coolGray`、`blueGray` 不重复收录，分别使用 `sky`、`stone`、`neutral`、`gray`、`slate`。`inherit`、`current`（值为 `currentColor`）、`transparent` 是 CSS 特殊值，不是 HEX 色值；传给不支持 CSS 语义的绘图工具前应选择具体颜色。黑、白保留上游的三位 HEX 写法。

## 项目常用组合

| 用途／字段 | 浅色主题 | 来源 | 深色主题 | 来源 |
| --- | --- | --- | --- | --- |
| 蓝 `blue` | `#1d4ed8` | `blue.700` | `#93c5fd` | `blue.300` |
| 橙 `orange` | `#c2410c` | `orange.700` | `#fdba74` | `orange.300` |
| 紫 `violet` | `#7c3aed` | `violet.600` | `#c4b5fd` | `violet.300` |
| 绿 `emerald` | `#047857` | `emerald.700` | `#6ee7b7` | `emerald.300` |
| 红 `red` | `#b91c1c` | `red.700` | `#fca5a5` | `red.300` |
| 琥珀 `amber` | `#b45309` | `amber.700` | `#fcd34d` | `amber.300` |
| 黄 `yellow` | `#a16207` | `yellow.700` | `#fde047` | `yellow.300` |
| 黄绿 `lime` | `#4d7c0f` | `lime.700` | `#bef264` | `lime.300` |
| 草绿 `green` | `#15803d` | `green.700` | `#86efac` | `green.300` |
| 青绿 `teal` | `#0f766e` | `teal.700` | `#5eead4` | `teal.300` |
| 青 `cyan` | `#0e7490` | `cyan.700` | `#67e8f9` | `cyan.300` |
| 天蓝 `sky` | `#0369a1` | `sky.700` | `#7dd3fc` | `sky.300` |
| 靛蓝 `indigo` | `#4338ca` | `indigo.700` | `#a5b4fc` | `indigo.300` |
| 紫 `purple` | `#7e22ce` | `purple.700` | `#d8b4fe` | `purple.300` |
| 紫红 `fuchsia` | `#a21caf` | `fuchsia.700` | `#f0abfc` | `fuchsia.300` |
| 粉 `pink` | `#be185d` | `pink.700` | `#f9a8d4` | `pink.300` |
| 玫红 `rose` | `#be123c` | `rose.700` | `#fda4af` | `rose.300` |
| 坐标轴 `axis` | `#475569` | `slate.600` | `#cbd5e1` | `slate.300` |
| 正文 `text` | `#172033` | 项目自定义 | `#e3e3e3` | 项目自定义 |
| 背景 `background` | `#ffffff` | 白色 | `#1b1b1d` | 项目自定义 |

原有蓝、橙、紫、绿及基础色取自现有文章的 [公共定义](../../docs-site/scripts/svg_math_labels.ts)、[D 线段绿色定义](../../docs-site/scripts/draw_sweep_neighbors.ts)和 [Python 定义](../../docs-site/scripts/draw_shear_coordinates.py)，色值保持不变。其余 13 种彩色从完整 v3 色板选取，补齐 17 个彩色色系。`project.json` 保存可直接使用的 HEX 值；上表记录与完整色板的对应关系，调整组合时同步更新数据与此表。

浅色主题采用 700 级，已有 `violet.600` 保持不变；深色主题统一采用 300 级。按 WCAG 相对亮度公式计算，这 17 种彩色与各自默认背景的对比度分别为 4.92–7.90:1（白底）和 8.63–13.16:1（`#1b1b1d` 底），均超过普通文字 4.5:1 的阈值。此结果仅适用于表中不透明前景与默认背景的组合；透明度、强调底色和实际显示尺寸仍需单独核对。

这些颜色是可选色库，不表示 17 色适合同时区分 17 个对象。例如 `emerald`、`green`、`teal`，以及 `violet`、`purple` 在同图中可能过于相近。单幅图优先选差异较大的少量颜色，并配合名称、线型或标记区分对象，不只依赖颜色。

《扫描过程与三类事件》采用 A 蓝、B 橙、C 紫、D 绿。该映射属于此案例，不是全项目所有同名字母的固定含义；其他图示应按教学对象确定映射，同一内容跨文章和视频保持对应。

## 读取示例

以下均从仓库根目录运行或解析路径，不要求安装依赖。

Node.js／TypeScript 工具可以使用现有运行时读取 JSON，不依赖 JSON 模块导入配置：

```ts
import {readFileSync} from 'node:fs';

const palette = JSON.parse(readFileSync('shared/colors/tailwind-v3.json', 'utf8'));
const project = JSON.parse(readFileSync('shared/colors/project.json', 'utf8'));
const blue = palette.blue['700'];
const text = project.light.text;
```

Python 绘图工具可以直接读取：

```python
import json
from pathlib import Path

palette = json.loads(Path('shared/colors/tailwind-v3.json').read_text())
project = json.loads(Path('shared/colors/project.json').read_text())
blue = palette['blue']['700']
text = project['light']['text']
```

浏览器或 Remotion 组件后续接入时，应根据各自构建工具的 JSON 资源支持方式读取，不能在浏览器组件中调用 `node:fs`。本次仅建立参考和数据，现有文章生成器、视频和界面尚未迁移，也没有新增消费方或构建配置。

## 维护

`tailwind-v3.json` 是固定版本的上游数据快照，不随项目已安装的 Tailwind 版本变化。更新时从指定版本官方源码提取静态色值，核对全部标准色系、色阶、基本值及许可证，并更新版本与来源链接；不要手工调整该文件来表达项目偏好。常用组合和有明确用途的自定义色放在 `project.json`，同时记录用途。v4 配色变更应作为单独迁移处理。
