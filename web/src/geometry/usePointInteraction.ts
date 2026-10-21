import { useLinkedInteraction } from './useLinkedInteraction'
import { samePoint, type Point } from './geometry'

type PointTarget = { point: Point; source: 'plot' | 'list' } | { points: Point[]; source: 'panel'; panel: string }

export function includesPoint(target: PointTarget | null | undefined, point: Point) {
  return target?.source === 'panel' ? target.points.some(candidate => samePoint(candidate, point))
    : Boolean(target && samePoint(target.point, point))
}

export function usePointInteraction() {
  return useLinkedInteraction<PointTarget>((a, b) => a.source === 'panel'
    ? b.source === 'panel' && a.panel === b.panel
    : b.source !== 'panel' && samePoint(a.point, b.point))
}

export type PointInteraction = ReturnType<typeof usePointInteraction>
