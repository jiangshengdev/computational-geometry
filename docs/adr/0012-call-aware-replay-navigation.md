---
status: accepted
date: 2026-10-12
---

# 按真实调用关系导航并保留闭包外部代码

为理解真实函数和闭包调用，“下一步”就是 `si`，只步入当前展示的用户代码；不扩展到未展示的辅助函数、几何公式内部或 Rust 标准库实现。标准库触发的范围内用户闭包仍按实际调用顺序和实参记录，空集合不产生虚构调用；当前调用和外层暂停调用的变量按作用域分组。

步过完成当前语句中的被调用过程，跳过被调用函数及闭包的内部和结束停点；当前函数自己的结束停点仍保留。步出跳过当前调用剩余停点，直接恢复调用方，最外层禁用步出。导航跳跃不删除内部记录，“上一步”回到紧邻的可观察停点，而不是撤销整次用户操作。这要求记录真实调用身份，不能只靠深度、代码行号或统一过滤返回标记决定目标。

闭包在所属精简教学片段中按大括号原地展开，进入和退出时保留外部代码，不切成独立闭包模块；不因“断点调试”的措辞引入设置断点或运行至断点功能。为了在 stable rustfmt 下保留所需源码格式，采用展开为空的 `nop!();`，教学展示隐藏它，不产生停点。

依据：2026-10-12 范围及调用语义讨论形成 [CNB #101](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/101)；同日明确选择闭包原地展开，修正见本地提交 `69dc9d6`。晚间澄清及 [CNB #109](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/109) 排除了“步过跳过所有返回值停点”的错误解释；最新含义以本条为准。当前导航见 [web/src/algorithms/segment-intersection/bo/learning/executionNavigation.ts](../../web/src/algorithms/segment-intersection/bo/learning/executionNavigation.ts)，代码映射见 [web/src/algorithms/segment-intersection/bo/learning/executionCode.ts](../../web/src/algorithms/segment-intersection/bo/learning/executionCode.ts)。
