import { samePoint, type SweepStep } from './geometry'

export type EventSide = 'left' | 'right' | null

/** The trace updates the whole incident block before insert/reorder/check.
 * Removal alone can precede that update, so inspect its next event-local action.
 * These sides describe this event, not a geometric cut across every equal-x event.
 */
export function eventSide(step: SweepStep, next?: SweepStep): EventSide {
  if (!step.current || step.action === 'initial' || step.action === 'record') return null
  if (step.action === 'take') return 'left'
  if (step.action === 'remove' && next?.current && samePoint(step.current, next.current)
    && (next.action === 'insert' || next.action === 'reorder')) return null
  return 'right'
}
