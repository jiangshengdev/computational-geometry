import type { SweepStep } from './geometry'

export function executionNavigation(steps: readonly SweepStep[], index: number) {
  const execution = steps[index].execution
  const caller = execution.outer.at(-1)
  let stepOver = -1
  let stepOut = -1
  for (let position = index + 1; position < steps.length; position++) {
    const next = steps[position].execution
    const resumesCaller = caller !== undefined && next.context.id === caller.id
    if (stepOut < 0 && resumesCaller) stepOut = position
    // Callback resumes are visible to step-into/out and backwards navigation.
    // Stepping over the enclosing operation waits for that operation to finish.
    if (stepOver < 0 && (resumesCaller || (!execution.returning && next.context.id === execution.context.id && !next.resuming))) stepOver = position
    if (stepOver >= 0 && (!caller || stepOut >= 0)) break
  }
  return { stepOver, stepOut }
}
