export function LearningIntroduction() {
  return <section aria-label="学习目标" className="flex flex-col gap-3">
    <h2 className="text-xl font-semibold">从零理解 Bentley–Ottmann 扫描线</h2>
    <p>目标：能说清何时加入线段、何时发现交点、为什么换序，以及何时退出。线段求交就是找出输入线段共有的点或区间。</p>
    <p>最直接的方法是两两检查：<span className="coordinates">n</span> 条线段要检查 <span className="coordinates">n(n−1)/2</span> 对。扫描线是一条从左向右移动的竖线；只在端点或已发现的交点停下，这些停靠位置叫事件。</p>
    <p>事件队列按先 <span className="coordinates">x</span>、后 <span className="coordinates">y</span> 从小到大保存待处理事件；活动线段是已加入且尚未退出的线段，按从下到上排序。相邻线段指这个顺序里紧挨的两条。</p>
    <p>在普通交叉中，两条线要交换上下位置，交叉前必先相邻。因此在加入、退出或换序后检查新邻居，就能提前发现未来交点，无须每步重查所有配对。</p>
    <p className="text-muted-foreground">统一约定：精确有理数决定交点与排序，像素近似只用于绘图。同 <span className="coordinates">x</span> 的不同事件按 <span className="coordinates">y</span> 依次处理；当前事件处理完成后只更新该位置的顺序，同 <span className="coordinates">x</span> 的其他位置保留各自处理进度。交叉处按紧邻事件右侧的顺序排列。</p>
    <p className="text-muted-foreground">本学习流程讲普通交叉、无交点、相邻检测、同扫描坐标不同位置、端点接触、多线共点、竖直线与部分重叠。竖直线在固定 x 上按 y 从下向上处理；共线重叠用完整闭区间表达。这些预设教学案例不是任意退化输入的生产级实现保证。</p>
    </section>
}

export function LearningReferences() {
  return <section aria-label="学习参考" className="mt-6 flex flex-col gap-2 text-sm">
    <h2 className="font-semibold">继续阅读</h2>
    <a className="underline" href="https://www.cs.umd.edu/class/fall2023/cmsc754/Lects/lect04-intersection.pdf">Dave Mount · CMSC 754 Lecture 4：事件、活动顺序与相邻检测</a>
    <p className="text-muted-foreground">核对依据：讲义的 Plane Sweep、Adjacent-segment rule 与事件处理章节（图 4 的相邻性论证、图 5 的插入、删除与交叉）。讲义先假设一般位置；这里另外明示同 <span className="coordinates">x</span> 端点的处理顺序。其平衡树复杂度结论不等于本演示实现的性能保证。</p>
    <a className="underline" href="https://i11www.iti.kit.edu/_media/teaching/winter2015/compgeom/algogeom-ws15-vl02.pdf">KIT · Line Segment Intersection：闭线段与同点事件归组</a>
    <p className="text-muted-foreground">核对依据：讲义标号 4 定义闭线段，标号 6 按两个坐标确定事件先后，标号 8 的 handleEvent 将开始、结束、内部穿过的线段归组，先报告交点及全部参与者，再移除与重新插入以更新顺序（PDF 第 39–42 页）。讲义从上向下扫描，本页将方向换为从左向右、同 x 时从下向上；对应的是相同的精确字典序规则，不用数值微移。</p>
    <p className="text-muted-foreground">竖直案例沿用上述闭线段、字典序和同点归组规则。图中的竖直状态标记是本页的处理前沿表示，并非扫描线与线段的唯一交点。内部采用可逆精确剪切 (x + s·y, y)，s 的有理数界限由输入坐标推导，保证所有端点及线段交点的原始字典序不变；显示时还原原坐标。这是本实现的保序推导，不将讲义当作该剪切界限的证明，也不用浮点 epsilon 判断几何关系。</p>
    <a className="underline" href="https://github.com/CGAL/cgal/blob/v6.1.1/Kernel_23/doc/Kernel_23/CGAL/intersections.h">CGAL 6.1.1 · 2D Intersections：交集可以是点或线段</a>
    <a className="underline" href="https://github.com/CGAL/cgal/blob/v6.1.1/Surface_sweep_2/doc/Surface_sweep_2/Surface_sweep_2.txt">CGAL 6.1.1 · 2D Intersection of Curves：重叠与退化处理</a>
    <p className="text-muted-foreground">核对依据：CGAL 官方文档源的二维交集表将 Segment_2 与 Segment_2 的非空交集列为 Point_2 或 Segment_2；扫描线文档明确将重叠曲线列入退化情况，并依赖经过认证的几何计算。本页用闭区间公共范围解释预设重叠案例，在较晚起点记录完整区间；这不是 CGAL 的算法复刻，也不把 CGAL 的鲁棒性或复杂度保证移用于本演示。</p>
  </section>
}
