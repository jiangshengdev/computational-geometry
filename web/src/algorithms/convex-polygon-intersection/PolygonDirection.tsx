import { useId, useLayoutEffect, useRef } from 'react'
import { useLingui } from '@lingui/react/macro'
import { DirectionArc } from '../../geometry/DirectionArc'
import { directionColor, type Position } from '../../geometry/direction'
import type { Point, Rational } from '../../geometry/geometry'
import { DirectedLine } from '../convex-hull/HullDirection'
import { boundaryColor } from './usePolygonSideInteraction'
import type { Side } from './trace'
import { nearestLabelPosition } from '../../geometry/labelPlacement'

type Edge<T> = [T, T]

export function PolygonDirection({ edges, position, turn, width, height }: {
  edges: [Edge<Point>, Edge<Point>]; position: (point: Point) => Position
  turn: Side; width: number; height: number
}) {
  const { t } = useLingui()
  const id = useId()
  const labelRef = useRef<SVGTextElement>(null)
  const positions = edges.map(([start, end]) => [position(start), position(end)] as const)
  const [a, b] = positions.map(([start, end]) => ({ x: end.x - start.x, y: end.y - start.y }))
  const determinant = a.x * b.y - a.y * b.x
  const offset = { x: positions[1][0].x - positions[0][0].x, y: positions[1][0].y - positions[0][0].y }
  // Approximation is only used to place the drawing; the turn comes from the Rust trace.
  const distance = (offset.x * b.y - offset.y * b.x) / determinant
  const intersection = { x: positions[0][0].x + distance * a.x, y: positions[0][0].y + distance * a.y }
  const inView = turn !== 'collinear' && Number.isFinite(intersection.x) && Number.isFinite(intersection.y)
    && intersection.x >= 0 && intersection.x <= width && intersection.y >= 0 && intersection.y <= height
  const origin = inView ? intersection : { x: 100, y: height - 110 }
  const unit = (v: Position) => {
    const length = Math.hypot(v.x, v.y)
    return length > 0 ? { x: v.x / length, y: v.y / length } : { x: 0, y: 0 }
  }
  const directions = [unit(a), unit(b)]
  const shift = (v: Position, length: number): Position => ({ x: origin.x + v.x * length, y: origin.y + v.y * length })
  // Parallel direction uses exact input coordinates, including when drawing coordinates collapse.
  const delta = (start: Rational, end: Rational) => BigInt(end.numerator) * BigInt(start.denominator) - BigInt(start.numerator) * BigInt(end.denominator)
  const signs = edges.map(([start, end]) => delta(start.x, end.x) || delta(start.y, end.y))
  const sameDirection = (signs[0] > 0n) === (signs[1] > 0n)
  const label = turn === 'left' ? t`A as reference: turn left toward B`
    : turn === 'right' ? t`A as reference: turn right toward B`
      : sameDirection ? t`A as reference: B points in the same direction` : t`A as reference: B points in the opposite direction`
  const color = directionColor(turn)
  const textX = inView ? origin.x + 45 : 24
  const textY = inView ? origin.y - 45 : height - 205
  useLayoutEffect(() => {
    const text = labelRef.current!
    const svg = text.ownerSVGElement!
    text.removeAttribute('transform')
    const box = text.getBBox()
    const bounds = svg.getBoundingClientRect()
    const gap = 6
    const occupied = Array.from(svg.parentElement!.querySelectorAll(
      '[data-layer="labels"] text, [data-side-label], [data-edge-direction] g text',
    )).map(element => element.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0)
      .map(rect => ({ x: rect.x - bounds.x, y: rect.y - bounds.y, width: rect.width, height: rect.height }))
    occupied.push({ x: origin.x - 32, y: origin.y - 32, width: 64, height: 64 })
    const left = Math.max(gap, Math.min(width - box.width - gap, box.x))
    const top = Math.max(gap, Math.min(height - box.height - gap, box.y))
    const lefts = [left, origin.x - box.width - 45, ...occupied.flatMap(rect => [rect.x - box.width - gap, rect.x + rect.width + gap])]
    const tops = [top, origin.y + 45, ...occupied.flatMap(rect => [rect.y - box.height - gap, rect.y + rect.height + gap])]
    const placement = nearestLabelPosition(lefts, tops, { x: left, y: top }, candidate =>
      candidate.left >= gap && candidate.left + box.width <= width - gap
      && candidate.top >= gap && candidate.top + box.height <= height - gap
      // Keep the annotation local to its turn, even when avoiding endpoint labels.
      && Math.hypot(Math.max(candidate.left - origin.x, origin.x - candidate.left - box.width, 0),
        Math.max(candidate.top - origin.y, origin.y - candidate.top - box.height, 0)) <= 120
      && !occupied.some(rect => candidate.left < rect.x + rect.width + gap && candidate.left + box.width + gap > rect.x
        && candidate.top < rect.y + rect.height + gap && candidate.top + box.height + gap > rect.y))
    text.setAttribute('transform', `translate(${(placement?.left ?? left) - box.x} ${(placement?.top ?? top) - box.y})`)
  })
  return <svg className="polygon-angle-overlay" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}
    data-edge-direction={turn} data-direction-placement={inView ? 'intersection' : 'inset'}>
    <defs>{[boundaryColor(0), boundaryColor(1), color].map((fill, index) => <marker key={index} id={`${id}-${index}`}
      viewBox="0 0 8 8" refX="8" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 Z" fill={fill} />
    </marker>)}</defs>
    {directions.map((direction, index) => {
      const start = turn === 'collinear'
        ? { x: origin.x - directions[0].y * index * 22, y: origin.y + directions[0].x * index * 22 } : origin
      const end = { x: start.x + direction.x * 72, y: start.y + direction.y * 72 }
      return <g key={index}>
        {inView && <line x1={positions[index][0].x} y1={positions[index][0].y} x2={origin.x} y2={origin.y}
          stroke={boundaryColor(index)} strokeWidth="1" strokeDasharray="4 4" />}
        <DirectedLine from={start} to={end} scale={1} stroke={boundaryColor(index)} strokeWidth="2" markerEnd={`url(#${id}-${index})`} />
        <text x={end.x + 8} y={end.y} fontSize="12" fill={boundaryColor(index)} stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">{index === 0 ? 'A' : 'B'}</text>
      </g>
    })}
    <DirectionArc positions={[shift(directions[0], -90), origin, shift(directions[1], 90)]} turn={turn} scale={1} markerId={`${id}-2`} />
    <text ref={labelRef} x={textX} y={textY} fontSize="13" fontWeight="600" fill={color} stroke="var(--surface)" strokeWidth="4" paintOrder="stroke">{label}</text>
  </svg>
}
