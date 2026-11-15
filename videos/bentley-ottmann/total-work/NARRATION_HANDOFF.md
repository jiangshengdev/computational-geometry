# 第十集原速配音：待验收材料

最新局部措辞候选与四段前后对照见 [wording-v1](narration-candidates/wording-v1/REVIEW.md)。候选未采用，原始批次和生产源保持不变。

本轮对应 #412 的合成与机器评估部分，基于已审无声版 `b575c2d`。用户仅授权本轮生成与评估，不授权正式采用、同步、导出、发布或关闭工单。第九集的听辨豁免不适用于本集。

## 实际成果与边界

45/45 段原速 WAV，共 **684.4325 秒（11:24.4325）**。音色 `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`；直接保存服务返回的48 kHz、16-bit、单声道 PCM，无裁切或调速。所有文件的格式、完整解码、哈希与已审稿件/SSML指纹均已核对。全部位于 `narration-staging/original-speed/`，不是正式播放素材。

45/45 段机器评估返回成功响应：**Omission 4、Insertion 1、Mispronunciation 44**。这是标记条数，不是错误片段数或已确认错误数。漏读/插入集中在 **TW06、TW21、TW26、TW34**；发音标记涉及26段。共有27段有任一种标记、18段无标记；无标记也不等于实际发音验收。4段对齐需复核，不将缺失时间插值补造。

未实际播放或听辨。本轮没有改已审文稿/读音/字幕/画面，没有接入或更改时间线，生产预览仍是15:07的暂定无声版。停止在候选素材与评估交接，不能称为#412整体完成。

## 证据与续跑

- `request-plan.json`：实际完整SSML、音色、格式与指纹；`manifest.json`：45次合成请求状态，无自动重试。
- 每段 `.wav`：唯一原始音频；`.json` / `.words.json`：哈希、实测时长与原始合成词事件。
- `assessment-manifest.json`、每段 `.assessment-request.json`、`.wav.assessment.json`及其请求记录：完整机器评估证据，未删除异常标记。
- `.aligned.json` 仅保留服务可验证的时间数据，不表示采用；`assessment-summary.json` 由离线 `narration:check-staged` 重新核对生成。
- 评估专用的转换WAV副本已移除；不删原始响应/请求状态来重跑。冻结稿的全文审校仍复用 `src/text-review.json`，不重复改稿。
- 现有共享调度按[微软官方F0限制](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits)执行：合成滚动60秒20次，识别/评估一次一请求；无付费层切换，月度余量未核实。

## 逐段自动标记与完整对照

以下均为“自动标记，待实际整句核实”，不是已听辨确认。时间为服务响应的机器偏移；漏读项的偏移不保证能定位实际声音。WAV与完整口播相邻列出；本轮未作读音修复或试听。

### TW01 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW01.wav) · 10.8000 秒

这四条线段所在的直线不同。却都包含原点。蓝色与橙色两条穿过原点。紫色这一条在这里结束。绿色这一条从这里开始。

自动标记：Mispronunciation「四」（机器偏移0.310s）；Mispronunciation「穿过」（机器偏移5.790s）。


### TW03 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW03.wav) · 14.4400 秒

依次记录这六个不同的原始无序输入对。结果都位于原点。但每对身份分别保留。这里只处理一个事件位置。却已经要输出六条结果。事件少。不代表这一次要做的工作少。

自动标记：Mispronunciation「原始」（机器偏移1.780s）。


### TW04 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW04.wav) · 13.0500 秒

用字母 n 表示原始输入份数。用字母 k 表示相交的原始无序输入对数。每对的完整交集算一条。点和非零闭区间都如此。重合输入仍各算一份。

自动标记：Mispronunciation「原始」（机器偏移1.370s）；Mispronunciation「原始」（机器偏移4.630s）。


### TW05 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW05.wav) · 11.5300 秒

用大写 E 累计处理了多少不同事件位置。用大写 H 把每次参与的不同非零同线组数加起来。同一个组在不同事件参加。要分别计入。

自动标记：Mispronunciation「多少」（机器偏移1.660s）；Mispronunciation「H」（机器偏移4.330s）。


### TW06 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW06.wav) · 16.2700 秒

沿完整位置次序走过七个事件。每次参与的组数依次是一、一、一、四、一、一、一。于是全程事件数是七。累计参与组数是十。相交原始对数是六。原点那一次的局部数目仍然是一、四、六。

自动标记：Mispronunciation「依次」（机器偏移4.010s）；Omission「一」（服务未提供可用时间）；Mispronunciation「七」（机器偏移8.190s）；Mispronunciation「原始」（机器偏移11.530s）。


