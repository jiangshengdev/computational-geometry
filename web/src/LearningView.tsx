import { Fragment, useEffect, useEffectEvent, useId, useState } from 'react'
import { GeometryView } from './GeometryView'
import { formatGeometry, formatPoint, pairName, samePoint, type Intersection, type Point, type Preset, type SweepTrace } from './geometry'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from 'radix-ui'
import { hoverHighlights, type HoverTarget } from './hover'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import { LearningRow } from './LearningMotion'
import { useLearningReducedMotion } from './useLearningReducedMotion'


export function LearningView({ preset, trace, results, index, onStepChange }: {
  preset: Preset; trace: SweepTrace; results: Intersection[]; index: number; onStepChange: (index: number) => void
}) {
  const [navigation, setNavigation] = useState({ from: index, reset: 0 })
  const reducedMotion = useLearningReducedMotion()
  const animationId = useId()
  const [run, setRun] = useState(0)
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const [numbering, setNumbering] = useState<'active' | 'pending' | null>(null)
  const titleProps = (kind: 'active' | 'pending') => ({
    className: 'learning-hover-item leading-normal transition-colors',
    'data-highlighted': numbering === kind,
    onPointerEnter: () => { setHover(null); setNumbering(kind) },
    onPointerLeave: () => setNumbering(null),
  })
  const highlights = hover ? hoverHighlights(hover, []) : null
  const eventProps = (point: Point) => ({
    'data-highlighted': highlights?.points.some(p => samePoint(p, point)) ?? false,
    onPointerEnter: () => setHover({ kind: 'point', point }),
    onPointerLeave: () => setHover(null),
  })
  const inputProps = (id: number) => ({
    'data-highlighted': highlights?.inputs.includes(id) ?? false,
    onPointerEnter: () => setHover({ kind: 'input', index: id }),
    onPointerLeave: () => setHover(null),
  })
  const inputReferences = (ids: number[], separator: string) => ids.map((id, position) => <Fragment key={id}>
    {position > 0 && <span>{separator}</span>}
    <span className="learning-hover-item" {...inputProps(id)}>S{id}</span>
  </Fragment>)
  const changeStep = (value: number | ((current: number) => number), singleStep = false) => {
    setHover(null)
    setNumbering(null)
    const next = Math.max(0, Math.min(trace.steps.length - 1, typeof value === 'function' ? value(index) : value))
    setNavigation(current => ({
      from: index,
      reset: current.reset + (singleStep && !reducedMotion ? 0 : 1),
    }))
    onStepChange(next)
  }
  const restart = () => { changeStep(0); setRun(r => r + 1) }
  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const target = event.target
    if (target instanceof Element && (
      target.closest('input, textarea, select, [role="slider"], [role="combobox"], [role="listbox"], [role="dialog"]')
      || (target instanceof HTMLElement && target.isContentEditable)
    )) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key.toLowerCase() !== 'r') return
    event.preventDefault()
    if (event.repeat) return
    if (event.key === 'ArrowLeft') changeStep(current => current - 1, true)
    else if (event.key === 'ArrowRight') changeStep(current => current + 1, true)
    else restart()
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleShortcut(event)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const step = trace.steps[index]
  const recorded = step.action === 'record' ? step.results.at(-1) : undefined
  const recordedOverlap = recorded?.geometry.type === 'overlap' ? recorded : undefined
  const overlaps = results.filter(result => result.geometry.type === 'overlap')
  const visibleOverlaps = step.results.filter(result => result.geometry.type === 'overlap')
  const checkedInputs = step.action === 'check' || step.action === 'discover' ? step.subjects : []
  let neighborChange: typeof step | undefined
  if (checkedInputs.length) {
    for (let i = index - 1; i >= 0 && trace.steps[i].action !== 'take'; i--) {
      if (['insert', 'remove', 'reorder'].includes(trace.steps[i].action)) {
        neighborChange = trace.steps[i]
        break
      }
    }
  }
  const rowIds = (state: typeof step) => [
    ...[...state.pending, ...(state.current ? [state.current] : [])].map(p => `event:${formatPoint(p)}`),
    ...state.active.map(id => `segment:${id}`),
  ]
  const destinations = rowIds(step)
  const sources = rowIds(trace.steps[navigation.from])
  const before = trace.steps[Math.max(0, index - 1)]
  const complete = index === trace.steps.length - 1
  const points = results.flatMap(result => result.geometry.type === 'point' ? [result.geometry.point] : [])
    .filter((p, i, all) => all.findIndex(other => samePoint(p, other)) === i)
  const pointName = (p: Point) => {
    const endpoints = preset.segments.flatMap((s, id) => [
      ...(samePoint(p, s.start) ? [`S${id} 起点`] : []),
      ...(samePoint(p, s.end) ? [`S${id} 终点`] : []),
    ])
    const boundary = overlaps.flatMap(({ geometry }) => geometry.type === 'overlap' ? [
      ...(samePoint(p, geometry.start) ? ['重叠起界'] : []),
      ...(samePoint(p, geometry.end) ? ['重叠止界'] : []),
    ] : [])
    return `${endpoints.length ? endpoints.join(' / ') : `I${points.findIndex(point => samePoint(point, p))}`} ${formatPoint(p)}${boundary.length ? ` · ${[...new Set(boundary)].join(' / ')}` : ''}`
  }
  const discovered = step.pending.filter(p => points.some(point => samePoint(point, p)))
  const newlyScheduled = discovered.filter(p => !before.pending.some(old => samePoint(old, p)))
  const subjects = inputReferences(step.subjects, ' × ')
  const phase = step.phase === 'initial' ? '准备开始' : step.phase === 'processing' ? '事件处理中' : '事件处理完成'
  return <section aria-label="逐步学习" className="flex flex-col gap-4">
    <p>学习目标：{preset.learning?.goal}</p>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={() => changeStep(current => current - 1, true)} disabled={index === 0} aria-keyshortcuts="ArrowLeft">上一步<kbd aria-hidden="true">←</kbd></Button>
      <Button onClick={() => changeStep(current => current + 1, true)} disabled={complete} aria-keyshortcuts="ArrowRight">下一步<kbd aria-hidden="true">→</kbd></Button>
      <Button variant="outline" onClick={restart} aria-keyshortcuts="r">重新开始<kbd aria-hidden="true">R</kbd></Button>
    </div>
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">拖动浏览教学步骤 · <span className="font-mono whitespace-nowrap">{index} / {trace.steps.length - 1}</span> · {complete ? '学习完成' : phase}</span>
      <Slider.Root min={0} max={trace.steps.length - 1} step={1} value={[index]}
        onValueChange={([value]) => changeStep(value)}
        className="relative flex h-8 w-full touch-none select-none items-center">
        <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
          <Slider.Range className="absolute h-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb aria-label="教学步骤" aria-valuetext={`第 ${index} 步，共 ${trace.steps.length - 1} 步`}
          className="block size-5 shrink-0 rounded-full border border-primary bg-background shadow-sm ring-ring/50 hover:ring-4 focus-visible:outline-hidden focus-visible:ring-4" />
      </Slider.Root>
    </div>
    <div className="workspace">
      <GeometryView key={run} segments={preset.segments} results={step.results} selected={null}
        highlights={numbering === 'active' ? hoverHighlights({ kind: 'geometry', inputs: step.active, pairs: [] }, []) : highlights ?? (recordedOverlap ? hoverHighlights({ kind: 'pair', pair: pairName(recordedOverlap) }, step.results) : null)} onHover={setHover}
        sweep={{ current: step.current, active: step.active, pending: step.pending, numbering, checked: checkedInputs, discovered: discovered.map(p => ({ point: p, label: pointName(p) })), labelPoint: pointName }} />
      <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:${navigation.reset}:${reducedMotion}`}>
      <aside className="flex min-w-0 flex-col gap-4">
        <section aria-label="当前事件"><Card>
          <CardHeader><CardTitle><h2>当前事件</h2></CardTitle></CardHeader>
          <CardContent className="relative flex flex-col gap-2"><p>{phase}</p>
            <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
              {step.current && <LearningRow as="p" key={formatPoint(step.current)} identity={`event:${formatPoint(step.current)}`}
                existed={sources.includes(`event:${formatPoint(step.current)}`)} {...eventProps(step.current)}>{pointName(step.current)}</LearningRow>}
            </AnimatePresence>
            {!step.current && <p>尚未处理事件</p>}
          </CardContent>
        </Card></section>
        <section aria-label="待处理事件队列"><Card>
          <CardHeader><CardTitle><h2 {...titleProps('pending')}>待处理事件队列</h2></CardTitle></CardHeader>
          <CardContent><p className="mb-2 text-sm text-muted-foreground">先 <span className="coordinates">x</span>，后 <span className="coordinates">y</span>；队首先处理</p>
            <ol className="relative flex list-inside list-decimal flex-col gap-2">
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.pending.map(p => <LearningRow key={formatPoint(p)} identity={`event:${formatPoint(p)}`}
                  existed={sources.includes(`event:${formatPoint(p)}`)} {...eventProps(p)}>{pointName(p)}</LearningRow>)}
              </AnimatePresence>
            </ol>
            {!step.pending.length && <p>空</p>}
          </CardContent>
        </Card></section>
        <section aria-label="活动线段顺序"><Card>
          <CardHeader><CardTitle><h2 {...titleProps('active')}>活动线段顺序</h2></CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2"><p className="text-sm text-muted-foreground">序号从下到上递增 · {step.action === 'take' || step.action === 'record' ? '保留该事件处理前顺序' : step.phase === 'processed' ? '当前已处理事件之后的顺序' : '当前教学动作后的顺序，事件尚未处理完成'}</p>
            {overlaps.length > 0 && <p className="text-sm text-muted-foreground">重叠成员在同一高度并列；列表位置只用于逐个辨认，不表示它们之间存在上下差别。图中序号也指向同一几何位置。</p>}
            <div data-testid="active-order"><ol className="relative flex list-inside list-decimal flex-col-reverse gap-2">
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.active.map(id => <LearningRow key={id} identity={`segment:${id}`}
                  existed={sources.includes(`segment:${id}`)} data-checked={checkedInputs.includes(id)} {...inputProps(id)}>S{id}</LearningRow>)}
              </AnimatePresence>
            </ol>{!step.active.length && <p>空</p>}</div>
          </CardContent>
        </Card></section>
      </aside>
      </LayoutGroup>
    </div>
    <section aria-label="同点参与线段"><Card>
      <CardHeader><CardTitle><h2>同点参与线段</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        {step.current ? <>
          <p>开始：{step.starts.length ? inputReferences(step.starts, '、') : '无'}</p>
          <p>结束：{step.ends.length ? inputReferences(step.ends, '、') : '无'}</p>
          <p>穿过：{step.passes.length ? inputReferences(step.passes, '、') : '无'}</p>
        </> : <p>取出事件后显示同点参与者。</p>}
        <p className="text-sm text-muted-foreground">按扫描方向区分开始、结束与内部穿过；这三组属于同一个精确几何点，不随中间动作改变。闭线段包含端点：先记录所有参与者的交集，再移除结束者、加入开始者，并排好继续活动者的顺序。</p>
      </CardContent>
    </Card></section>
    <section aria-label="同点与并列规则" className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold">同一横坐标，不一定是同一个点</h2>
      <p>先比较 x，再比较 y；只有两个坐标都精确相等才归为同一个事件点。同一扫描坐标不等于所有线段共点。队列里的每个点单独处理，同点的全部参与者一起归组。</p>
      <p>事件处理中展示的是更新过程，不能当作完成状态。事件处理完成后，当前点的非竖直继续活动线段按紧邻右侧的上下顺序排列；竖直线则继续走向更高的待处理位置。同 x 的较低位置已处理，较高位置仍保留处理前顺序。因此此时的列表不是整条扫描线统一右移后的顺序。</p>
    </section>
    {trace.shear.numerator !== '0' && <section aria-label="竖直线处理规则" className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold">竖直线：固定横坐标，逐个处理高度</h2>
      <p>竖直线与扫描线重合为一段，不能用一个普通直线交点代表整段。仍按先 x、后 y 的约定：到下端时加入，在不同高度依次处理交叉和接触，到上端先记录闭线段接触再退出。</p>
      <p>活动列表中的竖直线代表尚未完成的向上处理前沿；图中它的序号标在当前处理高度，而非唯一的扫描线交点。遇到横穿线段时，处理中先保留之前的顺序并记录交集，完成后竖直线排在该穿过者之上，继续检查更高处的新邻居。上端退出后才算整条竖直线处理完毕。</p>
      <p>图中的当前事件、队列和结果均使用原坐标；扫描线可停在同一 x，而当前事件沿 y 上移。完成较低交点不会清空更高的待处理事件。</p>
    </section>}
    {overlaps.length > 0 && <section aria-label="重叠处理规则" className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold">共线重叠：交集是一段线</h2>
      <p>本案例的 S0 与 S1 都在 y = 0 上，公共范围是 x ∈ [2, 4]。两端之间有无穷多个公共点；普通 BO 的孤立点事件前提在这里不成立，不是上下交换就能处理重叠。</p>
      <p>本例采用区间扩展解释：在较晚起点 (2, 0) 把同点开始者与穿过者归组，取较晚起点和较早终点，一次记录完整闭区间 (2, 0) → (4, 0)。这不是扫描线已经走过整段，而是根据已知端点精确确定完整交集。</p>
      <p>队列仍只含有限的端点事件。重叠起界 (2, 0) 与止界 (4, 0) 本来就是端点，无需为区间内部每个点创建事件。到止界时 S0 退出，S1 继续；已记录的完整区间不缩短，也不再追加一个孤立交点。</p>
      <p>重叠期间两条线段几何并列，活动列表保留各自身份；它们不会像普通交叉那样互换上下位置。这是预设教学案例，不是任意重叠输入的生产级实现保证。</p>
    </section>}
    <section aria-label="操作解释" aria-live="polite"><Card>
      <CardHeader><CardTitle><h2>这一步为什么这样做？</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        {step.action === 'initial' && <p>先把所有端点放入事件队列，同一点只保留一个事件。端点接触的位置因此已在队列中，但交集要到处理该点时才记录；其他尚未发现的内部交点不预先加入。活动顺序为空，点击下一步取出最早事件。</p>}
        {step.action === 'take' && <p>从队首取出 <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>，扫描线停在此处。当前事件已离开待处理队列；此刻还没有加入、退出或换序，下一步才执行更新。</p>}
        {step.action === 'insert' && <p>加入 <span className="coordinates">{subjects}</span>：扫描线到达其起点，此后它参与活动顺序。{step.passes.length > 1 && '本步已将开始者与穿过者一起排成紧邻事件右侧的顺序，穿过者的换序也已显示；这仍是同一事件的处理中状态。'}接下来检查新邻居是否会在未来相交。</p>}
        {step.action === 'remove' && <p>退出 <span className="coordinates">{subjects}</span>：扫描线到达其终点，后续不再与它相交；检查删除后是否出现新邻居。{visibleOverlaps.some(({ geometry }) => geometry.type === 'overlap' && step.current && samePoint(geometry.end, step.current)) && '此处是重叠止界：较早结束者退出，另一条线段继续。交集包含这个边界；保留已记录的完整区间，不再把止界重复记成孤立交点。'}</p>}
        {step.action === 'record' && (recordedOverlap ? <p>记录重叠区间 <span className="coordinates">{formatGeometry(recordedOverlap.geometry)}</span>：参与线段 <span className="coordinates">{inputReferences(recordedOverlap.segments, ' × ')}</span> 从当前较晚起点开始重合，到较早终点为止。取两个闭区间的公共范围，包含两端及其间全部点，不是只记录当前端点。橙色线段和两个端点标出完整交集；活动顺序尚未更新，下一步加入开始者。</p> : <p>记录 <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>：参与线段 <span className="coordinates">{subjects}</span> {step.subjects.every(id => step.passes.includes(id)) ? '在这里交叉。' : '在这里接触。闭线段包含端点，从哪一侧接近都不能忽略这个交集。'}交集已记入结果，活动顺序尚未更新。{step.starts.length + step.ends.length + step.passes.length > 2 && '这里逐对记录的是同一个几何点的相交配对，不是多个交点；全部参与者见同点分组，整个事件尚未完成。'}</p>)}
        {step.action === 'reorder' && <p>换序为 <span className="coordinates">{inputReferences(step.active, ' → ')}</span>：本事件非竖直参与者按紧邻事件右侧从下到上的顺序排列，竖直参与者移到本点穿过者上方，继续向更高处处理，再检查新邻居。{step.starts.length > 0 && '本点有开始者，换序已随加入一起展示；此步说明该顺序，没有再次交换。'}同 x 的其他事件点保留各自处理进度。</p>}
        {step.action === 'check' && <p>检查相邻线段 <span className="coordinates">{subjects}</span>：
          {neighborChange?.action === 'insert' && <>加入 {neighborChange.subjects.map(id => `S${id}`).join('、')} 后，这一对处在新插入线段的边界，成为需要检查的新邻居。</>}
          {neighborChange?.action === 'remove' && <>退出 {neighborChange.subjects.map(id => `S${id}`).join('、')} 后，原来隔在中间的线段消失，两侧线段成为新邻居。</>}
          {neighborChange?.action === 'reorder' && <>交叉的 {neighborChange.subjects.map(id => `S${id}`).join(' 与 ')} 换序后，这一对处在换序区间的外侧边界，成为新邻居。</>}
          其他未改变的邻接关系无需重查。图中加粗线段与状态列表边框标出当前配对；此步选定检查配对，尚未改变队列。端点事件可能已经在队列中，接触点无需重复入队。</p>}
        {step.action === 'discover' && <p>发现未来交点 <span className="coordinates">{newlyScheduled.map((point, position) => <Fragment key={formatPoint(point)}>
          {position > 0 && <span>、</span>}
          <span className="learning-hover-item" {...eventProps(point)}>{pointName(point)}</span>
        </Fragment>)}</span>：检查 <span className="coordinates">{subjects}</span> 的精确交集后加入队列，等扫描线到达再记录结果。</p>}
        {step.action === 'complete' && <p>事件处理完成：活动顺序和待处理队列保持一致。{before.action === 'check' ? '没有需要加入队列的未来交点。' : '本事件的教学动作已完成，下一步处理队首事件。'}</p>}
      </CardContent>
    </Card></section>
    {complete && <section aria-label="学习结果"><Card>
      <CardHeader><CardTitle><h2>学习完成</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2"><p>事件队列与活动顺序均为空，所有线段已退出。</p>
        {overlaps.length ? <p>孤立点结果位置：{points.length}；重叠区间：{visibleOverlaps.length}；相交线段对：{step.results.length}。区间包含无穷多个公共点，不能用孤立交点数量表示。</p> : <p>独立交点位置：{points.length}；相交线段对：{step.results.length}。同一位置可由多个线段对共享。</p>}
        {points.map(point => <p className="coordinates" key={formatPoint(point)}>{pointName(point)}：{step.results.filter(result => result.geometry.type === 'point' && samePoint(result.geometry.point, point)).map(pairName).join('、')}</p>)}
        {visibleOverlaps.map(result => <p className="coordinates" key={pairName(result)}>{formatGeometry(result.geometry)}：{pairName(result)}（包含两端及其间全部点）</p>)}
        {!step.results.length && <p>结果为空：两条线段平行且高度不同，没有交点。</p>}
        <p className="coordinates">独立数学核对：{preset.learning?.verification}</p>
      </CardContent>
    </Card></section>}
    <section aria-label="为什么不会漏掉交点"><Card>
      <CardHeader><CardTitle><h2>为什么只检查邻居不会漏掉交点？</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p>在一般位置下，考虑即将发生的下一处交叉：只有两条线段在内部相交，没有第三条线段同时经过该点，也没有端点与交叉重合。</p>
        <p>越靠近交点，两条线段之间的间隙越小。如果第三条线段一直夹在中间，它就必须也经过这个交点，与没有三线共点的前提矛盾。因此交叉前足够近的位置，两条相交线段必是邻居。</p>
        <p>再往前看最近一次事件：两个事件之间没有端点或交叉，活动线段的成员和上下顺序不变。所以这对线段在上次事件处理后就已经相邻；在产生这一邻接关系时检查并安排交点，就能让扫描线及时停下。</p>
        <p>插入会产生新线段两侧的邻居；删除会让原来分隔的两侧相邻；交叉换序会改变外侧邻居。只检查这些发生变化的边界，不必机械枚举所有线段对。</p>
        <p className="text-muted-foreground">适用边界：共端点、端点落在内部、多线共点、竖直线、同一扫描坐标事件与共线重叠需要额外规则。本页普通案例和相邻性论证不能代替这些退化情况的完整处理证明。</p>
      </CardContent>
    </Card></section>
  </section>
}
