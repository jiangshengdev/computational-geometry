import { useState } from 'react'
import { samePoint, type Point } from '../../geometry/geometry'

type HullTarget = { point: Point; source: 'plot' | 'list' }

export function useHullInteraction() {
  const [hovered, setHovered] = useState<HullTarget | null>(null)
  const [selected, setSelected] = useState<HullTarget | null>(null)
  const active = hovered ?? selected
  return {
    active,
    selected,
    hover: (target: HullTarget | null) => setHovered(target),
    select: (target: HullTarget) => setSelected(previous => previous && samePoint(previous.point, target.point) ? null : target),
    clear: () => { setHovered(null); setSelected(null) },
  }
}

export type HullInteraction = ReturnType<typeof useHullInteraction>
