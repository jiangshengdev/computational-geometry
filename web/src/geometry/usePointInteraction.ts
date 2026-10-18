import { useState } from 'react'
import { samePoint, type Point } from './geometry'

type PointTarget = { point: Point; source: 'plot' | 'list' }

export function usePointInteraction() {
  const [hovered, setHovered] = useState<PointTarget | null>(null)
  const [selected, setSelected] = useState<PointTarget | null>(null)
  const active = hovered ?? selected
  return {
    active,
    selected,
    hover: (target: PointTarget | null) => setHovered(target),
    select: (target: PointTarget) => setSelected(previous => previous && samePoint(previous.point, target.point) ? null : target),
    clear: () => { setHovered(null); setSelected(null) },
  }
}

export type PointInteraction = ReturnType<typeof usePointInteraction>
