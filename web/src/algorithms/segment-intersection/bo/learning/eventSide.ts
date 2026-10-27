import { type SweepStep } from './trace'

export type EventSide = 'left' | 'right' | null

/** Only the current event's block changes side. During detachment and member
 * updates the status intentionally contains neither complete side of that block.
 */
export function eventSide(step: SweepStep): EventSide {
  if (!step.current || step.action === 'initial' || step.action === 'record') return null
  if (step.action === 'take' || step.action === 'locate') return 'left'
  if (['detach', 'join', 'leave'].includes(step.action)) return null
  if (['insert', 'reorder', 'check', 'discover', 'complete'].includes(step.action)) return 'right'
  return null
}
