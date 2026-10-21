import { useLingui } from '@lingui/react/macro'
import { useLingui as useMessages } from '@lingui/react'
import { useReplayPosition, useReplaySlider } from '../../app/useReplayPosition'
import { useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Button, buttonVariants } from '@heroui/react/button'
import { Slider } from '@heroui/react/slider'
import { Alert } from '@heroui/react/alert'
import { Card } from '@heroui/react/card'
import { ToggleButton } from '@heroui/react/toggle-button'
import { DocumentTitle } from '../../app/DocumentTitle'
import { AppLink } from '../../app/AppLink'
import { CaseToolbar } from '../../geometry/CaseToolbar'
import { useLinkedInteraction } from '../../geometry/useLinkedInteraction'
import { formatPoint, type Point } from '../../geometry/geometry'
import { useGeometryViewport } from '../../geometry/useGeometryViewport'
import { GeometryViewControls } from '../../geometry/GeometryViewControls'
import type { HullCase } from './cases'
import { useHullTrace, type HullStep, type HullPhase } from './trace'
import { DirectedLine, HullTurnIndicator } from './HullDirection'
import { useStepPanelScroll } from '../segment-intersection/bo/learning/useStepPanelScroll'
import { useLayoutPreference } from '../../app/useLayoutPreference'
import { useZenMode } from '../../app/useZenMode'
import { LearningDisplayControls } from '../../geometry/LearningDisplayControls'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ShortcutActionButton, ShortcutActionGroup, type ShortcutAction } from '../../app/ShortcutAction'
import { useShortcutActions } from '../../app/useShortcutActions'
import { ReplayPositionLabel } from '../../app/ReplayPositionLabel'
import './HullLearning.css'
import { GeometryRotationControls } from '../../geometry/GeometryRotationControls'
import { PointPanelTitle } from '../../geometry/PointPanelTitle'

type PointPanel = 'order' | 'lower' | 'upper' | 'result'
type Target = { id: number; source: 'plot' | 'list' } | { panel: PointPanel; source: 'panel' }
type Interaction = ReturnType<typeof useLinkedInteraction<Target>>
function highlightsPoint(target: Target | null, step: HullStep, id: number) {
  return target?.source === 'panel' ? (step[target.panel]?.includes(id) ?? false) : target?.id === id
}
const hullLayouts = { '1:3:1': 3, '1:2:1': 2, '1:1:1': 1 } as const
type HullLayout = keyof typeof hullLayouts
const isHullLayout = (value: unknown): value is HullLayout => typeof value === 'string' && Object.hasOwn(hullLayouts, value)

