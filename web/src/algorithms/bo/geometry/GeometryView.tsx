import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Info, Minus, Plus } from 'lucide-react'
import { formatGeometry, formatPoint, formatRational, pairName, samePoint, isVertical, type Intersection, type Point, type Segment } from '../../../geometry/geometry'
import { Button, buttonVariants } from '@heroui/react/button'
import { ButtonGroup } from '@heroui/react/button-group'
import { Card } from '@heroui/react/card'
import { Tooltip } from '@heroui/react/tooltip'
import type { HoverHighlights, HoverTarget } from './hover'
import type { EventSide } from '../learning/eventSide'
import { useGeometryViewport } from './useGeometryViewport'
import { useGeometryLabels } from './useGeometryLabels'
import { useGeometryInteraction } from './useGeometryInteraction'
import { Trans, useLingui } from '@lingui/react/macro'

interface Props {
  segments: Segment[]; results: Intersection[]; selected: Intersection | null
  highlights?: HoverHighlights | null
  hoverTarget?: HoverTarget | null
  onHover?: (target: HoverTarget | null) => void
  /** Remeasure a deliberate layout-mode change without resetting the current zoom. */
  preserveViewKey?: boolean
  sweep?: { step: number; current: Point | null; side: EventSide; participants: number[]; active: number[]; pending: Point[]; numbering: 'active' | 'pending' | null; checked: number[]; discovered: { point: Point; label: string }[]; labelPoint: (point: Point) => string }
}

