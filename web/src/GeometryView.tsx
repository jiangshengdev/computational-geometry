import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { scaleLinear, select, zoom, zoomIdentity, type ZoomTransform } from 'd3'
import { approximate, formatPoint, formatRational, pairName, samePoint, type Intersection, type Point, type Segment } from './geometry'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { HoverHighlights, HoverTarget } from './hover'

interface Props {
  segments: Segment[]; results: Intersection[]; selected: Intersection | null
  highlights?: HoverHighlights | null
  onHover?: (target: HoverTarget | null) => void
  sweep?: { current: Point | null; active: number[]; pending: Point[]; numbering: 'active' | 'pending' | null; checked: number[]; discovered: { point: Point; label: string }[]; labelPoint: (point: Point) => string }
}

export function GeometryView({ segments, results, selected, sweep, highlights, onHover }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(800)
  const height = 460
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
  const xs = points.map(p => approximate(p.x)), ys = points.map(p => approximate(p.y))
  const minX = Math.min(0, ...xs), maxX = Math.max(1, ...xs)
  const minY = Math.min(0, ...ys), maxY = Math.max(1, ...ys)
  const unit = Math.min((width - 100) / (maxX - minX), (height - 100) / (maxY - minY))
  const x = scaleLinear().domain([minX, maxX]).range([width / 2 - (maxX - minX) * unit / 2, width / 2 + (maxX - minX) * unit / 2])
  const y = scaleLinear().domain([minY, maxY]).range([height / 2 + (maxY - minY) * unit / 2, height / 2 - (maxY - minY) * unit / 2])
  const px = (p: Point) => x(approximate(p.x)), py = (p: Point) => y(approximate(p.y))
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

  useEffect(() => {
    const element = svg.current!
    behavior.current.on('zoom', event => setTransform(event.transform))
    select(element).call(behavior.current).on('wheel.zoom', null)
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    observer.observe(element)
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
      let top = box.y
      let collisions
      do {
        collisions = occupied.filter(other =>
          box.x < other.x + other.width + gap && box.x + box.width + gap > other.x &&
          top < other.y + other.height + gap && top + box.height + gap > other.y)
        if (collisions.length) top = Math.min(...collisions.map(other => other.y)) - box.height - gap
      } while (collisions.length)
      label.setAttribute('transform', `translate(0, ${top - box.y})`)
      const leader = label.parentElement?.querySelector('.order-leader')
      if (leader) {
        leader.setAttribute('x2', String(box.x - 4))
        leader.setAttribute('y2', String(top + box.height / 2))
      }
      occupied.push(new DOMRect(box.x, top, box.width, box.height))
    })
  })

  return <section className="drawing" aria-label="几何视图"><Card className="gap-0 overflow-hidden py-0">
    <CardHeader className="drawing-toolbar"><CardTitle><h2>原始坐标平面 · 等比例</h2></CardTitle><div className="flex gap-2">
      <Button variant="outline" size="icon-sm" onClick={() => select(svg.current!).call(behavior.current.scaleBy, 1.4)} aria-label="放大">＋</Button>
      <Button variant="outline" size="icon-sm" onClick={() => select(svg.current!).call(behavior.current.scaleBy, 1 / 1.4)} aria-label="缩小">−</Button>
      <Button variant="outline" size="sm" onClick={() => select(svg.current!).call(behavior.current.transform, zoomIdentity)}>重置视图</Button>
    </div></CardHeader>
    <Separator />
    <CardContent className="p-0">
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
    </CardContent>
    <Separator />
    <CardFooter className="legend text-muted-foreground"><span>蓝色：输入</span><span>橙色：交集</span>
      {sweep ? <><span>加粗：活动线段</span><span>虚线圆：待处理交点</span><span>紫色：扫描线与当前事件</span><span>扫描方向：从左向右</span></> : <span>菱形：零长度输入</span>}
      <span>按钮缩放 · 拖动平移</span></CardFooter>
  </Card></section>
}
