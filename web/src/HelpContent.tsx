export function LearningIntroduction() {
  return <section aria-label="学习目标" className="flex flex-col gap-3">
    <h2 className="text-xl font-semibold">从零理解 Bentley–Ottmann 扫描线</h2>
    <p>目标：能说清何时加入线段、何时发现交点、为什么换序，以及何时退出。线段求交就是找出输入线段共有的点或区间。</p>
    <p>最直接的方法是两两检查：<span className="coordinates">n</span> 条线段要检查 <span className="coordinates">n(n−1)/2</span> 对。扫描线是一条从左向右移动的竖线；只在端点或已发现的交点停下，这些停靠位置叫事件。</p>
    <p>事件队列按先 <span className="coordinates">x</span>、后 <span className="coordinates">y</span> 从小到大保存待处理事件；活动线段是已加入且尚未退出的线段，按从下到上排序。相邻线段指这个顺序里紧挨的两条。</p>
    <p>在普通交叉中，两条线要交换上下位置，交叉前必先相邻。因此在加入、退出或换序后检查新邻居，就能提前发现未来交点，无须每步重查所有配对。</p>
    <p className="text-muted">统一约定：精确有理数决定交点与排序，像素近似只用于绘图。同 <span className="coordinates">x</span> 的不同事件按 <span className="coordinates">y</span> 依次处理；当前事件处理完成后只更新该位置的顺序，同 <span className="coordinates">x</span> 的其他位置保留各自处理进度。交叉处按紧邻事件右侧的顺序排列。</p>
    <p className="text-muted">本学习流程讲普通交叉、无交点、相邻检测、同扫描坐标不同位置、端点接触、多线共点、竖直线与部分重叠。竖直线在固定 x 上按 y 从下向上处理；共线重叠用完整闭区间表达。这些预设教学案例不是任意退化输入的生产级实现保证。</p>
    </section>
}

export function LearningReferences() {
  return <section aria-label="学习参考" className="flex flex-col gap-2 text-sm">
    <h2 className="font-semibold">继续阅读</h2>
    <a className="underline" href="https://www.cs.umd.edu/class/fall2023/cmsc754/Lects/lect04-intersection.pdf">Dave Mount · CMSC 754 Lecture 4：事件、活动顺序与相邻检测</a>
    <p className="text-muted">核对依据：讲义的 Plane Sweep、Adjacent-segment rule 与事件处理章节（图 4 的相邻性论证、图 5 的插入、删除与交叉）。讲义先假设一般位置；这里另外明示同 <span className="coordinates">x</span> 端点的处理顺序。其平衡树复杂度结论不等于本演示实现的性能保证。</p>
    <a className="underline" href="https://i11www.iti.kit.edu/_media/teaching/winter2015/compgeom/algogeom-ws15-vl02.pdf">KIT · Line Segment Intersection：闭线段与同点事件归组</a>
    <p className="text-muted">核对依据：讲义标号 4 定义闭线段，标号 6 按两个坐标确定事件先后，标号 8 的 handleEvent 将开始、结束、内部穿过的线段归组，先报告交点及全部参与者，再移除与重新插入以更新顺序（PDF 第 39–42 页）。讲义从上向下扫描，本页将方向换为从左向右、同 x 时从下向上；对应的是相同的精确字典序规则，不用数值微移。</p>
    <p className="text-muted">竖直案例沿用上述闭线段、字典序和同点归组规则。图中的竖直状态标记是本页的处理前沿表示，并非扫描线与线段的唯一交点。内部采用可逆精确剪切 (x + s·y, y)，s 的有理数界限由输入坐标推导，保证所有端点及线段交点的原始字典序不变；显示时还原原坐标。这是本实现的保序推导，不将讲义当作该剪切界限的证明，也不用浮点 epsilon 判断几何关系。</p>
    <a className="underline" href="https://github.com/CGAL/cgal/blob/v6.1.1/Kernel_23/doc/Kernel_23/CGAL/intersections.h">CGAL 6.1.1 · 2D Intersections：交集可以是点或线段</a>
    <a className="underline" href="https://github.com/CGAL/cgal/blob/v6.1.1/Surface_sweep_2/doc/Surface_sweep_2/Surface_sweep_2.txt">CGAL 6.1.1 · 2D Intersection of Curves：重叠与退化处理</a>
    <p className="text-muted">核对依据：CGAL 官方文档源的二维交集表将 Segment_2 与 Segment_2 的非空交集列为 Point_2 或 Segment_2；扫描线文档明确将重叠曲线列入退化情况，并依赖经过认证的几何计算。本页用闭区间公共范围解释预设重叠案例，在较晚起点记录完整区间；这不是 CGAL 的算法复刻，也不把 CGAL 的鲁棒性或复杂度保证移用于本演示。</p>
  </section>
}

