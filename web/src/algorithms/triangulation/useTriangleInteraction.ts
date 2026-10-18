import { useLinkedInteraction } from '../../geometry/useLinkedInteraction'

type TriangleTarget = { index: number; source: 'plot' | 'list' }

export function useTriangleInteraction() {
  return useLinkedInteraction<TriangleTarget>((a, b) => a.index === b.index)
}

export type TriangleInteraction = ReturnType<typeof useTriangleInteraction>