export function HullLearning({ preset }: { preset: HullCase }) {
  const { t } = useLingui()
  const [rotationToolbar, setRotationToolbar] = useState<HTMLDivElement | null>(null)
  const { _: translate } = useMessages()
  const [layout, setLayout] = useLayoutPreference<HullLayout>('hull-learning-layout-v1-columns', '1:3:1', isHullLayout)
  const [zenMode, setZenMode] = useZenMode('hull-learning-layout-v1-zen')
  const trace = useHullTrace(preset)
  const { search: params, previewIndex, previewStep, commitStep } = useReplayPosition()
  const raw = params.get('step') ?? '0'
  const urlIndex = /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : -1
  const index = previewIndex ?? urlIndex
  const step = trace.steps[index]
  const interaction = useLinkedInteraction<Target>((a, b) => a.source === 'panel'
    ? b.source === 'panel' && a.panel === b.panel
    : b.source !== 'panel' && a.id === b.id)
  const go = (destination: number) => { interaction.clear(); commitStep(destination, urlIndex) }
  const { progressProps, sliderProps } = useReplaySlider(destination => {
    interaction.clear()
    previewStep(destination)
  }, go)
  const phases: { id: HullPhase; label: string }[] = [
    { id: 'preprocess', label: t`Preprocessing` }, { id: 'lower', label: t`Lower hull` },
    { id: 'upper', label: t`Upper hull` }, { id: 'join', label: t`Join result` },
  ]
  const last = trace.steps.length - 1
  const actions: ShortcutAction[] = [
    { name: t`Previous step`, key: 'ArrowLeft', hint: <ArrowLeft size={14} aria-hidden="true" />, isDisabled: index <= 0 || last < 0, onPress: () => go(Math.min(index - 1, last)) },
    { name: t`Next step`, key: 'ArrowRight', hint: <ArrowRight size={14} aria-hidden="true" />, isDisabled: !step || index >= last, onPress: () => go(index + 1) },
    { name: t`Restart`, key: 'r', hint: 'R', isDisabled: last < 0, onPress: () => go(0) },
    ...phases.flatMap((phase, position): ShortcutAction[] => {
      const start = trace.steps.findIndex(candidate => candidate.phase === phase.id)
      const key = String(position + 1)
      return start < 0 ? [] : [{ name: phase.label, key, hint: key, variant: 'tertiary', isDisabled: false, onPress: () => go(start) }]
    }),
  ]
  useShortcutActions(actions)
  return <>
    <DocumentTitle title={`${translate(preset.name)} · ${t`Learn step by step`}`} />
    <CaseToolbar name={translate(preset.name)} description={translate(preset.description)} backTo="/convex-hull"
      trailingAction={<AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to={`/convex-hull/cases/${preset.id}`}>{t`Back to results viewer`}</AppLink>}>
      <div ref={setRotationToolbar} />
      <LearningDisplayControls ratios={Object.keys(hullLayouts)} layout={layout}
        label={t`Main layout ratio (ordered points, geometry, stacks)`}
        onLayoutChange={value => { if (isHullLayout(value)) setLayout(value) }}
        zenMode={zenMode} onZenModeChange={setZenMode} />
    </CaseToolbar>
    <section className="learning-view hull-learning-view" data-zen-mode={zenMode} aria-label={t`Learn step by step`}>
      {!step ? <p role="status" className="flex-1">{index < 0 || trace.status === 'complete' ? t`Invalid teaching step` : trace.status === 'loading' ? t`Waiting for the requested step` : t`Requested step is unavailable`}</p> :
        <div className="workspace hull-learning-workspace" style={{ '--hull-geometry-width': `${hullLayouts[layout]}fr` } as CSSProperties}
          onKeyDown={event => { if (event.key === 'Escape') interaction.clear() }}>
          <HullPointList title={t`Ordered points`} panel="order" points={trace.points} step={step} interaction={interaction} />
          <HullLearningPlot points={trace.points} step={step} interaction={interaction} rotationToolbar={rotationToolbar} />
          <div className="workspace-panel hull-learning-stacks">
            <HullPointList title={t`Lower hull stack`} panel="lower" points={trace.points} step={step} interaction={interaction} stack complete={step.lower_complete} />
            <HullPointList title={t`Upper hull stack`} panel="upper" points={trace.points} step={step} interaction={interaction} stack complete={step.upper_complete} />
            {step.result !== null && <HullPointList title={t`Hull vertices`} panel="result" points={trace.points} step={step} interaction={interaction} />}
          </div>
        </div>}
      <section aria-label={t`Replay controls`} className="hull-replay-controls">
        {step && <section aria-label={t`Current action`} data-action={step.action} data-phase={step.phase}><HullExplanation step={step} /></section>}
        <div className="hull-replay-navigation">
          <div className="flex flex-wrap items-center gap-2">
            <ShortcutActionGroup actions={actions.slice(0, 2)} label={t`Single steps`} />
            <ShortcutActionButton action={actions[2]} />
            <ShortcutActionGroup actions={actions.slice(3)} label={t`Replay controls`} />
            {trace.status === 'loading' && <Button size="sm" variant="tertiary" onPress={trace.cancel}>{t`Cancel loading`}</Button>}
          </div>
          <div className="learning-replay-progress">
            <p role="status" className="text-sm text-muted">{trace.status === 'loading' ? t`Generating trace · total unknown` : trace.status === 'complete' ? t`Trace generated` : trace.status === 'cancelled' ? t`Loading cancelled · recorded steps remain available` : t`Trace failed`}{step && <> · <ReplayPositionLabel index={index} last={last} generated={trace.status === 'complete'} /></>}{trace.status === 'complete' && step?.action === 'complete' ? ` · ${t`Learning complete`}` : ''}</p>
            {trace.status === 'error' && <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Trace failed`}</Alert.Title><Alert.Description>{trace.message}</Alert.Description></Alert.Content></Alert>}
            {last >= 0 && <div {...progressProps}><Slider aria-label={t`Teaching step`} minValue={0} maxValue={Math.max(1, last)} step={1} value={step ? index : 0} isDisabled={last === 0} {...sliderProps}>
              <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
            </Slider></div>}
          </div>
        </div>
      </section>
    </section>
  </>
}

function HullExplanation({ step }: { step: HullStep }) {
  const { t } = useLingui()
  switch (step.action) {
    case 'input': return <p>{t`Original input · each P label keeps its input identity.`}</p>
    case 'sort': return <p>{t`Sort by x, then y. Equal coordinates retain their input labels.`}</p>
    case 'deduplicate': return <p>{t`Merge equal coordinates, retaining the first input identity. Duplicate positions do not add hull vertices.`}</p>
    case 'select': return <p>{t`Select current point`} P{step.current} · {t`Position in ordered points`}: {step.position} · {step.phase === 'lower' ? t`Scan forwards` : t`Scan backwards`}</p>
    case 'turn': return <p>{step.subjects.map(id => `P${id}`).join(' → ')} · {step.turn === 'left' ? t`Left turn: keep the stack top, then push the current point.` : step.turn === 'right' ? t`Right turn: pop the stack top, then check again.` : t`Collinear: pop the middle point, then check again.`}</p>
    case 'pop': return <p>P{step.removed} · {t`Popped from this chain only. It may still belong to the other chain and the final hull.`}</p>
    case 'push': return <p>P{step.current} · {t`Pushed onto the current chain. These are candidates and may be popped later.`}</p>
    case 'chain_complete': return <p>{step.phase === 'lower' ? t`Lower chain scan complete.` : t`Upper chain scan complete.`}</p>
    case 'trim_lower': return <p>P{step.removed} · {t`Remove the last lower-chain endpoint to avoid duplication. This endpoint remains in the final hull via the upper chain.`}</p>
    case 'trim_upper': return <p>P{step.removed} · {t`Remove the last upper-chain endpoint to avoid duplication. This endpoint remains in the final hull via the lower chain.`}</p>
    case 'complete': return <p>{step.phase === 'preprocess' ? t`At most one distinct point: return directly without scanning or joining chains.` : t`Join the two chains into the final ordered hull.`}</p>
  }
}

function HullPointList({ title, panel, points, step, interaction, stack = false, complete = false }: {
  title: string; panel: PointPanel; points: Point[]; step: HullStep; interaction: Interaction; stack?: boolean; complete?: boolean
}) {
  const { t } = useLingui()
  const ids = step[panel] ?? []
  const scrollport = useRef<HTMLDivElement>(null)
  useStepPanelScroll(step, 0, [{
    panel: scrollport,
    selector: step.current !== null ? `[data-point-id="${step.current}"]` : undefined,
  }])
  useStepPanelScroll(interaction.active ?? step, 0, [{
    panel: scrollport,
    selector: interaction.active?.source === 'plot' ? `[data-point-id="${interaction.active.id}"]` : undefined,
  }])
  return <section aria-label={title} className="workspace-panel"><Card>
    <Card.Header><PointPanelTitle className="hull-point-panel-title"
      onHighlight={active => interaction.hover(active ? { source: 'panel', panel } : null)}>{title}</PointPanelTitle></Card.Header>
    <Card.Content ref={scrollport}>
      {stack && <p>{complete ? t`Chain complete` : t`Candidate chain`}</p>}
      {!ids.length ? <p>{t`No points`}</p> : <ol className="flex flex-col gap-1">{ids.map((id, position) => <li key={id} data-point-id={id} data-highlighted={highlightsPoint(interaction.active, step, id)} data-current={step.current === id} data-top={stack && position === ids.length - 1}>
        <ToggleButton className="coordinates w-full justify-start" isSelected={highlightsPoint(interaction.selected, step, id)} variant={highlightsPoint(interaction.active, step, id) ? 'default' : 'ghost'}
          aria-current={step.current === id ? 'step' : undefined}
          onChange={() => interaction.select({ id, source: 'list' })} onHoverStart={() => interaction.hover({ id, source: 'list' })} onHoverEnd={() => interaction.hover(null)}
          onFocus={() => interaction.hover({ id, source: 'list' })} onBlur={() => interaction.hover(null)}>
          P{id} {formatPoint(points[id])}
        </ToggleButton>
        {stack && position === ids.length - 1 && <span> · {t`Stack top`}</span>}
      </li>)}</ol>}
    </Card.Content>
  </Card></section>
}

function HullLearningPlot({ points, step, interaction, rotationToolbar }: { points: Point[]; step: HullStep; interaction: Interaction; rotationToolbar: HTMLDivElement | null }) {
  const { t } = useLingui()
  const orderArrowId = useId()
  const viewport = useGeometryViewport(points, { padding: 36 })
  const { svg, projection, transform, width, height } = viewport
  const k = transform.k
  const position = (id: number) => ({ x: projection!.px(points[id]), y: projection!.py(points[id]) })
  const path = (ids: number[]) => ids.map(id => `${projection!.px(points[id])},${projection!.py(points[id])}`).join(' ')
  const incoming = projection && step.action === 'turn' && step.subjects.length === 3
    ? { from: position(step.subjects[0]), to: position(step.subjects[1]) } : null
  const mainArrow = incoming && Math.hypot(incoming.to.x - incoming.from.x, incoming.to.y - incoming.from.y) > 0
    ? incoming : null
  return <div className="drawing"><Card>
    <Card.Header className="drawing-toolbar"><Card.Title>{t`Convex hull plot`}</Card.Title><GeometryViewControls {...viewport} /></Card.Header>
    {rotationToolbar && createPortal(<GeometryRotationControls viewport={viewport} mainArrow={mainArrow} anchor={mainArrow?.to}
      alignLabel={t`Point main arrow up`} disabledReason={t`This step has no main arrow to align`} />, rotationToolbar)}
    <Card.Content className="flex min-h-0 flex-1 flex-col"><div className="drawing-surface flex flex-col">
      <svg ref={svg} className="geometry-viewport w-full" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={t`Convex hull plot`} style={{ '--geometry-scale': k } as CSSProperties}>
        <defs>
          <marker id={orderArrowId} viewBox="0 0 8 8" refX="8" refY="4" markerWidth={7 / k} markerHeight={7 / k} markerUnits="userSpaceOnUse" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--accent)" />
          </marker>
        </defs>
        {projection && <g data-layer="geometry" transform={viewport.geometryTransform}>
          {(step.action === 'sort' || step.action === 'deduplicate') && <g data-layer="sorted-order" pointerEvents="none" aria-hidden="true">
            {step.order.slice(1).map((id, index) => {
              const previous = step.order[index]
              return <DirectedLine key={id} data-order-from={previous} data-order-to={id}
                from={position(previous)} to={position(id)} scale={k}
                stroke="var(--accent)" strokeWidth={1.5 / k} markerEnd={`url(#${orderArrowId})`} />
            })}
          </g>}
          {[{ name: 'lower', ids: step.lower }, { name: 'upper', ids: step.upper }].map(chain => <polyline key={chain.name} data-chain={chain.name} points={path(chain.ids)} fill="none" stroke={chain.name === 'lower' ? 'var(--accent)' : 'var(--success)'} strokeWidth={2 / k} />)}
          {step.action === 'turn' && step.turn && step.subjects.length === 3 && <HullTurnIndicator turn={step.turn} scale={k} angle={viewport.angle}
            positions={[position(step.subjects[0]), position(step.subjects[1]), position(step.subjects[2])]} />}
          {step.result && (step.result.length > 2 ? <polygon data-hull="polygon" points={path(step.result)} fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth={3 / k} />
            : step.result.length === 2 ? <polyline data-hull="segment" points={path(step.result)} fill="none" stroke="var(--accent)" strokeWidth={3 / k} />
              : step.result.length === 1 ? <circle data-hull="point" cx={projection.px(points[step.result[0]])} cy={projection.py(points[step.result[0]])} r={7 / k} fill="none" stroke="var(--accent)" strokeWidth={3 / k} /> : null)}
          {points.map((point, id) => {
            const active = highlightsPoint(interaction.active, step, id)
            const current = step.current === id
            const removed = step.removed === id
            const label = `P${id} ${formatPoint(point)}`
            return <g key={id} role="button" tabIndex={0} aria-label={label} aria-pressed={highlightsPoint(interaction.selected, step, id)}
              data-point-id={id} data-highlighted={active} data-current={current} data-removed={removed} data-subject={step.subjects.includes(id)}
              onPointerEnter={event => { if (!event.buttons) interaction.hover({ id, source: 'plot' }) }} onPointerLeave={() => interaction.hover(null)}
              onFocus={() => interaction.hover({ id, source: 'plot' })} onBlur={() => interaction.hover(null)} onClick={() => interaction.select({ id, source: 'plot' })}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); interaction.select({ id, source: 'plot' }) } }}>
              <circle cx={projection.px(point)} cy={projection.py(point)} r={5 / k} fill={active ? 'var(--success)' : current ? 'var(--accent)' : removed ? 'var(--danger)' : 'currentColor'} />
              <circle cx={projection.px(point)} cy={projection.py(point)} r={10 / k} fill="transparent" stroke={active ? 'var(--success)' : current ? 'var(--accent)' : removed ? 'var(--danger)' : step.subjects.includes(id) ? 'var(--warning)' : 'none'} strokeWidth={2 / k} />
              {(active || current || removed || step.subjects.includes(id)) && <text transform={`rotate(${-viewport.angle} ${projection.px(point)} ${projection.py(point)})`} x={projection.px(point)} y={projection.py(point) - 12 / k} textAnchor="middle" fontSize={12 / k} fill="currentColor">P{id}</text>}
            </g>
          })}
        </g>}
        {!points.length && <text x={width / 2} y={height / 2} textAnchor="middle" fill="currentColor">{t`No input points`}</text>}
      </svg>
    </div></Card.Content>
  </Card></div>
}
