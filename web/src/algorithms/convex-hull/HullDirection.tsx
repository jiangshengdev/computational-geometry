import { useId, type SVGProps } from 'react'
import { useLingui } from '@lingui/react/macro'
import type { HullStep } from './trace'

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
  const color = turn === 'left' ? 'var(--success)' : turn === 'right' ? 'var(--danger)' : 'var(--warning)'
  const label = turn === 'left' ? t`Left turn · keep` : turn === 'right' ? t`Right turn · pending pop` : t`Collinear · pending middle-point pop`
  const incoming = Math.atan2(b.y - a.y, b.x - a.x)
  const outgoing = Math.atan2(c.y - b.y, c.x - b.x)
  const radius = Math.min(28 / scale, Math.hypot(b.x - a.x, b.y - a.y) / 3, Math.hypot(c.x - b.x, c.y - b.y) / 3)
  const start = { x: b.x + radius * Math.cos(incoming), y: b.y + radius * Math.sin(incoming) }
  const end = { x: b.x + radius * Math.cos(outgoing), y: b.y + radius * Math.sin(outgoing) }
  return <g data-turn={turn} pointerEvents="none" aria-label={label}>
    <defs><marker id={markerId} viewBox="0 0 8 8" refX="8" refY="4" markerWidth={7 / scale} markerHeight={7 / scale} markerUnits="userSpaceOnUse" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 Z" fill={color} />
    </marker></defs>
    <DirectedLine from={a} to={b} scale={scale} stroke={color} strokeWidth={2.5 / scale} markerEnd={`url(#${markerId})`} />
    <DirectedLine from={b} to={c} scale={scale} stroke={color} strokeWidth={2.5 / scale} markerEnd={`url(#${markerId})`} />
    {turn !== 'collinear' && radius > 0 && <>
      <line x1={b.x} y1={b.y} x2={b.x + (radius + 12 / scale) * Math.cos(incoming)} y2={b.y + (radius + 12 / scale) * Math.sin(incoming)}
        stroke={color} strokeOpacity="0.5" strokeWidth={1.5 / scale} strokeDasharray={`${4 / scale} ${3 / scale}`} />
      {/* SVG y increases downwards: a mathematical left turn sweeps counterclockwise (0). */}
      <path data-turn-arc={turn} d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${turn === 'left' ? 0 : 1} ${end.x} ${end.y}`}
        fill="none" stroke={color} strokeWidth={2 / scale} markerEnd={`url(#${markerId})`} />
    </>}
    <text transform={`rotate(${-angle} ${b.x} ${b.y})`} x={b.x + 40 / scale} y={b.y + 22 / scale} fontSize={13 / scale} fontWeight="600"
      fill={color} stroke="var(--surface)" strokeWidth={4 / scale} strokeLinejoin="round" paintOrder="stroke">{label}</text>
  </g>
}
