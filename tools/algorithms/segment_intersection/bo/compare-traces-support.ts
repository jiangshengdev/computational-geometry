import type { ExecutionVariable, SweepStep } from '../../../../web/src/algorithms/segment-intersection/bo/learning/trace.ts'

/** Resolve transport dictionary positions without dropping any observable field. */
export function semanticStep(step: SweepStep, values: string[]) {
  const variable = (value: ExecutionVariable) => {
    if (value.value !== null && values[value.value] === undefined) throw new Error(`Invalid variable index: ${value.value}`)
    return { ...value, value: value.value === null ? null : values[value.value] }
  }
  const context = (value: SweepStep['execution']['context']) => ({
    ...value,
    parameters: value.parameters.map(variable),
    captures: value.captures.map(variable),
    locals: value.locals.map(variable),
  })
  return { ...step, execution: {
    ...step.execution,
    context: context(step.execution.context),
    outer: step.execution.outer.map(context),
    calls: step.execution.calls.map(call => ({ ...call, arguments: call.arguments.map(variable), result: variable(call.result) })),
  } }
}

/** First differing field, preserving array order and distinguishing missing keys. */
export function difference(expected: unknown, actual: unknown, path = '$'): string | undefined {
  if (Object.is(expected, actual)) return undefined
  if (expected === null || actual === null || typeof expected !== 'object' || typeof actual !== 'object') return path
  if (Array.isArray(expected) !== Array.isArray(actual)) return path
  if (Array.isArray(expected) && Array.isArray(actual) && expected.length !== actual.length) return `${path}.length`
  const left = expected as Record<string, unknown>
  const right = actual as Record<string, unknown>
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const field = Array.isArray(expected) ? `${path}[${key}]` : `${path}.${key}`
    if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) return field
    const found = difference(left[key], right[key], field)
    if (found) return found
  }
}
