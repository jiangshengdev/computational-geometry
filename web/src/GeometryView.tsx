import { useEffect, useRef, useState } from 'react'
import { scaleLinear, select, zoom, zoomIdentity, type ZoomTransform } from 'd3'
import { approximate, pairName, samePoint, type Intersection, type Point, type Segment } from './geometry'

interface Props { segments: Segment[]; results: Intersection[]; selected: Intersection | null }

export function GeometryView({ segments, results, selected }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const behavior = useRef(zoom<SVGSVGElement, unknown>().scaleExtent([0.25, 40]))
  const points = segments.flatMap(s => [s.start, s.end])
  const xs = points.map(p => approximate(p.x)), ys = points.map(p => approximate(p.y))
  const minX = Math.min(0, ...xs), maxX = Math.max(1, ...xs)
  const minY = Math.min(0, ...ys), maxY = Math.max(1, ...ys)
  const unit = Math.min(660 / (maxX - minX), 380 / (maxY - minY))
  const x = scaleLinear().domain([minX, maxX]).range([400 - (maxX - minX) * unit / 2, 400 + (maxX - minX) * unit / 2])
  const y = scaleLinear().domain([minY, maxY]).range([250 + (maxY - minY) * unit / 2, 250 - (maxY - minY) * unit / 2])
  const px = (p: Point) => x(approximate(p.x)), py = (p: Point) => y(approximate(p.y))

  useEffect(() => {
    const element = svg.current!
    behavior.current.on('zoom', event => setTransform(event.transform))
    select(element).call(behavior.current)
    return () => { select(element).on('.zoom', null) }
  }, [])

  const ordered = segments.map((s, index) => ({ s, index }))
    .sort((a, b) => Number(selected?.segments.includes(a.index)) - Number(selected?.segments.includes(b.index)))
  const resultOrder = results.filter(r => r !== selected).concat(selected ? [selected] : [])

  return <section className="drawing" aria-label="几何视图">
    <div className="drawing-toolbar"><span>原始坐标平面 · 等比例</span><div>
      <button onClick={() => select(svg.current!).call(behavior.current.scaleBy, 1.4)} aria-label="放大">＋</button>
      <button onClick={() => select(svg.current!).call(behavior.current.scaleBy, 1 / 1.4)} aria-label="缩小">−</button>
      <button onClick={() => select(svg.current!).call(behavior.current.transform, zoomIdentity)}>重置视图</button>
    </div></div>
    <svg ref={svg} viewBox="0 0 800 500" aria-label="输入与交集坐标图" role="img">
      <g transform={transform.toString()}>
        {x.ticks(8).map(t => <g key={`x${t}`}><line className="grid" x1={x(t)} x2={x(t)} y1={20} y2={480} /><text className="tick" x={x(t)} y={490}>{t}</text></g>)}
        {y.ticks(6).map(t => <g key={`y${t}`}><line className="grid" x1={20} x2={780} y1={y(t)} y2={y(t)} /><text className="tick" x={12} y={y(t) - 5}>{t}</text></g>)}
        {ordered.map(({ s, index }) => {
          const active = selected?.segments.includes(index) ?? false
          return <g key={index} role="img" aria-label={`输入 S${index}${active ? '，已选中' : ''}`} className={`input ${active ? 'selected' : ''}`}>
            {samePoint(s.start, s.end)
              ? <path d={`M${px(s.start)},${py(s.start) - 7} l7,7 l-7,7 l-7,-7 Z`} />
              : <line x1={px(s.start)} y1={py(s.start)} x2={px(s.end)} y2={py(s.end)} />}
            <text x={px(s.start) + 9} y={py(s.start) - 10}>S{index}</text>
          </g>
        })}
        {resultOrder.map(result => {
          const g = result.geometry, active = result === selected
          return <g key={pairName(result)} role="img" aria-label={`交集 ${pairName(result)}${active ? '，已选中' : ''}`} className={`intersection ${active ? 'selected' : ''}`}>
            {g.type === 'point' ? <circle cx={px(g.point)} cy={py(g.point)} r={active ? 7 : 5} /> : <>
              <line x1={px(g.start)} y1={py(g.start)} x2={px(g.end)} y2={py(g.end)} />
              <circle cx={px(g.start)} cy={py(g.start)} r={5} /><circle cx={px(g.end)} cy={py(g.end)} r={5} />
            </>}
          </g>
        })}
      </g>
    </svg>
    <div className="legend"><span>蓝色：输入</span><span>橙色：交集</span><span>菱形：零长度输入</span><span>滚轮缩放 · 拖动平移</span></div>
  </section>
}
