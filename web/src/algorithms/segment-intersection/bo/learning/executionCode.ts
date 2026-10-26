import type { ExecutionState, SweepStep } from './trace'
import type { I18n, MessageDescriptor } from '@lingui/core'

export function translatedTeachingCode(module: TeachingModule, _translate: I18n['_']) {
  return module.code
}

interface InlineClosure {
  module: string
  line: number
  start: number
  end: number
  lines: number[]
  parameterColumn: number
}

export interface TeachingModule {
  title: MessageDescriptor
  code: string
  traceLines: number[]
  boundaryLines: number[]
  closures: InlineClosure[]
}

function teachingModule(title: MessageDescriptor, operations: (string | { code: string; closure: string })[], stops: readonly (readonly [line: number, offset?: number])[]): TeachingModule {
  const code: string[] = []
  const traceLines: number[] = []
  // Explanations add display lines without changing statement or closure identities.
  const sourceLines = operations.map((operation, index) => {
    const lines: number[] = []
    for (const text of (typeof operation === 'string' ? operation : operation.code).split('\n')) {
      const explanation = text.trimStart().startsWith('//')
      if (explanation && code.length && code.at(-1) !== '') {
        code.push('')
        traceLines.push(index + 1)
      }
      if (!explanation) lines.push(code.length)
      code.push(text)
      traceLines.push(index + 1)
    }
    return lines
  })
  const boundaryLines = stops.map(([line, offset = 0]) => line > operations.length ? code.length : sourceLines[line - 1][offset])
  const closures = operations.flatMap((operation, index) => typeof operation === 'string' ? [] : [{
    module: operation.closure, line: index + 1, start: sourceLines[index][0], end: sourceLines[index].at(-1)!,
    lines: sourceLines[index], parameterColumn: code[sourceLines[index][0]].indexOf('|'),
  }])
  return { title, code: code.join('\n'), traceLines, boundaryLines, closures }
}

// Array positions are trace identities; formatting within an entry must not renumber them.
export const teachingModules: Record<string, TeachingModule> = {
  driver: teachingModule(/*i18n*/ { id: "Support lines and coverage", message: "Support lines and coverage" }, [
    'let groups = prepare(segments, shear, result);',
    'initialize_fixed_events(groups.covers, point_inputs);',
    'let next = queue.pop();',
    'let members = recover_members(groups, incident, point, segments);',
    'report_cross_line_and_point_pairs(members);',
    'update_block_and_certificates(incident, point);',
    'let candidate = schedule(groups, queue, edge, point);',
    'continue_with_next_final_edge();',
  ], [[1], [2], [3], [4], [5], [6], [7], [8]]),
  take: teachingModule(/*i18n*/ { id: "Take an event", message: "Take an event" }, ['let next = queue.pop();', 'let Some((point, event)) = next else { break; };'], [[1], [2]]),
  initial: teachingModule(/*i18n*/ { id: "Take an event", message: "Take an event" }, ['let groups = prepare(segments, shear, result);'], [[1]]),
  prepare: teachingModule(/*i18n*/ { id: "Support lines and coverage", message: "Support lines and coverage" }, [
    'let groups = group_lines_and_index(segments, shear, result);',
    'let groups = Groups { lines, covers };',
    'return groups;',
  ], [[1], [2], [4], [3]]),
  line_group: teachingModule(/*i18n*/ { id: "Support lines and coverage", message: "Support lines and coverage" }, [
    'let line_members = group_by_support_line(segments);',
    'let cover = merge_closed_intervals(line_members);',
    'let indexed_members = centered_interval_tree(line_members);',
  ], [[2], [3], [4]]),
  same_line: teachingModule(/*i18n*/ { id: "Pair and record", message: "Pair and record" }, ['result.push(Intersection { segments: pair, geometry });'], [[1], [2]]),
  event: teachingModule(/*i18n*/ { id: "Classify incident segments", message: "Classify incident segments" }, [
    'let incident = equal_height_block(point).chain(event.starts);',
    'report_cross_line_and_point_pairs(incident, event.points);',
    'update_block_and_certificates(incident, point);',
  ], [[1], [2], [4]]),
  members: teachingModule(/*i18n*/ { id: "Recover original members", message: "Recover original members" }, [
    'let members = query_each_incident_line(incident, point);',
    'return members;',
  ], [[1], [2], [3], [2]]),
  report: teachingModule(/*i18n*/ { id: "Pair and record", message: "Pair and record" }, ['result.push(Intersection { segments: pair, geometry });'], [[1], [2]]),
  update: teachingModule(/*i18n*/ { id: "Update the active set", message: "Update the active set" }, [
    'cancel_old_adjacencies(incident);',
    'remove_left_order_then_insert_right_order(incident);',
    'schedule_final_adjacencies(incident);',
  ], [[2], [3]]),
  certificate: teachingModule(/*i18n*/ { id: "Neighbor checks", message: "Neighbor checks" }, [
    'let candidate = intersection_candidate(edge);',
    'enqueue_strictly_future(candidate, point);',
    'return candidate;',
  ], [[1], [2], [4], [3]]),
  done: teachingModule(/*i18n*/ { id: "Pair and record", message: "Pair and record" }, ['return result;'], [[1]]),
}

const closureModules = new Map(Object.values(teachingModules).flatMap(module => module.closures.map(closure => [closure.module, module] as const)))

// Map the trace boundary to its location in the displayed teaching source.
export function executionBoundary(execution: ExecutionState) {
  if (execution.boundary === null) return undefined
  return closureModules.has(execution.module) ? execution.boundary : teachingModules[execution.module]?.boundaryLines[execution.boundary]
}

export function executionSource(steps: readonly SweepStep[], index: number) {
  const step = steps[index]
  const closureModule = closureModules.get(step.execution.module)
  if (!closureModule) return {
    module: teachingModules[step.execution.module], caller: step, closure: undefined,
    boundaryLine: executionBoundary(step.execution) ?? 0,
  }
  const callerId = step.execution.outer.at(-1)!.id
  let callerIndex = index - 1
  while (callerIndex >= 0 && steps[callerIndex].execution.context.id !== callerId) callerIndex--
  const caller = steps[callerIndex]
  const callLine = closureModule.traceLines[executionBoundary(caller.execution)!]
  const locations = closureModule.closures.filter(closure => closure.module === step.execution.module)
  // retain-end occurs at two different statements; original is declared once
  // and called from several later expressions. Match the actual call site only
  // when a closure has more than one displayed definition.
  const closure = locations.length === 1 ? locations[0] : locations.find(location => location.line === callLine)!
  return { module: closureModule, caller, closure,
    boundaryLine: step.execution.returning ? closure.end : closure.lines[1] }
}
