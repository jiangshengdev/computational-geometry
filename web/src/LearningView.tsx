import { Fragment, useEffect, useEffectEvent, useState } from 'react'
import { GeometryView } from './GeometryView'
import { formatPoint, pairName, samePoint, type Intersection, type Point, type Preset, type SweepTrace } from './geometry'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from 'radix-ui'
import { hoverHighlights, type HoverTarget } from './hover'
import { AnimatePresence, LayoutGroup, useReducedMotion } from 'motion/react'
import { LearningRow } from './LearningMotion'

export function LearningIntroduction() {
  return <details className="my-4"><summary className="cursor-pointer">学习目标、术语与扫描约定</summary>
    <section aria-label="学习目标" className="my-6 flex flex-col gap-3">
    <h2 className="text-xl font-semibold">从零理解 Bentley–Ottmann 扫描线</h2>
    <p>目标：能说清何时加入线段、何时发现交点、为什么换序，以及何时退出。线段求交就是找出输入线段共有的点或区间。</p>
    <p>最直接的方法是两两检查：<span className="coordinates">n</span> 条线段要检查 <span className="coordinates">n(n−1)/2</span> 对。扫描线是一条从左向右移动的竖线；只在端点或已发现的交点停下，这些停靠位置叫事件。</p>
    <p>事件队列按先 <span className="coordinates">x</span>、后 <span className="coordinates">y</span> 从小到大保存待处理事件；活动线段是已加入且尚未退出的线段，按从下到上排序。相邻线段指这个顺序里紧挨的两条。</p>
    <p>在普通交叉中，两条线要交换上下位置，交叉前必先相邻。因此在加入、退出或换序后检查新邻居，就能提前发现未来交点，无须每步重查所有配对。</p>
    <p className="text-muted-foreground">统一约定：精确有理数决定交点与排序，像素近似只用于绘图。同 <span className="coordinates">x</span> 的不同事件按 <span className="coordinates">y</span> 依次处理；当前事件处理完成后只更新该位置的顺序，同 <span className="coordinates">x</span> 的其他位置保留各自处理进度。交叉处按紧邻事件右侧的顺序排列。</p>
    <p className="text-muted-foreground">本入门流程仅讲普通两线交叉与无交点。两个案例的端点虽有相同 <span className="coordinates">x</span>，但位置不同；这不代表共点、竖直线或重叠等任意退化输入已获得完整教学支持。</p>
    </section>
  </details>
}

export function LearningReferences() {
  return <section aria-label="学习参考" className="mt-6 flex flex-col gap-2 text-sm">
    <h2 className="font-semibold">继续阅读</h2>
    <a className="underline" href="https://www.cs.umd.edu/class/fall2023/cmsc754/Lects/lect04-intersection.pdf">Dave Mount · CMSC 754 Lecture 4：事件、活动顺序与相邻检测</a>
    <p className="text-muted-foreground">核对依据：讲义的 Plane Sweep、Adjacent-segment rule 与事件处理章节。讲义先假设一般位置；这里另外明示同 <span className="coordinates">x</span> 端点的处理顺序。其平衡树复杂度结论不等于本演示实现的性能保证。</p>
  </section>
}

