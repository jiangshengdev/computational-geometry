import { useLayoutEffect, useRef, useState } from 'react'
import { select, zoom, zoomIdentity, type ZoomTransform } from 'd3'
import { projectPoints } from './projection'
import { formatPoint, formatRational, pairName, samePoint, type Intersection, type Point, type Segment } from './geometry'
import { Button } from '@heroui/react/button'
import { ButtonGroup } from '@heroui/react/button-group'
import { Card } from '@heroui/react/card'
import { Separator } from '@heroui/react/separator'
import type { HoverHighlights, HoverTarget } from './hover'

interface Props {
  segments: Segment[]; results: Intersection[]; selected: Intersection | null
  highlights?: HoverHighlights | null
  onHover?: (target: HoverTarget | null) => void
  sweep?: { current: Point | null; active: number[]; pending: Point[]; numbering: 'active' | 'pending' | null; checked: number[]; discovered: { point: Point; label: string }[]; labelPoint: (point: Point) => string }
}

export function GeometryView({ segments, results, selected, sweep, highlights, onHover }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const [{ width, height }, setSize] = useState({ width: 800, height: 460 })
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const behavior = useRef(zoom<SVGSVGElement, unknown>().scaleExtent([0.25, 40]))
  const points = segments.flatMap(s => [s.start, s.end])
  const eventPoints = sweep ? [...points, ...sweep.discovered.map(d => d.point),
    ...results.flatMap(r => r.geometry.type === 'point' ? [r.geometry.point] : []),
    ...(sweep.current ? [sweep.current] : [])] : []
  const pointLabelProps = (point: Point) => sweep ? {
    'data-event-point': formatPoint(point),
    'data-highlighted': highlights?.points.some(p => samePoint(p, point)) ?? false,
  } : {}
  const { minX, maxX, x, y, px, py } = projectPoints(points, width, height, 50)
  // Project the existing list order; approximate coordinates only position the drawing.
  const numberedPoints = sweep?.numbering === 'pending'
    ? sweep.pending.map((point, index) => ({ x: px(point), y: py(point), label: `${index + 1}`, name: `待处理事件 ${index + 1}：${sweep.labelPoint(point)}` }))
    : sweep?.numbering === 'active' && sweep.current
      ? sweep.active.map((id, index) => {
        const segment = segments[id]
        const scanX = px(sweep.current!)
        // A vertical segment coincides with the drawn sweep line over an
        // interval. Its marker tracks the event frontier, not a unique cut.
        if (samePoint({ x: segment.start.x, y: segment.end.y }, segment.end)) {
          return { x: scanX, y: py(sweep.current!), label: `${index + 1}`, name: `活动线段 ${index + 1}：S${id}（当前处理高度）` }
        }
        const fraction = (scanX - px(segment.start)) / (px(segment.end) - px(segment.start))
        return { x: scanX, y: py(segment.start) + fraction * (py(segment.end) - py(segment.start)), label: `${index + 1}`, name: `活动线段 ${index + 1}：S${id}` }
      }) : []

  useLayoutEffect(() => {
    const element = svg.current!
    const initial = surface.current!.getBoundingClientRect()
    setSize({ width: initial.width, height: initial.height })
    behavior.current.on('zoom', event => setTransform(event.transform))
    select(element).call(behavior.current).on('wheel.zoom', null)
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(surface.current!)
    return () => { select(element).on('.zoom', null); observer.disconnect() }
  }, [])

  const ordered = segments.map((s, index) => ({ s, index }))
    .sort((a, b) => Number(selected?.segments.includes(a.index)) - Number(selected?.segments.includes(b.index)))
  const resultOrder = results.filter(r => r !== selected).concat(selected ? [selected] : [])

  useLayoutEffect(() => {
    const element = svg.current!
    const labels = Array.from(element.querySelectorAll<SVGTextElement>(sweep?.numbering ? 'text.order-number' : 'text:not(.tick)'))
    // Measure the rendered font, including selection weight, in the shared SVG coordinates.
    for (const label of labels) label.removeAttribute('transform')
    const boxes = labels.map(label => label.getBBox())
    const occupied = Array.from(element.querySelectorAll<SVGTextElement>('.tick'), tick => tick.getBBox())
    const gap = 6 // Includes the white outline and space between adjacent labels.
    labels.forEach((label, index) => {
      const box = boxes[index]
      // Short workspaces need space below and beside labels too: moving every
      // collision upward can put an otherwise readable label under the toolbar.
      const lefts = [box.x, gap, width - box.width - gap,
        ...occupied.flatMap(other => [other.x - box.width - gap, other.x + other.width + gap])]
      const tops = [box.y, gap, height - box.height - gap,
        ...occupied.flatMap(other => [other.y - box.height - gap, other.y + other.height + gap])]
      const candidates = lefts.flatMap(left => tops.map(top => ({ left, top })))
        .filter(({ left, top }) => left >= gap && top >= gap && left + box.width <= width - gap && top + box.height <= height - gap)
        .filter(({ left, top }) => !sweep?.numbering || (left === box.x && top <= box.y))
        .sort((a, b) => Math.hypot(a.left - box.x, a.top - box.y) - Math.hypot(b.left - box.x, b.top - box.y))
      const position = candidates.find(({ left, top }) => !occupied.some(other =>
        left < other.x + other.width + gap && left + box.width + gap > other.x &&
        top < other.y + other.height + gap && top + box.height + gap > other.y))
      const { left, top } = position ?? { left: box.x, top: box.y }
      label.setAttribute('transform', `translate(${left - box.x}, ${top - box.y})`)
      const leader = label.parentElement?.querySelector('.order-leader')
      if (leader) {
        leader.setAttribute('x2', String(left - 4))
        leader.setAttribute('y2', String(top + box.height / 2))
      }
      occupied.push(new DOMRect(left, top, box.width, box.height))
    })
  })

  return <section className="drawing" aria-label="几何视图"><Card>
    <Card.Header className="drawing-toolbar"><div><Card.Title render={props => <h2 {...props} />}>原始坐标平面 · 等比例</Card.Title><Card.Description>按钮缩放 · 拖动平移</Card.Description></div><ButtonGroup variant="tertiary" size="sm" aria-label="画布视图控制">
      <Button isIconOnly onPress={() => select(svg.current!).call(behavior.current.scaleBy, 1.4)} aria-label="放大">＋</Button>
      <Button isIconOnly onPress={() => select(svg.current!).call(behavior.current.scaleBy, 1 / 1.4)} aria-label="缩小"><ButtonGroup.Separator />−</Button>
      <Button onPress={() => select(svg.current!).call(behavior.current.transform, zoomIdentity)}><ButtonGroup.Separator />重置视图</Button>
    </ButtonGroup></Card.Header>
    <Card.Content ref={surface} className="drawing-surface p-0">
    <svg ref={svg} viewBox={`0 0 ${width} ${height}`} height={height} aria-label="输入与交集坐标图" role="img" data-teaching={!!sweep} data-numbering={sweep?.numbering ?? undefined}
      onPointerLeave={() => onHover?.(null)} onPointerDown={() => onHover?.(null)}
      onPointerMove={event => {
        if (!onHover || event.buttons) return
        const eventLabel = (event.target as Element).closest<SVGTextElement>('text[data-event-point]')
        const labelPoint = eventPoints.find(p => formatPoint(p) === eventLabel?.dataset.eventPoint)
        if (labelPoint) { onHover({ kind: 'point', point: labelPoint }); return }
        const label = (event.target as Element).closest<SVGTextElement>('text[data-input]')
        if (label) { onHover({ kind: 'input', index: Number(label.dataset.input) }); return }
        const matrix = svg.current!.getScreenCTM()!
        const screen = (point: Point) => new DOMPoint(...transform.apply([px(point), py(point)])).matrixTransform(matrix)
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
      <g transform={transform.toString()}>
        {x.ticks(Math.max(2, Math.floor((x(maxX) - x(minX)) / 90))).map(t => <g key={`x${t}`}><line className="grid" x1={x(t)} x2={x(t)} y1={20} y2={height - 35} /><text className="tick" x={x(t)} y={height - 15}>{t}</text></g>)}
        {y.ticks(6).map(t => <g key={`y${t}`}><line className="grid" x1={20} x2={width - 20} y1={y(t)} y2={y(t)} /><text className="tick" x={12} y={y(t) - 5}>{t}</text></g>)}
        {ordered.map(({ s, index }) => {
          const active = selected?.segments.includes(index) ?? false
          const highlighted = highlights ? highlights.inputs.includes(index) : active
          return <g key={index} role="img" aria-label={`输入 S${index}${active ? '，已选中' : ''}`} className={`input ${highlighted ? 'selected' : ''}`} data-selected={active} data-highlighted={highlighted} data-active={sweep?.active.includes(index)} data-checked={sweep?.checked.includes(index)}>
            {samePoint(s.start, s.end)
              ? <path d={`M${px(s.start)},${py(s.start) - 11} l11,11 l-11,11 l-11,-11 Z`} />
              : <line x1={px(s.start)} y1={py(s.start)} x2={px(s.end)} y2={py(s.end)} />}
            <text data-input={sweep ? undefined : index} {...pointLabelProps(s.start)} x={px(s.start) + 9} y={py(s.start) - 10}>S{index}{sweep ? ' 起点' : ''}</text>
            {sweep && <text {...pointLabelProps(s.end)} textAnchor="end" x={px(s.end) - 9} y={py(s.end) - 10}>S{index} 终点</text>}
          </g>
        })}
        {sweep && <g className="sweep-overlay">
          <line role="img" aria-label={`扫描线 ${sweep.current ? `x = ${formatRational(sweep.current.x)}` : '尚未开始'}`}
            className="sweep-line" x1={sweep.current ? px(sweep.current) : x(minX) - 20} x2={sweep.current ? px(sweep.current) : x(minX) - 20} y1={20} y2={height - 35} />
          {sweep.discovered.map(({ point, label }) => <g role="img" aria-label={`已发现 ${label}`} key={label}>
            <circle className="scheduled-point" cx={px(point)} cy={py(point)} r={8} />
            <text {...pointLabelProps(point)} x={px(point) + 12} y={py(point) - 12}>{label}</text>
          </g>)}
          {sweep.current && <g role="img" aria-label={`当前事件 ${sweep.labelPoint(sweep.current)}`}>
            <circle className="current-point" cx={px(sweep.current)} cy={py(sweep.current)} r={10} />
            {!points.some(p => samePoint(p, sweep.current!)) && !sweep.discovered.some(d => samePoint(d.point, sweep.current!)) &&
              !results.some(r => r.geometry.type === 'point' && samePoint(r.geometry.point, sweep.current!)) &&
              <text {...pointLabelProps(sweep.current)} x={px(sweep.current) + 12} y={py(sweep.current) - 12}>{sweep.labelPoint(sweep.current)}</text>}
          </g>}
        </g>}
        {resultOrder.map(result => {
          const g = result.geometry, active = result === selected
          const highlighted = highlights ? highlights.pairs.includes(pairName(result)) : active
          return <g key={pairName(result)} role="img" aria-label={`交集 ${pairName(result)}${active ? '，已选中' : ''}`} className={`intersection ${highlighted ? 'selected' : ''}`} data-highlighted={highlighted}>
            {g.type === 'point' ? <circle cx={px(g.point)} cy={py(g.point)} r={highlighted ? 7 : 5} /> : <>
              <line x1={px(g.start)} y1={py(g.start)} x2={px(g.end)} y2={py(g.end)} />
              <circle cx={px(g.start)} cy={py(g.start)} r={5} /><circle cx={px(g.end)} cy={py(g.end)} r={5} />
            </>}
            {sweep && g.type === 'point' && resultOrder.find(other => other.geometry.type === 'point' && samePoint(other.geometry.point, g.point)) === result &&
              <text {...pointLabelProps(g.point)} className="result-label" x={px(g.point) + 12} y={py(g.point) - 12}>{sweep.labelPoint(g.point)}</text>}
            {sweep && g.type === 'overlap' && <text className="result-label" textAnchor="middle" x={(px(g.start) + px(g.end)) / 2} y={(py(g.start) + py(g.end)) / 2 - 12}>重叠区间 {pairName(result)}</text>}
          </g>
        })}
        {sweep && highlights?.points.filter(p => eventPoints.some(visible => samePoint(p, visible))).map(p =>
          <circle key={formatPoint(p)} className="hover-event" cx={px(p)} cy={py(p)} r={15} />)}
        {numberedPoints.map(point => <g key={point.name} className="order-marker" role="img" aria-label={point.name}>
          <line className="order-leader" x1={point.x} y1={point.y} x2={point.x + 8} y2={point.y - 12} />
          <circle cx={point.x} cy={point.y} r={3} />
          <text className="order-number" x={point.x + 12} y={point.y - 12}>{point.label}</text>
        </g>)}
      </g>
    </svg>
    </Card.Content>
    <Separator />
    <Card.Footer className="legend text-muted"><span>蓝色：输入</span><span>橙色：交集</span>
      {sweep ? <><span>加粗：活动线段</span><span>虚线圆：待处理交点</span><span>紫色：扫描线与当前事件</span><span>扫描方向：从左向右</span></> : <span>菱形：零长度输入</span>}
    </Card.Footer>
  </Card></section>
}