### TW10 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW10.wav) · 11.5800 秒

每份非零输入至多提供两个端点位置。点输入只提供一个。共享位置合并只会减少数量。所以端点位置至多是原始输入份数的两倍。

自动标记：Mispronunciation「原始」（机器偏移9.950s）。


### TW11 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW11.wav) · 13.5300 秒

其余事件位置来自不同支撑直线上的真实交点。给每个这样的位置选一对在这里相交的原始输入作为见证。不同直线至多有一个交点。所以同一对不能给两个不同位置作见证。

自动标记：Mispronunciation「原始」（机器偏移6.770s）。


### TW12 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW12.wav) · 13.8575 秒

因此。非端点事件位置至多有 k 个。加上端点来源。事件数至多是输入份数的两倍。再加相交原始对数。重叠区间内的无穷多个点。不会各自成为事件。

自动标记：Mispronunciation「原始」（机器偏移8.680s）；Mispronunciation「区间」（机器偏移10.540s）。


### TW13 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW13.wav) · 17.1700 秒

任一事件位置用小写 p 表示。用 h 下标 p 表示这里不同的非零参与组数。处理前经过当前位置的旧活动组与本次开始者所属的组合并。同组只算一次。点输入不算组。结束者报告后才退出。

自动标记：Mispronunciation「这里」（机器偏移4.650s）；Mispronunciation「算」（机器偏移12.510s）。


### TW15 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW15.wav) · 18.3100 秒

至少有两个组时。每组都非空。而且各成员包含当前位置。每两个组各选一份成员。就得到一个真实相交的原始输入对。不同组对选出的原始对不同。因此组对的数量。不超过这一次的跨组新输出数量。

自动标记：Mispronunciation「原始」（机器偏移9.940s）；Mispronunciation「原始」（机器偏移12.870s）。


### TW17 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW17.wav) · 11.6500 秒

只有一个组时。这一个组的贡献计在事件本身。零个组时没有组贡献。例如孤立的点输入事件。点输入需要的输出工作稍后单独计入。

自动标记：Mispronunciation「事件」（机器偏移2.940s）。


### TW18 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW18.wav) · 16.3900 秒

把每次事件的参与组数相加。用大写 H 表示这个和。画面上的求和符号。就是把每个位置对应的量加起来。每个事件保守记一次。再加两倍的跨组新输出总数。就覆盖了零组、单组和多组情况。

自动标记：Mispronunciation「H」（机器偏移3.350s）；Mispronunciation「单」（机器偏移15.150s）。


### TW19 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW19.wav) · 20.2900 秒

上集的跨组唯一报告保证。同一个原始对不会在别的事件再次支付费用。所以全部跨组新输出数不超过 k 这个总数。代入事件数的界。累计参与组数至多是输入份数的两倍。再加相交原始对数的三倍。于是它是输入量与输出量之和的常数倍。

自动标记：Mispronunciation「原始」（机器偏移3.040s）；Mispronunciation「原始」（机器偏移15.610s）。


### TW21 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW21.wav) · 17.1000 秒

当 x 坐标为零时。两个长成员报告一条从零到六的完整重叠区间。当 x 坐标为二时。短成员与两个长成员分别报告一条从二到三的完整重叠区间。前两次事件分别新增一对和两对。

自动标记：Insertion「的」（机器偏移2.360s）；Omission「个」（服务未提供可用时间）；Mispronunciation「次」（机器偏移14.720s）。


### TW23 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW23.wav) · 14.9900 秒

到 x 坐标为六时。两个长成员结束。组才变空。四次事件的新输出依次是一、二、零、零。累计仍是三对。结束事件所做的必要删除另计。但不重新枚举这些旧对。

自动标记：Mispronunciation「四」（机器偏移5.380s）；Mispronunciation「依次」（机器偏移7.060s）。


### TW24 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW24.wav) · 14.7500 秒

用大写 M 下标 p 表示非零参与成员总数。用 t 下标 p 表示这个位置的点输入数。普通计算只在至少有两个组。或者有点输入时。才把相关成员展开成临时列表。

自动标记：Mispronunciation「t」（机器偏移4.440s）。


### TW26 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW26.wav) · 15.4400 秒

只有一个组但有点输入时。每份成员至少产生一个新的点与线段的结果。足够支付展开。只有一个组而没有点输入时。不展开整个旧成员表。零个组时。没有非零成员可展开。

自动标记：Omission「而」（服务未提供可用时间）。


### TW27 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW27.wav) · 15.1200 秒

