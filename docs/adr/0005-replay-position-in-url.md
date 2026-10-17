---
status: accepted
date: 2026-10-08
---

# URL 记录教学位置，步骤不累积浏览器历史

为支持刷新恢复和分享同一步教学，采用列表、案例详情和教学三类页面，详情就是普通查看，URL 记录案例及教学步骤。步骤更新替换当前历史项，不为每次小步新增历史；教学内的回退交给回放控件，浏览器后退用于离开当前页面，避免学习很多步后难以返回列表或详情。

这使步骤参数成为用户可见的导航契约。渐进轨迹尚未交付目标步骤时，应等待并显示真实加载状态，不能把未生成误判为越界或偷偷切换到另一步，参见 [ADR 0011](0011-progressive-cancellable-traces.md)。

依据：2026-10-08 明确选择 URL 记录步骤和替换历史项，见 [CNB #34](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/34)、[#36](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/36)。当前路由与步骤参数处理见 [web/src/algorithms/bo/BoPages.tsx](../../web/src/algorithms/bo/BoPages.tsx)。
