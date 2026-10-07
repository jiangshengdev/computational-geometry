# Issue tracker: CNB

本仓库的任务、规格和正式执行记录以 CNB Issues 为权威来源。
使用 CNB CLI，不创建本地平行任务记录。

仓库：jiangshengdev/computational-geometry
文档：https://docs.cnb.cool/zh/develops/cnb-cli.html

## 工具和目标

使用已安装的 `cnb`，所有仓库级操作显式传入：
`--repo jiangshengdev/computational-geometry`。

命令参数以本机 `cnb <module> <tool> --help` 为准。
不要通过 Git 远程操作推断仓库。

认证由用户管理；需要时使用 `cnb status` 检查。
工具缺失或认证不可用时报告阻塞，不自动安装或登录，
不将令牌写入仓库或任务记录。

## 操作映射

以下为 `cnb issues` 下的子命令。
针对单个 Issue 的操作还须传入 `--number <number>`。

| 操作 | 子命令及参数 |
| --- | --- |
| 列出任务 | `list-issues --state open --page 1 --page-size 100` |
| 读取正文 | `get-issue` |
| 读取评论 | `list-issue-comments --page 1 --page-size 100` |
| 读取标签 | `list-issue-labels` |
| 创建任务 | `create-issue --title '标题' --body-file <path>` |
| 更新正文 | `update-issue --body-file <path>` |
| 添加评论 | `post-issue-comment --body-file <path>` |
| 添加标签 | `post-issue-labels --labels <label>` |
| 移除标签 | `delete-issue-label --name <label>` |
| 添加处理人 | `post-issue-assignees --assignees <username>` |
| 完成任务 | `update-issue --state closed --state-reason completed` |
| 不予处理 | `update-issue --state closed --state-reason not_planned` |
| 重新打开 | `update-issue --state open --state-reason reopened` |

列表和评论按需继续分页，不把第一页当作完整结果。
多行正文使用临时文件和 `--body-file`。
标签名称遵循 `docs/agents/triage-labels.md`。

## Skills 语义

“publish to the issue tracker”表示创建或更新 CNB Issue。
“fetch the relevant ticket”表示读取目标 Issue 的正文、
评论和标签，以及当前工作涉及的依赖记录。

配置本身不授予外部写入权限。执行创建、评论、标签、
分配或状态变更前，核对当前请求的授权范围。
更新前读取当前记录，更新后回读验证实际结果。

## Wayfinding

使用一个带 `wayfinder:map` 标签的 Issue 记录
Notes、Decisions-so-far、Fog 和有序子任务清单。

子任务正文使用 `Part of #<number>` 指向 map；
依赖使用 `Blocked by: #<number>` 明确记录。
子任务类型标签使用 `wayfinder:research`、
`wayfinder:prototype`、`wayfinder:grilling` 或 `wayfinder:task`。

选择 map 中第一个未关闭、未分配且所有阻塞任务均已关闭的子任务。
领取时分配实际驱动工作的用户；完成时记录结果，
关闭任务，并在 map 中追加结论及链接。

## 不可用时

CNB 不可用时，可以继续不依赖缺失信息的已授权本地工作；
依赖缺失需求或状态的工作暂停。
待补录内容仅作为临时材料，不建立第二套正式记录。
恢复后先核实当前远端状态，避免重复写入。
