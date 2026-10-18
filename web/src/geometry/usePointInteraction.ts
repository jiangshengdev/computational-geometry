import { useLinkedInteraction } from './useLinkedInteraction'
import { samePoint, type Point } from './geometry'

type PointTarget = { point: Point; source: 'plot' | 'list' }

export function usePointInteraction() {
  return useLinkedInteraction<PointTarget>((a, b) => samePoint(a.point, b.point))
}

export type PointInteraction = ReturnType<typeof usePointInteraction>
