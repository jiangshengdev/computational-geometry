import type { SweepStep } from './geometry'
import { executionBoundary } from './executionCode'

export function executionNavigation(steps: readonly SweepStep[], index: number) {
  const execution = steps[index].execution
  const caller = execution.outer.at(-1)
  const ancestors = new Set(execution.outer.map(frame => frame.id))
  const statement = executionBoundary(execution)
  let stepOver = -1
  let stepOut = -1
  for (let position = index + 1; position < steps.length; position++) {
    const next = steps[position].execution
    if (stepOut < 0 && caller && next.context.id === caller.id) stepOut = position
    if (stepOver < 0) {
      if (execution.returning) {
        if (caller && next.context.id === caller.id) stepOver = position
      } else if (!next.returning && (ancestors.has(next.context.id) || (
        next.context.id === execution.context.id &&
        (next.module !== execution.module || (next.boundary !== null && executionBoundary(next) !== statement))
      ))) stepOver = position
    }
    if (stepOver >= 0 && (!caller || stepOut >= 0)) break
  }
  return { stepOver, stepOut }
}
