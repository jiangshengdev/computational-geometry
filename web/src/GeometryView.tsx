import { useLayoutEffect, useRef, useState } from 'react'
import { select, zoom, zoomIdentity, type ZoomTransform } from 'd3'
import { projectPoints } from './projection'
import { formatPoint, formatRational, pairName, samePoint, isVertical, type Intersection, type Point, type Segment } from './geometry'
import { Button } from '@heroui/react/button'
import { ButtonGroup } from '@heroui/react/button-group'
import { Card } from '@heroui/react/card'
import { Separator } from '@heroui/react/separator'
import type { HoverHighlights, HoverTarget } from './hover'
import type { EventSide } from './eventSide'

interface Props {
  segments: Segment[]; results: Intersection[]; selected: Intersection | null
  highlights?: HoverHighlights | null
  onHover?: (target: HoverTarget | null) => void
  sweep?: { current: Point | null; side: EventSide; participants: number[]; active: number[]; pending: Point[]; numbering: 'active' | 'pending' | null; checked: number[]; discovered: { point: Point; label: string }[]; labelPoint: (point: Point) => string }
}

export function GeometryView({ segments, results, selected, sweep, highlights, onHover }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [{ width, height }, setSize] = useState({ width: 800, height: 460 })
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const behavior = useRef(zoom<SVGSVGElement, unknown>().scaleExtent([0.25, 40]))
  const labelLayout = useRef<{ key: string; labels: SVGTextElement[] } | null>(null)
  const points = segments.flatMap(s => [s.start, s.end])
  const eventPoints = sweep ? [...points, ...sweep.discovered.map(d => d.point),
    ...results.flatMap(r => r.geometry.type === 'point' ? [r.geometry.point] : []),
    ...(sweep.current ? [sweep.current] : [])] : []
  const pointLabelProps = (point: Point) => sweep ? {
    'data-event-point': formatPoint(point),
    'data-highlighted': highlights?.points.some(p => samePoint(p, point)) ?? false,
  } : {}
  const projection = projectPoints(points, width, height, 64)
  const sideX = projection && sweep?.current ? transform.applyX(projection.px(sweep.current)) : null
  const sideY = projection && sweep?.current ? transform.applyY(projection.py(sweep.current)) : null
  const heightSideVisible = sweep?.side && sweep.participants.some(id => isVertical(segments[id])) &&
    sideX !== null && sideX >= 0 && sideX <= width &&
    sideY !== null && sideY >= 0 && sideY <= height
  // Project the existing list order; approximate coordinates only position the drawing.
  const numberedPoints = !projection ? [] : sweep?.numbering === 'pending'
    ? sweep.pending.map((point, index) => ({ x: projection.px(point), y: projection.py(point), label: `${index + 1}`, name: `待处理事件 ${index + 1}：${sweep.labelPoint(point)}` }))
    : sweep?.numbering === 'active' && sweep.current
      ? sweep.active.map((id, index) => {
        const segment = segments[id]
        const scanX = projection.px(sweep.current!)
        // A vertical segment coincides with the drawn sweep line over an
        // interval. Its marker tracks the event frontier, not a unique cut.
        if (isVertical(segment) || samePoint(segment.start, segment.end)) {
          return { x: scanX, y: projection.py(sweep.current!), label: `${index + 1}`, name: `活动线段 ${index + 1}：S${id}（当前处理高度）` }
        }
        const fraction = (scanX - projection.px(segment.start)) / (projection.px(segment.end) - projection.px(segment.start))
        return { x: scanX, y: projection.py(segment.start) + fraction * (projection.py(segment.end) - projection.py(segment.start)), label: `${index + 1}`, name: `活动线段 ${index + 1}：S${id}` }
      }) : []

  useLayoutEffect(() => {
    const element = svg.current!
    const validSize = ({ width, height }: DOMRect) =>
      Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    const initial = element.getBoundingClientRect()
    let previous = validSize(initial) ? initial : null
    if (previous) setSize({ width: initial.width, height: initial.height })
    behavior.current.on('zoom', event => setTransform(event.transform))
    select(element).call(behavior.current).on('wheel.zoom', null)
    const observer = new ResizeObserver(() => {
      // Transient layout collapse must not replace the last valid view or reset zoom.
      const size = element.getBoundingClientRect()
      if (!validSize(size) || (size.width === previous?.width && size.height === previous?.height)) return
      previous = size
      setSize({ width: size.width, height: size.height })
      select(element).call(behavior.current.transform, zoomIdentity)
    })
    observer.observe(element)
    return () => { select(element).on('.zoom', null); observer.disconnect() }
  }, [])

  const ordered = segments.map((s, index) => ({ s, index }))
    .sort((a, b) => Number(selected?.segments.includes(a.index)) - Number(selected?.segments.includes(b.index)))
  const resultOrder = results.filter(r => r !== selected).concat(selected ? [selected] : [])

  useLayoutEffect(() => {
    if (!projection) return
    const element = svg.current!
    const labels = Array.from(element.querySelectorAll<SVGTextElement>(sweep?.numbering ? 'text.order-number' : 'text:not(.tick)'))
    const ticks = Array.from(element.querySelectorAll<SVGTextElement>('.tick'))
    // Depend on layout content, not on freshly allocated sweep/highlight objects.
    // Coordinates are local to the shared SVG transform, so pan/zoom need no reflow.
    const key = JSON.stringify([width, height, sweep?.numbering, segments, eventPoints,
      [...labels, ...ticks].map(label => {
        const style = getComputedStyle(label)
        return [label.textContent, label.getAttribute('x'), label.getAttribute('y'),
          style.textAnchor, style.fontFamily, style.fontSize, style.fontStyle, style.letterSpacing]
      })])
    if (labelLayout.current?.key === key && labels.every((label, i) => label === labelLayout.current!.labels[i])) return
    // Reserve both normal and bold bounds before placing labels. Hover can then
    // change weight without moving its own hit target or redoing collision searches.
    for (const label of labels) label.removeAttribute('transform')
    const weights = labels.map(label => label.style.fontWeight)
    for (const label of labels) label.style.fontWeight = '400'
    const normal = labels.map(label => {
      const { x, y, width, height } = label.getBBox()
      return { x, y, width, height }
    })
    for (const label of labels) label.style.fontWeight = '700'
    const boxes = labels.map((label, i) => {
      const bold = label.getBBox(), regular = normal[i]
      const x = Math.min(regular.x, bold.x), y = Math.min(regular.y, bold.y)
      return { x, y, width: Math.max(regular.x + regular.width, bold.x + bold.width) - x,
        height: Math.max(regular.y + regular.height, bold.y + bold.height) - y }
    })
    labels.forEach((label, i) => { label.style.fontWeight = weights[i] })
    const occupied = ticks.map(tick => {
      const { x, y, width, height } = tick.getBBox()
      return { x, y, width, height }
    })
    const gap = 6 // Includes the white outline and space between adjacent labels.
    const lines = segments.map(segment => ({ x1: projection.px(segment.start), y1: projection.py(segment.start), x2: projection.px(segment.end), y2: projection.py(segment.end) }))
    for (const point of [...points, ...eventPoints]) occupied.push({ x: projection.px(point) - 10, y: projection.py(point) - 10, width: 20, height: 20 })
    labels.forEach((label, index) => {
      const box = boxes[index]
      // Short workspaces need space below and beside labels too: moving every
      // collision upward can put an otherwise readable label under the toolbar.
      const lefts = [...new Set([box.x, gap, width - box.width - gap,
        ...occupied.flatMap(other => [other.x - box.width - gap, other.x + other.width + gap])])]
        .filter(left => left >= gap && left + box.width <= width - gap && (!sweep?.numbering || left === box.x))
      const tops = [...new Set([box.y, gap, height - box.height - gap,
        ...occupied.flatMap(other => [other.y - box.height - gap, other.y + other.height + gap])])]
        .filter(top => top >= gap && top + box.height <= height - gap && (!sweep?.numbering || top <= box.y))
      const candidates = lefts.flatMap(left => tops.map(top => ({ left, top, distance: Math.hypot(left - box.x, top - box.y) })))
        .sort((a, b) => a.distance - b.distance)
      const position = candidates.find(({ left, top }) => !occupied.some(other =>
        left < other.x + other.width + gap && left + box.width + gap > other.x &&
        top < other.y + other.height + gap && top + box.height + gap > other.y) && !lines.some(line => {
          // Clip the segment against the label's padded rectangle, not its bounding box.
          let start = 0, end = 1
          for (const [origin, delta, low, high] of [
            [line.x1, line.x2 - line.x1, left - gap, left + box.width + gap],
            [line.y1, line.y2 - line.y1, top - gap, top + box.height + gap],
          ]) {
            if (delta === 0) {
              if (origin < low || origin > high) return false
            } else {
              const a = (low - origin) / delta, b = (high - origin) / delta
              start = Math.max(start, Math.min(a, b))
              end = Math.min(end, Math.max(a, b))
            }
          }
          return start <= end
        }))
      const { left, top } = position ?? { left: box.x, top: box.y }
      label.setAttribute('transform', `translate(${left - box.x}, ${top - box.y})`)
      const leader = label.parentElement?.querySelector('.order-leader')
      if (leader) {
        leader.setAttribute('x2', String(left - 4))
        leader.setAttribute('y2', String(top + box.height / 2))
      }
      occupied.push({ x: left, y: top, width: box.width, height: box.height })
    })
    labelLayout.current = { key, labels }
  })

  return <section className="drawing" aria-label="几何视图"><Card>
    <Card.Header className="drawing-toolbar"><div><Card.Title render={props => <h2 {...props} />}>原始坐标平面 · 等比例</Card.Title></div><ButtonGroup variant="tertiary" size="sm" aria-label="画布视图控制">
      <Button isIconOnly onPress={() => select(svg.current!).call(behavior.current.scaleBy, 1.4)} aria-label="放大">＋</Button>
      <Button isIconOnly onPress={() => select(svg.current!).call(behavior.current.scaleBy, 1 / 1.4)} aria-label="缩小"><ButtonGroup.Separator />−</Button>
      <Button onPress={() => select(svg.current!).call(behavior.current.transform, zoomIdentity)}><ButtonGroup.Separator />重置视图</Button>
    </ButtonGroup></Card.Header>
    <Card.Content className="drawing-surface p-0">
    {sweep && <div className="sweep-side-strip">
      {sweep.side && sideX !== null && sideX >= 0 && sideX <= width &&
        <span className="sweep-side" role="img" aria-label={`事件侧向状态：当前事件${sweep.side === 'left' ? '左' : '右'}侧（Δ）`}
          style={{ left: Math.max(2, Math.min(width - 50, sideX - 24)) }}>
          <span>Δ</span><span className="sweep-side-arrow" aria-hidden="true">{sweep.side === 'left' ? '←' : '→'}</span>
        </span>}
    </div>}
    {heightSideVisible && <span className="sweep-side sweep-height-side" role="img"
      aria-label={`事件高度状态：当前事件${sweep.side === 'left' ? '下' : '上'}侧（Δ）`}
      style={{ bottom: height - Math.max(18, Math.min(height - 18, sideY)) }}>
      <span>Δ</span><span className="sweep-side-arrow" aria-hidden="true">{sweep.side === 'left' ? '↓' : '↑'}</span>
    </span>}
    <svg ref={svg} viewBox={`0 0 ${width} ${height}`} aria-label="输入与交集坐标图" role="img" data-teaching={!!sweep} data-numbering={sweep?.numbering ?? undefined}
      onPointerLeave={() => onHover?.(null)} onPointerDown={() => onHover?.(null)}
      onPointerMove={event => {
        if (!projection || !onHover || event.buttons) return
        const eventLabel = (event.target as Element).closest<SVGTextElement>('text[data-event-point]')
        const labelPoint = eventPoints.find(p => formatPoint(p) === eventLabel?.dataset.eventPoint)
        if (labelPoint) { onHover({ kind: 'point', point: labelPoint }); return }
        const label = (event.target as Element).closest<SVGTextElement>('text[data-input]')
        if (label) { onHover({ kind: 'input', index: Number(label.dataset.input) }); return }
        const matrix = svg.current!.getScreenCTM()!
        const screen = (point: Point) => new DOMPoint(...transform.apply([projection.px(point), projection.py(point)])).matrixTransform(matrix)
        const scale = transform.k * Math.hypot(matrix.a, matrix.b)
        const pointInput = segments.find(segment => {
          if (!samePoint(segment.start, segment.end)) return false
          const center = screen(segment.start)
          return Math.abs(event.clientX - center.x) + Math.abs(event.clientY - center.y) <= 11 * scale + 3
        })
        const pointer = pointInput ? screen(pointInput.start) : new DOMPoint(event.clientX, event.clientY)
        const distance = (start: Point, end: Point) => {
          const a = screen(start), b = screen(end)
          const dx = b.x - a.x, dy = b.y - a.y
          const lengthSquared = dx * dx + dy * dy
          const t = lengthSquared ? Math.max(0, Math.min(1, ((pointer.x - a.x) * dx + (pointer.y - a.y) * dy) / lengthSquared)) : 0
          return Math.hypot(pointer.x - a.x - t * dx, pointer.y - a.y - t * dy)
        }
        const inputHits = segments.map((s, index) => ({ index, distance: distance(s.start, s.end) }))
          .filter(hit => hit.distance <= Math.max(7, 2 * scale))
        if (sweep) {
          const point = eventPoints.filter(p => distance(p, p) <= Math.max(10, 10 * scale))
            .sort((a, b) => distance(a, a) - distance(b, b))[0]
          if (point) { onHover({ kind: 'point', point }); return }
          const input = inputHits.sort((a, b) => a.distance - b.distance)[0]
          onHover(input ? { kind: 'input', index: input.index } : null)
          return
        }
        // Hit all geometry in screen pixels, independently of SVG paint order.
        const hits = results.filter(({ geometry: g }) => g.type === 'point'
          ? distance(g.point, g.point) <= Math.max(9, 7 * scale) : distance(g.start, g.end) <= Math.max(7, 4 * scale))
        const inputs = inputHits.map(hit => hit.index)
        for (const hit of hits) for (const index of hit.segments) if (!inputs.includes(index)) inputs.push(index)
        if (!inputs.length) onHover(null)
        else if (!hits.length && inputs.length === 1) onHover({ kind: 'input', index: inputs[0] })
        else onHover({ kind: 'geometry', inputs, pairs: hits.map(pairName) })
      }}>
      {projection && <>
      <g data-layer="grid" transform={transform.toString()}>
        {projection.x.ticks(Math.max(1, Math.floor((projection.x(projection.maxX) - projection.x(projection.minX)) / 90))).map(t => <g key={`x${t}`}><line className="grid" x1={projection.x(t)} x2={projection.x(t)} y1={20} y2={height - 35} /><text className="tick" x={projection.x(t)} y={height - 15}>{t}</text></g>)}
        {projection.y.ticks(Math.max(1, Math.min(6, Math.floor(Math.abs(projection.y.range()[1] - projection.y.range()[0]) / 40)))).map(t => <g key={`y${t}`}><line className="grid" x1={20} x2={width - 20} y1={projection.y(t)} y2={projection.y(t)} /><text className="tick" x={12} y={projection.y(t) - 5}>{t}</text></g>)}
      </g>
      {heightSideVisible && <line className="event-height-guide" aria-label="当前事件水平辅助线" role="img"
        x1={sideX} x2={Math.max(sideX, width - 36)} y1={sideY} y2={sideY} />}
      <g data-layer="geometry" transform={transform.toString()}>
        {ordered.map(({ s, index }) => {
          const active = selected?.segments.includes(index) ?? false
          const highlighted = highlights ? highlights.inputs.includes(index) : active
          return <g key={index} role="img" aria-label={`输入 S${index}${active ? '，已选中' : ''}`} className={`input ${highlighted ? 'selected' : ''}`} data-selected={active} data-highlighted={highlighted} data-active={sweep?.active.includes(index)} data-checked={sweep?.checked.includes(index)}>
            {samePoint(s.start, s.end)
              ? <path d={`M${projection.px(s.start)},${projection.py(s.start) - 11} l11,11 l-11,11 l-11,-11 Z`} />
              : <line x1={projection.px(s.start)} y1={projection.py(s.start)} x2={projection.px(s.end)} y2={projection.py(s.end)} />}
            <text data-input={sweep ? undefined : index} {...pointLabelProps(s.start)} x={projection.px(s.start) + 9} y={projection.py(s.start) - 10}>S{index}{sweep ? ' 起点' : ''}</text>
            {sweep && <text {...pointLabelProps(s.end)} textAnchor="end" x={projection.px(s.end) - 9} y={projection.py(s.end) - 10}>S{index} 终点</text>}
          </g>
        })}
        {sweep && <g className="sweep-overlay">
          <line role="img" aria-label={`扫描线 ${sweep.current ? `x = ${formatRational(sweep.current.x)}` : '尚未开始'}`}
            className="sweep-line" x1={sweep.current ? projection.px(sweep.current) : projection.x(projection.minX) - 20} x2={sweep.current ? projection.px(sweep.current) : projection.x(projection.minX) - 20} y1={20} y2={height - 35} />
          {sweep.discovered.map(({ point, label }) => <g role="img" aria-label={`已发现 ${label}`} key={label}>
            <circle className="scheduled-point" cx={projection.px(point)} cy={projection.py(point)} r={8} />
            <text {...pointLabelProps(point)} x={projection.px(point) + 12} y={projection.py(point) - 12}>{label}</text>
          </g>)}
          {sweep.current && <g role="img" aria-label={`当前事件 ${sweep.labelPoint(sweep.current)}`}>
            <circle className="current-point" cx={projection.px(sweep.current)} cy={projection.py(sweep.current)} r={10} />
            {!points.some(p => samePoint(p, sweep.current!)) && !sweep.discovered.some(d => samePoint(d.point, sweep.current!)) &&
              !results.some(r => r.geometry.type === 'point' && samePoint(r.geometry.point, sweep.current!)) &&
              <text {...pointLabelProps(sweep.current)} x={projection.px(sweep.current) + 12} y={projection.py(sweep.current) - 12}>{sweep.labelPoint(sweep.current)}</text>}
          </g>}
        </g>}
        {resultOrder.map(result => {
          const g = result.geometry, active = result === selected
          const highlighted = highlights ? highlights.pairs.includes(pairName(result)) : active
          return <g key={pairName(result)} role="img" aria-label={`交集 ${pairName(result)}${active ? '，已选中' : ''}`} className={`intersection ${highlighted ? 'selected' : ''}`} data-highlighted={highlighted}>
            {g.type === 'point' ? <circle cx={projection.px(g.point)} cy={projection.py(g.point)} r={highlighted ? 7 : 5} /> : <>
              <line x1={projection.px(g.start)} y1={projection.py(g.start)} x2={projection.px(g.end)} y2={projection.py(g.end)} />
              <circle cx={projection.px(g.start)} cy={projection.py(g.start)} r={5} /><circle cx={projection.px(g.end)} cy={projection.py(g.end)} r={5} />
            </>}
            {sweep && g.type === 'point' && resultOrder.find(other => other.geometry.type === 'point' && samePoint(other.geometry.point, g.point)) === result &&
              <text {...pointLabelProps(g.point)} className="result-label" x={projection.px(g.point) + 12} y={projection.py(g.point) - 12}>{sweep.labelPoint(g.point)}</text>}
            {sweep && g.type === 'overlap' && <text className="result-label" textAnchor="middle" x={(projection.px(g.start) + projection.px(g.end)) / 2} y={(projection.py(g.start) + projection.py(g.end)) / 2 - 12}>重叠区间 {pairName(result)}</text>}
          </g>
        })}
        {sweep && highlights?.points.filter(p => eventPoints.some(visible => samePoint(p, visible))).map(p =>
          <circle key={formatPoint(p)} className="hover-event" cx={projection.px(p)} cy={projection.py(p)} r={15} />)}
        {numberedPoints.map(point => <g key={point.name} className="order-marker" role="img" aria-label={point.name}>
          <line className="order-leader" x1={point.x} y1={point.y} x2={point.x + 8} y2={point.y - 12} />
          <circle cx={point.x} cy={point.y} r={3} />
          <text className="order-number" x={point.x + 12} y={point.y - 12}>{point.label}</text>
        </g>)}
      </g>
      </>}
    </svg>
    </Card.Content>
    <Separator />
    <Card.Footer className="legend text-muted"><span>蓝色：输入</span><span>橙色：交集</span>
      {sweep ? <><span>加粗：活动线段</span><span>虚线圆：待处理交点</span><span>紫色：扫描线与当前事件</span><span>扫描方向：从左向右</span></> : <span>菱形：零长度输入</span>}
      <span className="ml-auto whitespace-nowrap">按钮缩放 · 拖动平移</span>
    </Card.Footer>
  </Card></section>
}