export function LearningView({ preset, trace, results }: { preset: Preset; trace: SweepTrace; results: Intersection[] }) {
  const [navigation, setNavigation] = useState({ index: 0, from: 0, reset: 0 })
  const { index } = navigation
  const reducedMotion = useReducedMotion()
  const [run, setRun] = useState(0)
  const [hover, setHover] = useState<HoverTarget | null>(null)
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
    setNavigation(current => ({
      index: Math.max(0, Math.min(trace.steps.length - 1, typeof value === 'function' ? value(current.index) : value)),
      from: current.index,
      reset: current.reset + (singleStep && !reducedMotion ? 0 : 1),
    }))
  }
  const restart = () => { changeStep(0); setRun(r => r + 1) }
  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const target = event.target
    if (target instanceof Element && (
      target.closest('input, textarea, select, [role="slider"], [role="combobox"], [role="listbox"]')
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
  const eventIds = (state: typeof step) => [...state.pending, ...(state.current ? [state.current] : [])].map(p => `event:${formatPoint(p)}`)
  const destinations = eventIds(step)
  const sources = eventIds(trace.steps[navigation.from])
  const before = trace.steps[Math.max(0, index - 1)]
  const complete = index === trace.steps.length - 1
  const points = results.flatMap(result => result.geometry.type === 'point' ? [result.geometry.point] : [])
  const pointName = (p: Point) => {
    const endpoints = preset.segments.flatMap((s, id) => [
      ...(samePoint(p, s.start) ? [`S${id} 起点`] : []),
      ...(samePoint(p, s.end) ? [`S${id} 终点`] : []),
    ])
    return `${endpoints.length ? endpoints.join(' / ') : `I${points.findIndex(point => samePoint(point, p))}`} ${formatPoint(p)}`
  }
  const discovered = step.pending.filter(p => points.some(point => samePoint(point, p)))
  const newlyScheduled = discovered.filter(p => !before.pending.some(old => samePoint(old, p)))
  const subjects = inputReferences(step.subjects, ' × ')
  const phase = step.phase === 'initial' ? '准备开始' : step.phase === 'processing' ? '事件处理中' : '事件处理完成'
  return <section aria-label="逐步学习" className="flex flex-col gap-4">
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
        highlights={highlights} onHover={setHover}
        sweep={{ current: step.current, active: step.active, discovered: discovered.map(p => ({ point: p, label: pointName(p) })), labelPoint: pointName }} />
      <LayoutGroup key={`${navigation.reset}:${reducedMotion}`}>
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
          <CardHeader><CardTitle><h2>待处理事件队列</h2></CardTitle></CardHeader>
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
          <CardHeader><CardTitle><h2>活动线段顺序</h2></CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2"><p className="text-sm text-muted-foreground">序号从下到上递增 · {step.action === 'take' || step.action === 'record' ? '保留该事件处理前顺序' : step.phase === 'processed' ? '当前已处理事件之后的顺序' : '当前教学动作后的顺序，事件尚未处理完成'}</p>
            <div data-testid="active-order">{step.active.length ? <ol className="flex list-inside list-decimal flex-col-reverse gap-2">
              {step.active.map(id => <li key={id} className="coordinates learning-hover-item" {...inputProps(id)}>S{id}</li>)}
            </ol> : <p>空</p>}</div>
          </CardContent>
        </Card></section>
      </aside>
      </LayoutGroup>
    </div>
    <section aria-label="操作解释" aria-live="polite"><Card>
      <CardHeader><CardTitle><h2>这一步为什么这样做？</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        {step.action === 'initial' && <p>先把所有端点放入事件队列。交点尚未被发现，不预先加入；活动顺序为空。点击下一步，从队首取出最早事件。</p>}
        {step.action === 'take' && <p>从队首取出 <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>，扫描线停在此处。当前事件已离开待处理队列；此刻还没有加入、退出或换序，下一步才执行更新。</p>}
        {step.action === 'insert' && <p>加入 <span className="coordinates">{subjects}</span>：扫描线到达其起点，此后它参与活动顺序。接下来检查新邻居是否会在未来相交。</p>}
        {step.action === 'remove' && <p>退出 <span className="coordinates">{subjects}</span>：扫描线到达其终点，后续不再与它相交；检查删除后是否出现新邻居。</p>}
        {step.action === 'record' && <p>记录 <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>：参与线段 <span className="coordinates">{subjects}</span> 在这里交叉。交集已记入结果，活动顺序尚未换序。</p>}
        {step.action === 'reorder' && <p>换序为 <span className="coordinates">{inputReferences(step.active, ' → ')}</span>：刚过交点，按事件右侧从下到上的顺序排列，再检查新邻居。</p>}
        {step.action === 'check' && <p>检查相邻线段 <span className="coordinates">{subjects}</span>：加入、退出或换序后只需检查新邻居。此步选定检查配对，未来交点尚未加入队列。</p>}
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
        {step.results.length ? step.results.map(result => <p className="coordinates" key={pairName(result)}>{result.geometry.type === 'point' && `${pointName(result.geometry.point)}：${pairName(result)}`}</p>) : <p>结果为空：两条线段平行且高度不同，没有交点。</p>}
        <p>{preset.id === 'crossing' ? <>独立数学核对：<span className="coordinates">S0</span> 满足 <span className="coordinates">y = x</span>，<span className="coordinates">S1</span> 满足 <span className="coordinates">y = 4 − x</span>。联立得 <span className="coordinates">x = y = 2</span>，位于两条线段内部。</> : <>独立数学核对：<span className="coordinates">S0</span> 的 <span className="coordinates">y = 0</span>，<span className="coordinates">S1</span> 的 <span className="coordinates">y = 2</span>，不可能拥有同一点。</>}</p>
      </CardContent>
    </Card></section>}
    <LearningReferences />
  </section>
}
