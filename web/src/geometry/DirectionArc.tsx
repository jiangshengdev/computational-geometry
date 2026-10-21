import { directionColor, type Position, type Direction } from './direction'

/** Draw a turn from the incoming direction, not from the reversed incoming ray. */
export function DirectionArc({ positions: [a, b, c], turn, scale, markerId }: {
  positions: [Position, Position, Position]; turn: Direction; scale: number; markerId: string
}) {
  const color = directionColor(turn)
  const incoming = Math.atan2(b.y - a.y, b.x - a.x)
  const outgoing = Math.atan2(c.y - b.y, c.x - b.x)
  const radius = Math.min(28 / scale, Math.hypot(b.x - a.x, b.y - a.y) / 3, Math.hypot(c.x - b.x, c.y - b.y) / 3)
  const start = { x: b.x + radius * Math.cos(incoming), y: b.y + radius * Math.sin(incoming) }
  const end = { x: b.x + radius * Math.cos(outgoing), y: b.y + radius * Math.sin(outgoing) }
  if (turn === 'collinear' || radius <= 0) return null
  return <>
    <line x1={b.x} y1={b.y} x2={b.x + (radius + 12 / scale) * Math.cos(incoming)} y2={b.y + (radius + 12 / scale) * Math.sin(incoming)}
      stroke={color} strokeOpacity="0.5" strokeWidth={1.5 / scale} strokeDasharray={`${4 / scale} ${3 / scale}`} />
    {/* SVG y increases downwards: a mathematical left turn sweeps counterclockwise (0). */}
    <path data-turn-arc={turn} d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${turn === 'left' ? 0 : 1} ${end.x} ${end.y}`}
      fill="none" stroke={color} strokeWidth={2 / scale} markerEnd={`url(#${markerId})`} />
  </>
}