export function GeometryView({ segments, results, selected, sweep, highlights: suppliedHighlights, hoverTarget, onHover, preserveViewKey }: Props) {
  const { t } = useLingui()
  const points = segments.flatMap(s => [s.start, s.end])
  const eventPoints = sweep ? [...points, ...sweep.discovered.map(d => d.point),
    ...results.flatMap(r => r.geometry.type === 'point' ? [r.geometry.point] : []),
    ...(sweep.current ? [sweep.current] : [])] : []
  const viewport = useGeometryViewport(points, preserveViewKey)
  const { svg, width, height, transform, projection } = viewport
  const { pinned, inspecting, highlights, handlers } = useGeometryInteraction(viewport, {
    segments, results, eventPoints, teaching: !!sweep, step: sweep?.step,
    highlights: suppliedHighlights, hoverTarget, onHover,
  })
  const pointLabelProps = (point: Point) => sweep ? {
    'data-event-point': formatPoint(point),
    'data-highlighted': highlights?.points.some(p => samePoint(p, point)) ?? false,
  } : {}
  const inspectedPoint = !sweep?.numbering && inspecting?.kind === 'point' ? inspecting.point : undefined
  const inspectedInput = !sweep?.numbering && inspecting?.kind === 'input' ? inspecting.index : undefined
  const inspectedPair = !sweep?.numbering && inspecting?.kind === 'pair' ? results.find(result => pairName(result) === inspecting.pair) : undefined
  const detail = sweep && !sweep.numbering ? inspectedPoint ? sweep.labelPoint(inspectedPoint)
    : inspectedInput !== undefined ? t({ id: 'geometry.inputDetail', message: `S${inspectedInput} · Start ${formatPoint(segments[inspectedInput].start)} · End ${formatPoint(segments[inspectedInput].end)}` })
    : inspectedPair ? t({ id: 'geometry.overlapDetail', message: `Overlap ${pairName(inspectedPair)} · ${formatGeometry(inspectedPair.geometry)}` }) : null : null
  const relatedInputs = sweep ? [...new Set([...sweep.active, ...sweep.participants, ...sweep.checked, ...(highlights?.inputs ?? [])])] : []
  const sideX = projection && sweep?.current ? transform.applyX(projection.px(sweep.current)) : null
  const sideY = projection && sweep?.current ? transform.applyY(projection.py(sweep.current)) : null
  const heightSideVisible = sweep?.side && sweep.participants.some(id => isVertical(segments[id])) &&
    sideX !== null && sideX >= 0 && sideX <= width &&
    sideY !== null && sideY >= 0 && sideY <= height
  // Project the existing list order; approximate coordinates only position the drawing.
  const numberedPoints = !projection ? [] : sweep?.numbering === 'pending'
    ? sweep.pending.map((point, index) => ({ x: projection.px(point), y: projection.py(point), label: `${index + 1}`, name: t({ id: 'geometry.pendingEvent', message: `Pending event ${index + 1}: ${sweep.labelPoint(point)}` }) }))
    : sweep?.numbering === 'active' && sweep.current
      ? sweep.active.map((id, index) => {
        const segment = segments[id]
        const scanX = projection.px(sweep.current!)
        // A vertical segment coincides with the drawn sweep line over an
        // interval. Its marker tracks the event frontier, not a unique cut.
        if (isVertical(segment) || samePoint(segment.start, segment.end)) {
          return { x: scanX, y: projection.py(sweep.current!), label: `${index + 1}`, name: t({ id: 'geometry.activeAtHeight', message: `Active segment ${index + 1}: S${id} (current processing height)` }) }
        }
        const fraction = (scanX - projection.px(segment.start)) / (projection.px(segment.end) - projection.px(segment.start))
        return { x: scanX, y: projection.py(segment.start) + fraction * (projection.py(segment.end) - projection.py(segment.start)), label: `${index + 1}`, name: t({ id: 'geometry.activeSegment', message: `Active segment ${index + 1}: S${id}` }) }
      }) : []

  useGeometryLabels(viewport, {
    segments, points, eventPoints, numberedPoints, teaching: !!sweep, numbering: sweep?.numbering,
  })

  const ordered = segments.map((s, index) => ({ s, index }))
    .sort((a, b) => Number(selected?.segments.includes(a.index)) - Number(selected?.segments.includes(b.index)))
  const resultOrder = results.filter(r => r !== selected).concat(selected ? [selected] : [])

  return <section className="drawing" aria-label={t`Geometry view`}><Card>
    <Card.Header className="drawing-toolbar"><div className="flex items-center gap-1"><Card.Title render={props => <h2 {...props} />}><Trans>Original coordinate plane · Equal scale</Trans></Card.Title>
      <Tooltip>
        <Tooltip.Trigger<'button'> render={props => <button {...props} type="button" />} className={buttonVariants({ isIconOnly: true, variant: 'ghost', size: 'sm', className: 'inline-flex' })} aria-label={t`Legend and controls`}><Info size={16} aria-hidden="true" /></Tooltip.Trigger>
        <Tooltip.Content placement="bottom" className="max-w-xs">
          <div className="flex flex-col gap-1 text-sm"><span><Trans>Blue: inputs</Trans></span><span><Trans>Orange: intersections</Trans></span>
            {sweep ? <><span><Trans>Bold: active segments</Trans></span><span><Trans>Dashed circles: pending intersections</Trans></span><span><Trans>Purple: sweep line and current event</Trans></span><span><Trans>Sweep direction: left to right</Trans></span></> : <span><Trans>Diamonds: zero-length inputs</Trans></span>}
            <span><Trans>Use buttons to zoom · Drag to pan</Trans></span>
          </div>
        </Tooltip.Content>
      </Tooltip>
    </div><ButtonGroup variant="tertiary" size="sm" aria-label={t`Canvas view controls`}>
      <Button isIconOnly onPress={viewport.zoomIn} aria-label={t`Zoom in`}><Plus size={16} aria-hidden="true" /></Button>
      <Button isIconOnly onPress={viewport.zoomOut} aria-label={t`Zoom out`}><ButtonGroup.Separator /><Minus size={16} aria-hidden="true" /></Button>
      <Button onPress={viewport.reset}><ButtonGroup.Separator /><Trans>Reset view</Trans></Button>
    </ButtonGroup></Card.Header>
    <Card.Content className="drawing-surface p-0">
    {sweep && <div className="sweep-side-strip">
      {sweep.side && sideX !== null && sideX >= 0 && sideX <= width &&
        <span className="sweep-side" role="img" aria-label={sweep.side === 'left' ? t`Event side: left of the current event (Δ)` : t`Event side: right of the current event (Δ)`}
          style={{ left: Math.max(2, Math.min(width - 50, sideX - 24)) }}>
          <span>Δ</span>{sweep.side === 'left' ? <ArrowLeft className="sweep-side-arrow" aria-hidden="true" /> : <ArrowRight className="sweep-side-arrow" aria-hidden="true" />}
        </span>}
    </div>}
    {heightSideVisible && <span className="sweep-side sweep-height-side" role="img"
      aria-label={sweep.side === 'left' ? t`Event height: below the current event (Δ)` : t`Event height: above the current event (Δ)`}
      style={{ bottom: height - Math.max(18, Math.min(height - 18, sideY)) }}>
      <span>Δ</span>{sweep.side === 'left' ? <ArrowDown className="sweep-side-arrow" aria-hidden="true" /> : <ArrowUp className="sweep-side-arrow" aria-hidden="true" />}
    </span>}
    <svg ref={svg} viewBox={`0 0 ${width} ${height}`} aria-label={t`Input and intersection plot`} role="img" data-teaching={!!sweep} data-numbering={sweep?.numbering ?? undefined}
      tabIndex={sweep ? 0 : undefined}
      {...handlers}>
      {projection && <>
      <g data-layer="grid" transform={transform.toString()}>
        {projection.x.ticks(Math.max(1, Math.floor((projection.x(projection.maxX) - projection.x(projection.minX)) / 90))).map(t => <g key={`x${t}`}><line className="grid" x1={projection.x(t)} x2={projection.x(t)} y1={20} y2={height - 35} /><text className="tick" x={projection.x(t)} y={height - 15}>{t}</text></g>)}
        {projection.y.ticks(Math.max(1, Math.min(6, Math.floor(Math.abs(projection.y.range()[1] - projection.y.range()[0]) / 40)))).map(t => <g key={`y${t}`}><line className="grid" x1={20} x2={width - 20} y1={projection.y(t)} y2={projection.y(t)} /><text className="tick" x={12} y={projection.y(t) - 5}>{t}</text></g>)}
      </g>
      {heightSideVisible && <line className="event-height-guide" aria-label={t`Current event horizontal guide`} role="img"
        x1={sideX} x2={Math.max(sideX, width - 36)} y1={sideY} y2={sideY} />}
      <g data-layer="geometry" transform={transform.toString()}>
        {ordered.map(({ s, index }) => {
          const active = selected?.segments.includes(index) ?? false
          const highlighted = highlights ? highlights.inputs.includes(index) : active
          return <g key={index} role="img" aria-label={active ? t`Input S${index}, selected` : t`Input S${index}`} className={`input ${highlighted ? 'selected' : ''}`} data-selected={active} data-highlighted={highlighted} data-active={sweep?.active.includes(index)} data-participant={sweep?.participants.includes(index)} data-checked={sweep?.checked.includes(index)}>
            {samePoint(s.start, s.end)
              ? <path d={`M${projection.px(s.start)},${projection.py(s.start) - 11} l11,11 l-11,11 l-11,-11 Z`} />
              : <line x1={projection.px(s.start)} y1={projection.py(s.start)} x2={projection.px(s.end)} y2={projection.py(s.end)} />}
            {!sweep && <text data-input={index} x={projection.px(s.start) + 9} y={projection.py(s.start) - 10}>S{index}</text>}
          </g>
        })}
        {sweep && <g className="sweep-overlay">
          <line role="img" aria-label={sweep.current ? t({ id: 'geometry.sweepLine', message: `Sweep line x = ${formatRational(sweep.current.x)}` }) : t`Sweep line not started`}
            className="sweep-line" x1={sweep.current ? projection.px(sweep.current) : projection.x(projection.minX) - 20} x2={sweep.current ? projection.px(sweep.current) : projection.x(projection.minX) - 20} y1={20} y2={height - 35} />
          {sweep.discovered.map(({ point, label }) => <g role="img" aria-label={t`Discovered ${label}`} key={formatPoint(point)}>
            <circle className="scheduled-point" cx={projection.px(point)} cy={projection.py(point)} r={8} />
          </g>)}
          {sweep.current && <g role="img" aria-label={t({ id: 'geometry.currentEvent', message: `Current event ${sweep.labelPoint(sweep.current)}` })}>
            <circle className="current-point" cx={projection.px(sweep.current)} cy={projection.py(sweep.current)} r={10} />
          </g>}
        </g>}
        {resultOrder.map(result => {
          const g = result.geometry, active = result === selected
          const highlighted = highlights ? highlights.pairs.includes(pairName(result)) : active
          return <g key={pairName(result)} role="img" aria-label={active ? t({ id: 'geometry.selectedIntersection', message: `Intersection ${pairName(result)}, selected` }) : t({ id: 'geometry.intersection', message: `Intersection ${pairName(result)}` })} className={`intersection ${highlighted ? 'selected' : ''}`} data-highlighted={highlighted}>
            {g.type === 'point' ? <circle cx={projection.px(g.point)} cy={projection.py(g.point)} r={highlighted ? 7 : 5} /> : <>
              <line x1={projection.px(g.start)} y1={projection.py(g.start)} x2={projection.px(g.end)} y2={projection.py(g.end)} />
              <circle cx={projection.px(g.start)} cy={projection.py(g.start)} r={5} /><circle cx={projection.px(g.end)} cy={projection.py(g.end)} r={5} />
            </>}
          </g>
        })}
        {sweep && highlights?.points.filter(p => eventPoints.some(visible => samePoint(p, visible))).map(p =>
          <circle key={formatPoint(p)} className="hover-event" cx={projection.px(p)} cy={projection.py(p)} r={15} />)}
        {numberedPoints.map(point => <g key={point.label} className="order-marker" role="img" aria-label={point.name}>
          <line className="order-leader" x1={point.x} y1={point.y} x2={point.x + 8} y2={point.y - 12} />
          <circle cx={point.x} cy={point.y} r={3} />
          <text className="order-number" x={point.x + 12} y={point.y - 12}>{point.label}</text>
        </g>)}
      </g>
      {sweep && <g className="teaching-labels">
        {segments.map((segment, id) => {
          return <text key={id} data-input={id} data-priority="1" data-related={relatedInputs.includes(id)}
            data-highlighted={highlights?.inputs.includes(id) ?? false}
            x={transform.applyX(projection.px(segment.start) * 0.75 + projection.px(segment.end) * 0.25) + 9}
            y={transform.applyY(projection.py(segment.start) * 0.75 + projection.py(segment.end) * 0.25) - 10}>S{id}</text>
        })}
        {inspectedPoint && <g>
          <line className="label-leader" x1={transform.applyX(projection.px(inspectedPoint))} y1={transform.applyY(projection.py(inspectedPoint))} />
          <text {...pointLabelProps(inspectedPoint)} data-priority="2"
            x={transform.applyX(projection.px(inspectedPoint)) + 12} y={transform.applyY(projection.py(inspectedPoint)) - 12}>{formatPoint(inspectedPoint)}</text>
        </g>}
      </g>}
      </>}
    </svg>
    {detail && <div className="canvas-detail" role="status" aria-label={t`Canvas object details`} data-pinned={!!pinned && !hoverTarget}>
      <span>{detail}</span>
    </div>}
    </Card.Content>
  </Card></section>
}
