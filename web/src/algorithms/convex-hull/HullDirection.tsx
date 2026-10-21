import { useId, type SVGProps } from 'react'
import { useLingui } from '@lingui/react/macro'
import type { HullStep } from './trace'
import { DirectionArc } from '../../geometry/DirectionArc'
import { directionColor } from '../../geometry/direction'

type Position = { x: number; y: number }

export function DirectedLine({ from, to, scale, ...props }: Omit<SVGProps<SVGLineElement>, 'from' | 'to'> & {
  from: Position; to: Position; scale: number
}) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return null
  const inset = Math.min(8 / scale, length / 4)
  return <line {...props}
    x1={from.x + dx * inset / length} y1={from.y + dy * inset / length}
    x2={to.x - dx * inset / length} y2={to.y - dy * inset / length} />
}

export function HullTurnIndicator({ positions: [a, b, c], turn, scale, angle }: {
  positions: [Position, Position, Position]; turn: NonNullable<HullStep['turn']>; scale: number; angle: number
}) {
  const { t } = useLingui()
  const markerId = useId()
  const color = directionColor(turn)
  const label = turn === 'left' ? t`Left turn · keep` : turn === 'right' ? t`Right turn · pending pop` : t`Collinear · pending middle-point pop`
  return <g data-turn={turn} pointerEvents="none" aria-label={label}>
    <defs><marker id={markerId} viewBox="0 0 8 8" refX="8" refY="4" markerWidth={7 / scale} markerHeight={7 / scale} markerUnits="userSpaceOnUse" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 Z" fill={color} />
    </marker></defs>
    <DirectedLine from={a} to={b} scale={scale} stroke={color} strokeWidth={2.5 / scale} markerEnd={`url(#${markerId})`} />
    <DirectedLine from={b} to={c} scale={scale} stroke={color} strokeWidth={2.5 / scale} markerEnd={`url(#${markerId})`} />
    <DirectionArc positions={[a, b, c]} turn={turn} scale={scale} markerId={markerId} />
    <text transform={`rotate(${-angle} ${b.x} ${b.y})`} x={b.x + 40 / scale} y={b.y + 22 / scale} fontSize={13 / scale} fontWeight="600"
      fill={color} stroke="var(--surface)" strokeWidth={4 / scale} strokeLinejoin="round" paintOrder="stroke">{label}</text>
  </g>
}
