---
status: accepted
date: 2026-10-11
---

# 普通结果与按需渐进教学轨迹分离

完整细粒度轨迹给大案例带来生成、传输和解析成本。选择保留所有精确教学步骤、变量及调用信息，改变生产和加载生命周期：普通结果不等待或预生成完整轨迹，进入学习模式后才开始渐进生成、交付和回放，而不是先完整生成再分段显示。

尚未完成时区分已生成范围与最终总数，不虚报百分比或学习完成；远处步骤尚不可用时允许等待，显示进度并支持取消，同时继续浏览已生成内容。离开学习模式或切换案例要取消服务端剩余生成和客户端加载，不能仅忽略旧响应；重新进入允许重新等待。

相较预先准备全部轨迹，此选择降低不必要工作并缩短首次可用时间，代价是总数暂时未知、远跳等待及取消状态管理。历史目标为进入学习后首个真实步骤在 3 秒内可操作，远跳允许更久但须可取消；该目标不是本次重建的性能测量结论。传输编码和批次大小是实施选择，不追认为当时已由用户决定。

依据：2026-10-11 性能讨论逐项选择保留完整语义、按需渐进和取消，见 [CNB #95](https://cnb.cool/jiangshengdev/computational-geometry/-/issues/95)。当前轨迹发布见 [src/algorithms/bo/trace_publication.rs](../../src/algorithms/bo/trace_publication.rs)，请求级字典编码与交付生命周期分别见 [src/algorithms/bo/http/protocol.rs](../../src/algorithms/bo/http/protocol.rs)、[src/algorithms/bo/http/delivery.rs](../../src/algorithms/bo/http/delivery.rs)。前端流读取与解码见 [web/src/algorithms/bo/learning/trace.ts](../../web/src/algorithms/bo/learning/trace.ts)，请求取消、失效隔离与状态交付见 [web/src/algorithms/bo/useComputation.ts](../../web/src/algorithms/bo/useComputation.ts)，回放 URL 和跳转等待仍由 [web/src/algorithms/bo/BoPages.tsx](../../web/src/algorithms/bo/BoPages.tsx) 管理。