新同线成员逐个加入。每次访问旧成员。都立即产生一条新结果。每次加入至多做一次空表检查。游标推进也保守按对数成本计费。最后一次失败推进紧随最后一个结果。

自动标记：Mispronunciation「每次」（机器偏移6.390s）；Mispronunciation「一次」（机器偏移12.770s）。


### TW28 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW28.wav) · 15.2700 秒

跨组与点和线段配对时。外层成员访问也由这次新结果支付。点与点按原始无序对输出。没有非零组时。每个点仍有一次外层开销。所有位置的点身份合计至多有 n 份。

自动标记：Mispronunciation「原始」（机器偏移6.510s）。


### TW29 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW29.wav) · 21.1900 秒

每条结果只保存两个身份。以及一个点或两个区间端点。构造与坐标还原需要固定次数的精确操作。全部结果追加按容器的摊还保证累计为输出数的常数倍。扩容移动已经包括在内。临时成员表的创建和销毁。也按已经支付的展开量计入。

自动标记：Mispronunciation「操作」（机器偏移8.680s）；Mispronunciation「追加」（机器偏移10.200s）；Mispronunciation「量」（机器偏移20.600s）。


### TW31 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW31.wav) · 19.4400 秒

每次只定位相遇块。访问参与组和常数个边界。开始身份在全程至多有 n 份。块的移除、过滤和重插按累计参与量计费。不扫描其余活动组。于是总账由事件数、累计参与组数和输入份数共同控制。再乘有序操作的对数成本。

自动标记：Mispronunciation「每次」（机器偏移0.040s）；Mispronunciation「量」（机器偏移9.640s）。


### TW32 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW32.wav) · 18.9900 秒

局部排序只移动组身份。不移动整组成员。固定的精确斜率给出一致次序。采用具有最坏情况下对数乘线性保证的比较排序。每次参与组数不超过输入份数。所以逐次排序成本相加。不超过累计参与组数乘以对数。

自动标记：Mispronunciation「局部」（机器偏移0.050s）。


### TW34 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW34.wav) · 12.7300 秒

每次事件的检查量由参与组数加一控制。累计就是参与组总数与事件数之和的数量级。每次用固定直线和真实覆盖检查候选。不展开两组全部成员对。

自动标记：Mispronunciation「覆盖」（机器偏移9.760s）；Omission「不」（服务未提供可用时间）。


### TW35 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW35.wav) · 12.4000 秒

同一个真实未来位置可能被再次发现。队列只保留一份。但这次查找和尝试仍然收费。尝试总数不超过检查总数。不能只数最后成功新增的位置。

自动标记：Mispronunciation「最后」（机器偏移10.880s）。


### TW38 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW38.wav) · 17.1700 秒

局部组表累计按参与组总数与事件数计费。必要成员表已经由新输出支付。高度缓存按实际访问更新。不每次重算全部组。最后释放几何、组和映射的工作按输入量计。逐条释放结果按输出量计。

自动标记：Mispronunciation「量」（机器偏移14.090s）；Mispronunciation「量」（机器偏移16.590s）。


### TW41 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW41.wav) · 13.2500 秒

回到原点这个事件。定位、局部排序、邻接检查和六条结果。属于普通求交。必要的成员展开和临时表也已经计入。不能把这些必要工作推到教学成本一栏。

自动标记：Mispronunciation「邻接」（机器偏移3.510s）；Mispronunciation「成本」（机器偏移12.410s）。


### TW42 · 原速初始版本

[完整 WAV](narration-staging/original-speed/TW42.wav) · 17.0700 秒

同一次精确比较或算术。成本还取决于数字长度。有理数的分子、分母越长。乘除、比较或约分可能越费时。前面的操作次数界。不能直接当作秒数、固定字节成本或完整的位复杂度定理。

自动标记：Mispronunciation「数」（机器偏移5.420s）；Mispronunciation「成本」（机器偏移15.000s）。


## 本轮离线检查与独立复核

工程 lint/类型、原有内容及停顿映射检查通过；复用的语音/批次/请求窗口测试10项通过。独立检查逐段核对45个WAV的完整PCM帧、哈希、实际SSML及评估响应，15个生产src文件与无声基线一致。汇总中四处漏读的未知时间已保留null，不写成0ms；具体版本和核销见 `narration-staging/original-speed/independent-review.json`。这些检查均不是实际听辨。

## 后续尚未执行

实际整句听辨、疑点核实及任何获准修正；正式素材采用；按原速音频进行字幕与画面同步；#413作者导出和真实成片验收。#407/#412/#413均保持开放。
