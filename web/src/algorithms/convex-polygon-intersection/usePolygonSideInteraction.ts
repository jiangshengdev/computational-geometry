import { useState } from 'react'
import { useLinkedInteraction } from '../../geometry/useLinkedInteraction'
import type { PolygonStep } from './trace'

export const boundaryColor = (boundary: number) => boundary === 0 ? 'var(--accent)' : 'var(--warning)'

export function hasSideRelation(step: PolygonStep | undefined): step is PolygonStep & {
  edges: NonNullable<PolygonStep['edges']>; relation: NonNullable<PolygonStep['relation']>
} {
  return Boolean(step?.edges && step.relation && ['relation', 'collect', 'inside'].includes(step.action))
}

export function usePolygonSideInteraction(step: PolygonStep | undefined) {
  const interaction = useLinkedInteraction<number>((a, b) => a === b)
  const [previousStep, setPreviousStep] = useState(step)
  // Reset during rendering so even browser history and slider previews cannot revive an old selection.
  if (previousStep !== step) {
    setPreviousStep(step)
    interaction.clear()
  }
  return interaction
}
export type PolygonSideInteraction = ReturnType<typeof usePolygonSideInteraction>