export function SamePointRules() {
  return <section aria-label="同点与并列规则" className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold">同一横坐标，不一定是同一个点</h2>
      <p>按扫描方向区分开始、结束与内部穿过；这三组属于同一个精确几何点，不随中间动作改变。闭线段包含端点：先记录所有参与者的交集，再移除结束者、加入开始者，并排好继续活动者的顺序。</p>
      <p>先比较 x，再比较 y；只有两个坐标都精确相等才归为同一个事件点。同一扫描坐标不等于所有线段共点。队列里的每个点单独处理，同点的全部参与者一起归组。</p>
      <p>事件处理中展示的是更新过程，不能当作完成状态。事件处理完成后，当前点的非竖直继续活动线段按紧邻右侧的上下顺序排列；竖直线则继续走向更高的待处理位置。同 x 的较低位置已处理，较高位置仍保留处理前顺序。因此此时的列表不是整条扫描线统一右移后的顺序。</p>
    </section>
}

export function VerticalRules() {
  return <section aria-label="竖直线处理规则" className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold">竖直线：固定横坐标，逐个处理高度</h2>
      <p>竖直线与扫描线重合为一段，不能用一个普通直线交点代表整段。仍按先 x、后 y 的约定：到下端时加入，在不同高度依次处理交叉和接触，到上端先记录闭线段接触再退出。</p>
      <p>活动列表中的竖直线代表尚未完成的向上处理前沿；图中它的序号标在当前处理高度，而非唯一的扫描线交点。遇到横穿线段时，处理中先保留之前的顺序并记录交集，完成后竖直线排在该穿过者之上，继续检查更高处的新邻居。上端退出后才算整条竖直线处理完毕。</p>
      <p>图中的当前事件、队列和结果均使用原坐标；扫描线可停在同一 x，而当前事件沿 y 上移。完成较低交点不会清空更高的待处理事件。</p>
    </section>
}

export function OverlapRules() {
  return <section aria-label="重叠处理规则" className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold">共线重叠：交集是一段线</h2>
      <p>本案例的 S0 与 S1 都在 y = 0 上，公共范围是 x ∈ [2, 4]。两端之间有无穷多个公共点；普通 BO 的孤立点事件前提在这里不成立，不是上下交换就能处理重叠。</p>
      <p>本例采用区间扩展解释：在较晚起点 (2, 0) 把同点开始者与穿过者归组，取较晚起点和较早终点，一次记录完整闭区间 (2, 0) → (4, 0)。这不是扫描线已经走过整段，而是根据已知端点精确确定完整交集。</p>
      <p>队列仍只含有限的端点事件。重叠起界 (2, 0) 与止界 (4, 0) 本来就是端点，无需为区间内部每个点创建事件。到止界时 S0 退出，S1 继续；已记录的完整区间不缩短，也不再追加一个孤立交点。</p>
      <p>重叠期间两条线段几何并列，活动列表保留各自身份；它们不会像普通交叉那样互换上下位置。这是预设教学案例，不是任意重叠输入的生产级实现保证。</p>
    </section>
}

export function NeighborRules() {
  return <section aria-label="为什么不会漏掉交点" className="flex flex-col gap-3">
      <h2 className="font-semibold">为什么只检查邻居不会漏掉交点？</h2>
        <p>在一般位置下，考虑即将发生的下一处交叉：只有两条线段在内部相交，没有第三条线段同时经过该点，也没有端点与交叉重合。</p>
        <p>越靠近交点，两条线段之间的间隙越小。如果第三条线段一直夹在中间，它就必须也经过这个交点，与没有三线共点的前提矛盾。因此交叉前足够近的位置，两条相交线段必是邻居。</p>
        <p>再往前看最近一次事件：两个事件之间没有端点或交叉，活动线段的成员和上下顺序不变。所以这对线段在上次事件处理后就已经相邻；在产生这一邻接关系时检查并安排交点，就能让扫描线及时停下。</p>
        <p>插入会产生新线段两侧的邻居；删除会让原来分隔的两侧相邻；交叉换序会改变外侧邻居。只检查这些发生变化的边界，不必机械枚举所有线段对。</p>
        <p className="text-muted">适用边界：共端点、端点落在内部、多线共点、竖直线、同一扫描坐标事件与共线重叠需要额外规则。本页普通案例和相邻性论证不能代替这些退化情况的完整处理证明。</p>
    </section>
}

export function EventQueueRules() {
  return <section aria-label="事件队列说明" className="flex flex-col gap-3">
    <h2 className="font-semibold">事件队列</h2>
    <p>先 <span className="coordinates">x</span>，后 <span className="coordinates">y</span>；队首先处理。</p>
    <p>事件队列按先 x、后 y 从小到大保存待处理事件；当前事件从队首取出后单独显示。</p>
  </section>
}

export function ActiveOrderRules({ overlap }: { overlap: boolean }) {
  return <section aria-label="活动线段顺序" className="flex flex-col gap-3">
    <h2 className="font-semibold">活动线段顺序</h2>
    <p>活动线段是已加入且尚未退出的线段，按从下到上排序。相邻线段指这个顺序里紧挨的两条。序号从下到上递增。</p>
    {overlap && <p>重叠成员在同一高度并列；列表位置只用于逐个辨认，不表示它们之间存在上下差别。图中序号也指向同一几何位置。</p>}
  </section>
}
