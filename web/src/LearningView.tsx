import { Fragment, useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { GeometryView } from './GeometryView'
import { formatGeometry, formatPoint, pairName, samePoint, type Intersection, type Point, type Preset, type SweepTrace } from './geometry'
import { Button } from '@heroui/react/button'
import { Card, CardContent, CardHeader, CardTitle } from '@heroui/react/card'
import { Slider } from '@heroui/react/slider'
import { hoverHighlights, type HoverTarget } from './hover'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import { LearningRow } from './LearningMotion'
import { useLearningReducedMotion } from './useLearningReducedMotion'
import { HelpButton } from './CaseHelp'
import './LearningWorkspace.css'
import { useStepPanelScroll } from './useStepPanelScroll'
import { useEventTransfer } from './useEventTransfer'
import { useRoundedBlockSize } from './useRoundedBlockSize'


export function LearningView({ preset, trace, results, index, onStepChange }: {
  preset: Preset; trace: SweepTrace; results: Intersection[]; index: number; onStepChange: (index: number) => void
}) {
  const roundedBlock = useRoundedBlockSize()
  const [navigation, setNavigation] = useState({ from: index, reset: 0 })
  const reducedMotion = useLearningReducedMotion()
  const animationId = useId()
  const [run, setRun] = useState(0)
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const [numbering, setNumbering] = useState<'active' | 'pending' | null>(null)
  const currentPanel = useRef<HTMLDivElement>(null)
  const pendingPanel = useRef<HTMLDivElement>(null)
  const activePanel = useRef<HTMLDivElement>(null)
  const participantsPanel = useRef<HTMLDivElement>(null)
  const explanationPanel = useRef<HTMLDivElement>(null)
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
    <span className="learning-hover-item" data-input-id={id} {...inputProps(id)}>S{id}</span>
  </Fragment>)
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
  const pendingTarget = step.action === 'discover' ? newlyScheduled[0] : undefined
  const activeTarget = step.subjects.find(id => step.active.includes(id))
  const participantTarget = step.subjects.find(id => [...step.starts, ...step.ends, ...step.passes].includes(id))
  useStepPanelScroll(step, run, [
    { panel: currentPanel, reset: true },
    { panel: pendingPanel, reset: step.action === 'initial', selector: pendingTarget ? `[data-event-id="${CSS.escape(formatPoint(pendingTarget))}"]` : undefined },
    { panel: activePanel, reset: step.action === 'initial', selector: activeTarget === undefined ? undefined : `[data-input-id="${activeTarget}"]` },
    { panel: participantsPanel, reset: step.action === 'initial' || step.action === 'take', selector: participantTarget === undefined ? undefined : `[data-input-id="${participantTarget}"]` },
    { panel: explanationPanel, reset: true },
  ])
  const prepareTransfer = useEventTransfer(step, reducedMotion, currentPanel, pendingPanel)
  const changeStep = (value: number | ((current: number) => number), singleStep = false) => {
    setHover(null)
    setNumbering(null)
    const next = Math.max(0, Math.min(trace.steps.length - 1, typeof value === 'function' ? value(index) : value))
    const from = trace.steps[index], to = trace.steps[next]
    if (singleStep && !reducedMotion && next !== index && to.current && from.pending.some(point => samePoint(point, to.current!))) {
      prepareTransfer(formatPoint(to.current), 'current')
    } else if (singleStep && !reducedMotion && next !== index && from.current && to.pending.some(point => samePoint(point, from.current!))) {
      prepareTransfer(formatPoint(from.current), 'pending')
    } else prepareTransfer()
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
  const subjects = inputReferences(step.subjects, ' × ')
  const phase = step.phase === 'initial' ? '准备开始' : step.phase === 'processing' ? '事件处理中' : '事件处理完成'
  return <section aria-label="逐步学习" className="learning-view flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onPress={() => changeStep(current => current - 1, true)} isDisabled={index === 0} render={props => <button {...props} aria-keyshortcuts="ArrowLeft" />}>上一步<kbd aria-hidden="true">←</kbd></Button>
      <Button onPress={() => changeStep(current => current + 1, true)} isDisabled={complete} render={props => <button {...props} aria-keyshortcuts="ArrowRight" />}>下一步<kbd aria-hidden="true">→</kbd></Button>
      <Button variant="outline" onPress={restart} render={props => <button {...props} aria-keyshortcuts="r" />}>重新开始<kbd aria-hidden="true">R</kbd></Button>
    </div>
    <div className="flex flex-col gap-2">
      <span id={`${animationId}-step`} className="text-sm text-muted">拖动浏览教学步骤 · <span className="font-mono whitespace-nowrap">{index} / {trace.steps.length - 1}</span> · {complete ? '学习完成' : phase}</span>
      <Slider aria-label="教学步骤" minValue={0} maxValue={trace.steps.length - 1} step={1} value={index}
        onChange={value => changeStep(typeof value === 'number' ? value : value[0])}>
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb data-testid="teaching-step-thumb" aria-label="教学步骤" aria-describedby={`${animationId}-step`} />
        </Slider.Track>
      </Slider>
    </div>
    <div className="workspace learning-workspace">
      <GeometryView key={run} segments={preset.segments} results={step.results} selected={null}
        highlights={numbering === 'active' ? hoverHighlights({ kind: 'geometry', inputs: step.active, pairs: [] }, []) : highlights ?? (recordedOverlap ? hoverHighlights({ kind: 'pair', pair: pairName(recordedOverlap) }, step.results) : null)} onHover={setHover}
        sweep={{ current: step.current, active: step.active, pending: step.pending, numbering, checked: checkedInputs, discovered: discovered.map(p => ({ point: p, label: pointName(p) })), labelPoint: pointName }} />
      <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:${navigation.reset}:${reducedMotion}`}>
      <aside className="learning-state-panels">
        <div className="learning-event-panels">
        <section ref={roundedBlock} aria-label="当前事件" className="workspace-panel learning-current"><Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle render={props => <h2 {...props} />}>当前事件</CardTitle><HelpButton topic="ties">事件说明</HelpButton></CardHeader>
          <CardContent ref={currentPanel} className="relative flex flex-col gap-2"><p>{phase}</p>
            <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
              {step.current && <LearningRow as="p" key={formatPoint(step.current)} identity={`event:${formatPoint(step.current)}`}
                existed={sources.includes(`event:${formatPoint(step.current)}`)} data-event-id={formatPoint(step.current)} {...eventProps(step.current)}>{pointName(step.current)}</LearningRow>}
            </AnimatePresence>
            {!step.current && <p>尚未处理事件</p>}
          </CardContent>
        </Card></section>
        <section ref={roundedBlock} aria-label="待处理事件队列" className="workspace-panel learning-pending"><Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle render={props => <h2 {...props} />} {...titleProps('pending')}>待处理事件队列</CardTitle><HelpButton topic="events">队列说明</HelpButton></CardHeader>
          <CardContent ref={pendingPanel}>
            <ol className="relative flex list-inside list-decimal flex-col gap-2">
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.pending.map(p => <LearningRow key={formatPoint(p)} identity={`event:${formatPoint(p)}`}
                  existed={sources.includes(`event:${formatPoint(p)}`)} data-event-id={formatPoint(p)} {...eventProps(p)}>{pointName(p)}</LearningRow>)}
              </AnimatePresence>
            </ol>
            {!step.pending.length && <p>空</p>}
          </CardContent>
        </Card></section>
        </div>
        <section ref={roundedBlock} aria-label="活动线段顺序" className="workspace-panel learning-active"><Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle render={props => <h2 {...props} />} {...titleProps('active')}>活动线段顺序</CardTitle><HelpButton topic="active">顺序说明</HelpButton></CardHeader>
          <CardContent ref={activePanel} className="flex flex-col gap-2"><p className="text-sm text-muted">{step.action === 'take' || step.action === 'record' ? '保留该事件处理前顺序' : step.phase === 'processed' ? '当前已处理事件之后的顺序' : '当前教学动作后的顺序，事件尚未处理完成'}</p>
            <div data-testid="active-order"><ol className="relative flex list-inside list-decimal flex-col-reverse gap-2">
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.active.map(id => <LearningRow key={id} identity={`segment:${id}`}
                  existed={sources.includes(`segment:${id}`)} data-input-id={id} data-checked={checkedInputs.includes(id)} {...inputProps(id)}>S{id}</LearningRow>)}
              </AnimatePresence>
            </ol>{!step.active.length && <p>空</p>}</div>
          </CardContent>
        </Card></section>
      </aside>
      </LayoutGroup>
    <section ref={roundedBlock} aria-label="同点参与线段" className="workspace-panel learning-participants"><Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle render={props => <h2 {...props} />}>同点参与线段</CardTitle><HelpButton topic="ties">同点说明</HelpButton></CardHeader>
      <CardContent ref={participantsPanel} className="flex flex-col gap-2">
        {step.current ? <>
          <p>开始：{step.starts.length ? inputReferences(step.starts, '、') : '无'}</p>
          <p>结束：{step.ends.length ? inputReferences(step.ends, '、') : '无'}</p>
          <p>穿过：{step.passes.length ? inputReferences(step.passes, '、') : '无'}</p>
        </> : <p>取出事件后显示同点参与者。</p>}
      </CardContent>
    </Card></section>
    <section ref={roundedBlock} aria-label="操作解释" aria-live="polite" className="workspace-panel learning-explanations"><Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle render={props => <h2 {...props} />}>这一步为什么这样做？</CardTitle><div className="flex flex-wrap gap-2">
        <HelpButton topic="neighbors">相邻性说明</HelpButton>
        {trace.shear.numerator !== '0' && <HelpButton topic="vertical">竖直线说明</HelpButton>}
        {overlaps.length > 0 && <HelpButton topic="overlap">重叠说明</HelpButton>}
      </div></CardHeader>
      <CardContent ref={explanationPanel} className="flex flex-col gap-2">
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
    {complete && <section aria-label="学习结果"><Card>
      <CardHeader><CardTitle render={props => <h2 {...props} />}>学习完成</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2"><p>事件队列与活动顺序均为空，所有线段已退出。</p>
        {overlaps.length ? <p>孤立点结果位置：{points.length}；重叠区间：{visibleOverlaps.length}；相交线段对：{step.results.length}。区间包含无穷多个公共点，不能用孤立交点数量表示。</p> : <p>独立交点位置：{points.length}；相交线段对：{step.results.length}。同一位置可由多个线段对共享。</p>}
        {points.map(point => <p className="coordinates" key={formatPoint(point)}>{pointName(point)}：{step.results.filter(result => result.geometry.type === 'point' && samePoint(result.geometry.point, point)).map(pairName).join('、')}</p>)}
        {visibleOverlaps.map(result => <p className="coordinates" key={pairName(result)}>{formatGeometry(result.geometry)}：{pairName(result)}（包含两端及其间全部点）</p>)}
        {!step.results.length && <p>结果为空：两条线段平行且高度不同，没有交点。</p>}
        <p className="coordinates">独立数学核对：{preset.learning?.verification}</p>
      </CardContent>
    </Card></section>}
      </CardContent>
    </Card></section>
    </div>
  </section>
}
