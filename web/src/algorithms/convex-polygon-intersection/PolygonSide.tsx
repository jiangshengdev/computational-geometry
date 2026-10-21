import { useId } from 'react'
import { useLingui } from '@lingui/react/macro'
import { Button } from '@heroui/react/button'
import { DirectionArc } from '../../geometry/DirectionArc'
import { directionColor, type Position } from '../../geometry/direction'
import { DirectedLine } from '../convex-hull/HullDirection'
import type { PolygonStep, Side } from './trace'
import { hasSideRelation, type PolygonSideInteraction } from './usePolygonSideInteraction'

/** The key identifies the checked point's polygon; the reference edge is the other polygon. */
export function PolygonSideLabel({ step, boundary, interaction }: {
  step: PolygonStep; boundary: number; interaction: PolygonSideInteraction
}) {
  const { t } = useLingui()
  if (!hasSideRelation(step)) return null
  const side = boundary === 0 ? step.relation.first_side : step.relation.second_side
  const point = `${boundary === 0 ? 'A' : 'B'}${step.edges[boundary][1]}`
  const reference = boundary === 0 ? 'B' : 'A'
  const text = side === 'left' ? t`${point}: left side of ${reference}`
    : side === 'right' ? t`${point}: right side of ${reference}` : t`${point}: on the supporting line of ${reference}`
  return <Button size="sm" variant="tertiary" className="polygon-side-label" data-side-label={boundary} data-active={interaction.active === boundary}
    style={{ color: directionColor(side) }} aria-pressed={interaction.selected === boundary}
    onHoverStart={() => interaction.hover(boundary)} onHoverEnd={() => interaction.hover(null)}
    onFocus={() => interaction.hover(boundary)} onBlur={() => interaction.hover(null)}
    onPress={() => interaction.select(boundary)}>{text}</Button>
}

export function PolygonSideGuide({ positions: [a, b, point], side, scale, boundary }: {
  positions: [Position, Position, Position]; side: Side; scale: number; boundary: number
}) {
  const markerId = useId()
  const color = directionColor(side)
  return <g data-side-guide={boundary} pointerEvents="none">
    <defs><marker id={markerId} viewBox="0 0 8 8" refX="8" refY="4" markerWidth={7 / scale} markerHeight={7 / scale} markerUnits="userSpaceOnUse" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 Z" fill={color} />
    </marker></defs>
    <DirectedLine from={b} to={point} scale={scale} stroke={color} strokeWidth={1.5 / scale}
      strokeDasharray={`${4 / scale} ${3 / scale}`} markerEnd={`url(#${markerId})`} />
    <DirectionArc positions={[a, b, point]} turn={side} scale={scale} markerId={markerId} />
  </g>
}
