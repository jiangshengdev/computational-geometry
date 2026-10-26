import { type SweepStep } from './trace'

export type EventSide = 'left' | 'right' | null

/** Projection side is tied to the real block-update boundary. */
export function eventSide(step: SweepStep, _next?: SweepStep): EventSide {
  if (!step.current) return null
  if (step.execution.module === 'take' || step.execution.module === 'done') return 'right'
  const { module, boundary } = step.execution
  if ((module === 'event' || module === 'update') && boundary === 0) return 'left'
  if ((module === 'driver' && (boundary === 6 || boundary === 7)) || module === 'certificate' || (module === 'update' && boundary === 1)
    || (module === 'event' && boundary === 2)) return 'right'
  return null
}
