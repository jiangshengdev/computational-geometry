import { Fragment, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CircleHelp, Crosshair, ListOrdered, ListTree, Waypoints } from 'lucide-react'
import { GeometryView } from './GeometryView'
import { formatGeometry, formatPoint, pairName, samePoint, type Intersection, type Point, type Preset, type SweepTrace } from './geometry'
import { Button } from '@heroui/react/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heroui/react/card'
import { Chip } from '@heroui/react/chip'
import { Slider } from '@heroui/react/slider'
import { hoverHighlights, useHoverTarget } from './hover'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import { LearningRow } from './LearningMotion'
import { useLearningReducedMotion } from './useLearningReducedMotion'
import { HelpButton } from './CaseHelp'
import './LearningWorkspace.css'
import { useStepPanelScroll } from './useStepPanelScroll'
import { useEventTransfer } from './useEventTransfer'
import { eventSide } from './eventSide'
import { usePageShortcut } from './usePageShortcut'
import { ExecutionPanel } from './ExecutionPanel'
import { LearningDock } from './LearningDock'
import { LearningSplit } from './LearningSplit'


export function LearningView({ preset, trace, results, index, onStepChange, onStepPreview }: {
  preset: Preset; trace: SweepTrace; results: Intersection[]; index: number; onStepChange: (index: number) => void; onStepPreview: (index: number) => void
}) {
  const [navigation, setNavigation] = useState({ from: index, reset: 0 })
  const keyboardScrub = useRef(false)
  const keyboardStep = useRef<number | null>(null)
  const finishKeyboardScrub = () => {
    keyboardScrub.current = false
    const next = keyboardStep.current
    keyboardStep.current = null
    if (next !== null) onStepChange(next)
  }
  const reducedMotion = useLearningReducedMotion()
  const animationId = useId()
  const [run, setRun] = useState(0)
  const [hover, setHover] = useHoverTarget()
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
  const highlights = hover ? hoverHighlights(hover, hover.kind === 'pair' ? trace.steps[index].results : []) : null
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
  const pointInputs = step.starts.filter(id => step.ends.includes(id))
  const recorded = step.action === 'record' ? step.results.at(-1) : undefined
  const recordedOverlap = recorded?.geometry.type === 'overlap' ? recorded : undefined
  const overlaps = results.filter(result => result.geometry.type === 'overlap')
  const visibleOverlaps = step.results.filter(result => result.geometry.type === 'overlap')
  const endingOverlaps = visibleOverlaps.filter(({ geometry }) => geometry.type === 'overlap' && step.current && samePoint(geometry.end, step.current))
  const continuingOverlapInputs = [...new Set(endingOverlaps.flatMap(result => result.segments))].filter(id => !step.ends.includes(id))
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
  const eventStart = trace.steps.findLastIndex((state, position) => position <= index && state.action === 'take')
  const eventSteps = step.action === 'complete' ? trace.steps.slice(eventStart, index + 1) : []
  const checkedWithoutDiscovery = eventSteps.some(state => state.action === 'check') && !eventSteps.some(state => state.action === 'discover')
  const previousEntry = trace.steps.findLastIndex((state, position) => position < index && state.execution.entry)
  const nextEntry = trace.steps.findIndex((state, position) => position > index && state.execution.entry)
  // A pop changes the queue, not the displayed sweep position. Keep its side too.
  const geometryIndex = trace.steps.findLastIndex((state, position) => position <= index && ((state.execution.module === 'activity' && !state.execution.entry && (state.execution.boundary === 7 || state.active.join(',') !== trace.steps[position - 1]?.active.join(','))) || !['take-entry', 'take-pop', 'take-empty', 'micro'].includes(state.action)))
  const geometryStep = trace.steps[geometryIndex]
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
  const changeStep = (value: number | ((current: number) => number), singleStep = false, preview = false) => {
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
    if (preview) onStepPreview(next)
    else onStepChange(next)
  }
  const restart = () => { changeStep(0); setRun(r => r + 1) }
  usePageShortcut((event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key.toLowerCase() !== 'r') return
    event.preventDefault()
    if (event.repeat) return
    if (event.key === 'ArrowLeft') changeStep(current => current - 1, true)
    else if (event.key === 'ArrowRight') changeStep(current => current + 1, true)
    else restart()
  })
  const subjects = inputReferences(step.subjects, ' × ')
  const phase = step.phase === 'initial' ? complete ? '学习完成' : '准备开始' : step.phase === 'processing' ? '事件处理中' : '事件处理完成'
  const explanations = <section aria-label="操作解释" aria-live="polite" className="learning-panel learning-explanations"><Card className="learning-panel-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle render={props => <h2 {...props} />}>这一步为什么这样做？</CardTitle><CardDescription>结合画布与各项状态，理解当前教学动作。</CardDescription></div><div className="flex flex-wrap gap-2">
        <HelpButton topic="neighbors">相邻性说明</HelpButton>
        {trace.shear.numerator !== '0' && <HelpButton topic="vertical">竖直线说明</HelpButton>}
        {overlaps.length > 0 && <HelpButton topic="overlap">重叠说明</HelpButton>}
      </div></CardHeader>
      <CardContent ref={explanationPanel} className="learning-panel-content flex flex-col gap-2">
        {step.action === 'initial' && (!preset.segments.length ? <p>没有输入，因此没有端点和事件。队列与活动顺序为空，可以逐小步观察取事件返回 None 并退出循环。</p> : <p>先把所有端点放入事件队列，同一点只保留一个事件。端点接触的位置因此已在队列中，但交集要到处理该点时才记录；其他尚未发现的内部交点不预先加入。活动顺序为空，点击下一步进入取事件模块。</p>)}
        {step.action === 'take' && <p>从队首取出 <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>，扫描线停在此处。当前事件已离开待处理队列；此刻还没有加入、退出或换序。先核对同点参与者并逐对记录交集，再按真实动作更新活动顺序。</p>}
        {step.action === 'take-entry' && <p>进入取事件模块，尚未执行第一条核心语句。当前事件与画布保留上一步状态；下一小步将取出队首事件。</p>}
        {step.action === 'take-pop' && <p>已执行 queue.pop_first()，返回值保存在 next 中。尚未匹配和绑定 point、event，所以画布仍保留上一步位置。这是模块中间状态。</p>}
        {step.action === 'take-empty' && <p>next 为 None，事件队列已空，退出扫描循环。学习完成。</p>}
        {step.action === 'micro' && <p>算法小步 · 中间状态。代码执行边界、核心变量与当前画布来自同一执行时刻；同点分组仅是事件教学摘要。</p>}
        {pointInputs.length > 0 && <p>零长度点 <span className="coordinates">{inputReferences(pointInputs, '、')}</span> 的两个端点重合，所以同时属于开始和结束，不进入持续活动顺序。它们只在当前精确位置参与配对：位于线段内部或闭端点都算接触；重合点仍保留独立输入身份。没有配对的点事件也会正常完成。</p>}
        {step.action === 'insert' && <p>加入 <span className="coordinates">{subjects}</span>：扫描线到达其起点，此后它参与活动顺序。{step.passes.length > 1 && '本步已将开始者与穿过者一起排成紧邻事件右侧的顺序，穿过者的换序也已显示；这仍是同一事件的处理中状态。本点有非零长度开始者，换序与加入是同一次更新，不会再次交换。'}接下来检查新邻居是否会在未来相交。</p>}
        {step.action === 'remove' && <p>退出 <span className="coordinates">{subjects}</span>：扫描线到达其终点，后续不再与它相交；检查删除后是否出现新邻居。{endingOverlaps.length > 0 && <>此处是重叠止界：{continuingOverlapInputs.length ? <>{inputReferences(continuingOverlapInputs, '、')} 继续，当前结束者退出。</> : '这些配对的成员均在此结束。'}交集包含这个边界；保留已记录的完整区间，不再把止界重复记成孤立交点。</>}</p>}
        {step.action === 'record' && (recordedOverlap ? <p>记录重叠区间 <span className="coordinates">{formatGeometry(recordedOverlap.geometry)}</span>：参与线段 <span className="coordinates">{inputReferences(recordedOverlap.segments, ' × ')}</span> 从当前较晚起点开始重合，到较早终点为止。取两个闭区间的公共范围，包含两端及其间全部点，不是只记录当前端点。这是根据已知端点确定完整交集，并非扫描线已走完整段。橙色线段和两个端点标出完整交集；活动顺序尚未更新，同点配对全部记录后再处理成员变化。</p> : <p>记录 <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>：参与线段 <span className="coordinates">{subjects}</span> {step.subjects.every(id => step.passes.includes(id)) ? '在这里交叉。' : '在这里接触。闭线段包含端点，从哪一侧接近都不能忽略这个交集。'}交集已记入结果，活动顺序尚未更新。{new Set([...step.starts, ...step.ends, ...step.passes]).size > 2 && '这里逐对记录的是同一个几何点的相交配对，不是多个交点；全部参与者见同点分组，整个事件尚未完成。'}</p>)}
        {visibleOverlaps.length > 0 && <p>重叠成员在公共范围内几何并列，列表保留各自输入身份，不表示彼此上下交换。内部的其他事件不切碎已记录的完整区间。</p>}
        {step.action === 'reorder' && <p>换序为 <span className="coordinates">{inputReferences(step.active, ' → ')}</span>：本事件非竖直参与者按紧邻事件右侧从下到上的顺序排列，竖直参与者移到本点穿过者上方，继续向更高处处理，再检查新邻居。同 x 的其他事件点保留各自处理进度。</p>}
        {step.action === 'check' && <p>检查相邻线段 <span className="coordinates">{subjects}</span>：
          {neighborChange?.action === 'insert' && <>加入 {neighborChange.subjects.map(id => `S${id}`).join('、')} 后，这一对处在新插入线段的边界，成为需要检查的新邻居。</>}
          {neighborChange?.action === 'remove' && <>退出 {neighborChange.subjects.map(id => `S${id}`).join('、')} 后，原来隔在中间的线段消失，两侧线段成为新邻居。</>}
          {neighborChange?.action === 'reorder' && <>交叉的 {neighborChange.subjects.map(id => `S${id}`).join(' 与 ')} 换序后，这一对处在换序区间的外侧边界，成为新邻居。</>}
          其他未改变的邻接关系无需重查。图中加粗线段与状态列表边框标出当前配对；此步选定检查配对，尚未改变队列。端点事件可能已经在队列中，接触点无需重复入队。</p>}
        {step.action === 'discover' && <p>发现未来交点 <span className="coordinates">{newlyScheduled.map((point, position) => <Fragment key={formatPoint(point)}>
          {position > 0 && <span>、</span>}
          <span className="learning-hover-item" {...eventProps(point)}>{pointName(point)}</span>
        </Fragment>)}</span>：检查 <span className="coordinates">{subjects}</span> 的精确交集后加入队列，等扫描线到达再记录结果。</p>}
        {step.action === 'complete' && <p>事件处理完成：活动顺序和待处理队列保持一致。{complete ? '全部事件已处理，无需再推进。' : checkedWithoutDiscovery ? '没有需要加入队列的未来交点。' : '本事件的教学动作已完成，下一步处理队首事件。'}</p>}
    {complete && <section aria-label="学习结果"><Card variant="transparent">
      <CardHeader><CardTitle render={props => <h2 {...props} />}>学习完成</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2"><p>事件队列与活动顺序均为空，全部输入已处理完毕；零长度点无需加入或退出活动顺序。</p>
        {overlaps.length ? <p>点类型结果位置：{points.length}；重叠区间：{visibleOverlaps.length}；相交线段对：{step.results.length}。点类型配对结果不等于整体交集中的孤立点，它们也可能位于已记录的重叠区间上。区间包含无穷多个公共点，各配对保持独立，不计算几何并集。</p> : <p>独立交点位置：{points.length}；相交线段对：{step.results.length}。同一位置可由多个线段对共享。</p>}
        {points.map(point => <p className="coordinates" key={formatPoint(point)}>{pointName(point)}：{step.results.filter(result => result.geometry.type === 'point' && samePoint(result.geometry.point, point)).map(pairName).join('、')}</p>)}
        {visibleOverlaps.map(result => <p className="coordinates" key={pairName(result)}>{formatGeometry(result.geometry)}：{pairName(result)}（包含两端及其间全部点）</p>)}
        {!step.results.length && <p>结果为空：没有相交的独立输入配对。具体几何依据见下方数学核对。</p>}
        <p className="coordinates">独立数学核对：{preset.learning?.verification}</p>
      </CardContent>
    </Card></section>}
      </CardContent>
    </Card></section>
  const currentEvent = <section aria-label="当前事件" className="learning-panel learning-current"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle render={props => <h2 {...props} />}>当前事件</CardTitle><CardDescription>{phase}</CardDescription></div><HelpButton topic="ties">事件说明</HelpButton></CardHeader>
          <CardContent ref={currentPanel} className="learning-panel-content relative flex flex-col gap-1">
            <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:current:${navigation.reset}:${reducedMotion}`}>
            <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
              {step.current && <LearningRow as="p" key={formatPoint(step.current)} identity={`event:${formatPoint(step.current)}`}
                existed={sources.includes(`event:${formatPoint(step.current)}`)} data-event-id={formatPoint(step.current)} {...eventProps(step.current)}>{pointName(step.current)}</LearningRow>}
            </AnimatePresence>
            </LayoutGroup>
            {!step.current && <p>{complete ? '没有事件' : '尚未处理事件'}</p>}
          </CardContent>
        </Card></section>
  const participants = <section aria-label="同点参与线段" className="learning-panel learning-participants"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />}>同点参与线段</CardTitle><HelpButton topic="ties">同点说明</HelpButton></CardHeader>
          <CardContent ref={participantsPanel} className="learning-panel-content flex flex-col gap-1">
            {step.current ? <>
              <p>开始：{step.starts.length ? inputReferences(step.starts, '、') : '无'}</p>
              <p>结束：{step.ends.length ? inputReferences(step.ends, '、') : '无'}</p>
              <p>穿过：{step.passes.length ? inputReferences(step.passes, '、') : '无'}</p>
            </> : <p>取出事件后显示同点参与者。</p>}
          </CardContent>
        </Card></section>
  const pendingEvents = <section aria-label="待处理事件队列" className="learning-panel learning-pending"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />} {...titleProps('pending')}>待处理事件队列</CardTitle><HelpButton topic="events">队列说明</HelpButton></CardHeader>
          <CardContent ref={pendingPanel} className="learning-panel-content">
            <ol className="relative flex list-inside list-decimal flex-col gap-1">
              <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:pending:${navigation.reset}:${reducedMotion}`}>
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.pending.map(p => <LearningRow key={formatPoint(p)} identity={`event:${formatPoint(p)}`}
                  existed={sources.includes(`event:${formatPoint(p)}`)} data-event-id={formatPoint(p)} {...eventProps(p)}>{pointName(p)}</LearningRow>)}
              </AnimatePresence>
              </LayoutGroup>
            </ol>
            {!step.pending.length && <p>空</p>}
          </CardContent>
        </Card></section>
  const activeSegments = <section aria-label="活动线段顺序" className="learning-panel learning-active"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />} {...titleProps('active')}>活动线段顺序</CardTitle><HelpButton topic="active">顺序说明</HelpButton></CardHeader>
          <CardContent ref={activePanel} className="learning-panel-content flex flex-col gap-1"><p className="text-sm text-muted">{step.action === 'take' || step.action === 'record' ? '保留该事件处理前顺序' : step.phase === 'processed' ? '当前已处理事件之后的顺序' : '当前教学动作后的顺序，事件尚未处理完成'}</p>
            <div data-testid="active-order"><ol className="relative flex list-inside list-decimal flex-col-reverse gap-1">
              <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:active:${navigation.reset}:${reducedMotion}`}>
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.active.map(id => <LearningRow key={id} identity={`segment:${id}`}
                  existed={sources.includes(`segment:${id}`)} data-input-id={id} data-checked={checkedInputs.includes(id)} {...inputProps(id)}>S{id}</LearningRow>)}
              </AnimatePresence>
              </LayoutGroup>
            </ol>{!step.active.length && <p>空</p>}</div>
          </CardContent>
        </Card></section>
  return <section aria-label="逐步学习" className="learning-view">
    <div className="learning-workspace">
      <LearningDock side="left" panels={[
        { id: 'participants', name: '同点参与线段', icon: Waypoints, content: participants },
        { id: 'active', name: '活动线段顺序', icon: ListOrdered, content: activeSegments },
      ]} />
      <LearningSplit canvas={
        <GeometryView key={run} segments={preset.segments} results={step.results} selected={null} hoverTarget={hover}
          highlights={numbering === 'active' ? hoverHighlights({ kind: 'geometry', inputs: step.active, pairs: [] }, []) : highlights ?? (recordedOverlap ? hoverHighlights({ kind: 'pair', pair: pairName(recordedOverlap) }, step.results) : null)} onHover={setHover}
          sweep={{ step: index, current: step.current, side: eventSide(geometryStep, trace.steps[geometryIndex + 1]), participants: [...step.starts, ...step.ends, ...step.passes], active: step.active, pending: step.pending, numbering, checked: checkedInputs, discovered: discovered.map(p => ({ point: p, label: pointName(p) })), labelPoint: pointName }} />
      } debuggerPanel={<ExecutionPanel step={step} previous={before} shear={trace.shear} values={trace.values} />} />
      <LearningDock side="right" panels={[
        { id: 'current', name: '当前事件', icon: Crosshair, content: currentEvent },
        { id: 'pending', name: '待处理事件队列', icon: ListTree, content: pendingEvents },
        { id: 'explanations', name: '操作解释', icon: CircleHelp, content: explanations },
      ]} />
    </div>
    <section aria-label="回放控制" className="learning-replay-controls">
      <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onPress={() => changeStep(previousEntry)} isDisabled={previousEntry < 0}>上一个大步</Button>
            <Button variant="secondary" size="sm" onPress={() => changeStep(current => current - 1, true)} isDisabled={index === 0} render={props => <button {...props} aria-keyshortcuts="ArrowLeft" />}>上一步<Chip color="accent" variant="soft" size="sm" aria-hidden="true"><ArrowLeft size={14} /></Chip></Button>
            <Button variant="primary" size="sm" onPress={() => changeStep(current => current + 1, true)} isDisabled={complete} render={props => <button {...props} aria-keyshortcuts="ArrowRight" />}>下一步<Chip color="accent" variant="soft" size="sm" className="bg-white/20 text-white" aria-hidden="true"><ArrowRight size={14} /></Chip></Button>
            <Button variant="secondary" size="sm" onPress={() => changeStep(nextEntry)} isDisabled={nextEntry < 0}>下一个大步</Button>
            <Button variant="tertiary" size="sm" onPress={restart} render={props => <button {...props} aria-keyshortcuts="r" />}>重新开始<Chip color="accent" variant="soft" size="sm" aria-hidden="true">R</Chip></Button>
      </div>
      <div className="learning-replay-progress" onKeyDownCapture={event => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) keyboardScrub.current = true
      }} onKeyUpCapture={() => finishKeyboardScrub()} onBlurCapture={() => finishKeyboardScrub()}>
        <span id={`${animationId}-step`} className="text-sm text-muted">拖动浏览教学步骤（含小步） · <span className="font-mono whitespace-nowrap">{index} / {trace.steps.length - 1}</span> · {complete ? '学习完成' : phase}</span>
        <Slider aria-label="教学步骤" minValue={0} maxValue={trace.steps.length - 1} step={1} value={index} isDisabled={trace.steps.length === 1}
          onChange={value => changeStep(typeof value === 'number' ? value : value[0], false, true)}
          onChangeEnd={value => {
            const next = typeof value === 'number' ? value : value[0]
            // React Aria emits change-end for every keydown, including repeat.
            // Match pointer dragging: preview while held, commit on release.
            if (keyboardScrub.current) keyboardStep.current = next
            else onStepChange(next)
          }}>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb data-testid="teaching-step-thumb" aria-label="教学步骤" aria-describedby={`${animationId}-step`} />
          </Slider.Track>
        </Slider>
      </div>
    </section>
  </section>
}
