import type { ExecutionState, SweepStep } from './trace'
import type { I18n, MessageDescriptor } from '@lingui/core'

const comments = new Map<string, MessageDescriptor>()

function comment(message: MessageDescriptor) {
  comments.set(message.message!, message)
  return message.message!
}

export function translatedTeachingCode(module: TeachingModule, translate: I18n['_']) {
  // A translated comment occupies the same display line as its source comment.
  return module.code.replace(/(?<=\/\/ )[^\n]+/g, text => translate(comments.get(text)!).replace(/[\r\n]+/g, ' '))
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

function teachingModule(title: MessageDescriptor, operations: (string | { code: string; closure: string })[], stops: readonly (readonly [line: number, offset?: number])[], identities?: readonly number[]): TeachingModule {
  const code: string[] = []
  const traceLines: number[] = []
  // Explanations add display lines without changing statement or closure identities.
  const sourceLines = operations.map((operation, index) => {
    const lines: number[] = []
    for (const text of (typeof operation === 'string' ? operation : operation.code).split('\n')) {
      const explanation = text.trimStart().startsWith('//')
      if (explanation && code.length && code.at(-1) !== '') {
        code.push('')
        traceLines.push(identities?.[index] ?? index + 1)
      }
      if (!explanation) lines.push(code.length)
      code.push(text)
      traceLines.push(identities?.[index] ?? index + 1)
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
  sweep: teachingModule(/*i18n*/ { id: 'Sweep event', message: 'Sweep event' }, [
    'let Located { groups: incident_groups, outside } = locate(&mut state, &point, &event);',
    'record(&mut state, &point, &event, &incident_groups);',
    'let inserted = update(&mut state, &point, &event, &incident_groups);',
    'check(&mut state, &point, &inserted, outside);',
    'publish_event();',
  ], [[1], [1], [2], [3], [4], [5]]),
  locate: teachingModule(/*i18n*/ { id: 'Locate incident groups', message: 'Locate incident groups' }, [
    'let (block, outside) = locate_equal_height(&active_groups, &groups, &point);',
    'let incident_groups = merge_start_groups(&block, &event.starts);',
    'for group in block {\n    active_groups.remove(group, Before);\n}',
    'return Located { groups: incident_groups, outside };',
  ], [[1], [3], [3, 2], [4], [2], [3, 1]], [0, 1, 2, 3]),
  members: teachingModule(/*i18n*/ { id: 'Record member intersections', message: 'Record member intersections' }, [
    `// ${comment(/*i18n*/ { id: 'Record each same-line pair when its later member starts.', message: 'Record each same-line pair when its later member starts.' })}
for id in event.starts {\n    let group = group_of[id];`,
    '    for other in groups[group].members {\n        let start = segments[id].left.max(segments[other].left);\n        let end = segments[id].right.min(segments[other].right);\n        let scan_geometry = if start == end {\n            Geometry::Point(start)\n        } else {\n            Geometry::Overlap { start, end }\n        };\n        append([id, other], scan_geometry);\n    }',
    '    groups[group].insert(id);\n}',
    'if incident_groups.len() > 1 || !event.points.is_empty() {',
    '    for [a, b] in cross_group_pairs(incident_groups) {\n        append([a, b], Geometry::Point(point));\n    }',
    '    for [id, other] in point_member_pairs(event.points, incident_groups) {\n        append([id, other], Geometry::Point(point));\n    }\n}',
    'for [a, b] in unordered_pairs(event.points) {\n    append([a, b], Geometry::Point(point));\n}',
    'return ();',
  ], [[1], [2], [3, 1], [4], [7], [8], [2, 1], [5, 1], [6, 1], [7, 1], [1, 1], [2, 8], [3], [5], [6], [5, 2], [6, 2], [7, 2], [1], [2, 9], [6, 3], [2, 2], [2, 3], [2, 4], [2, 6], [2, 7], [2, 5]], [1, 6, 2, 4, 7, 8, 9, 5]),
  output: teachingModule(/*i18n*/ { id: 'Append exact intersection', message: 'Append exact intersection' }, [
    'let ordered_pair = sorted(pair);',
    { closure: 'original', code: 'let original = |p| {\n    Point { x: p.x - shear * p.y, y: p.y }\n};' },
    'let geometry = match scan_geometry {\n    Geometry::Point(p) => Geometry::Point(original(p)),',
    '    Geometry::Overlap { start, end } => {\n        let start = original(start);\n        let end = original(end);\n        ordered_overlap(start, end)\n    }\n};',
    'result.push(Intersection { segments: ordered_pair, geometry });',
    'return ();',
  ], [[1], [5], [6], [2], [3], [3, 1], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5]], [0, 1, 3, 4, 2, 2]),
  activity: teachingModule(/*i18n*/ { id: 'Update the active set', message: 'Update the active set' }, [
    'for id in event.ends {\n    remove_ending_member(&mut groups, id);\n}',
    'let inserted = nonempty_groups_by_slope(incident_groups);',
    'for group in inserted {\n    active_groups.insert(group, After);\n}',
    'return inserted;',
  ], [[1], [1, 2], [2], [3, 2], [4], [1, 1], [3], [3, 1], [1]], [1, 2, 3, 4]),
  neighbors: teachingModule(/*i18n*/ { id: 'Neighbor checks', message: 'Neighbor checks' }, [
    'let neighbors = local_neighbors(outside, inserted);',
    'for pair in neighbors.windows(2) {\n    schedule(&mut state, &point, pair);\n}',
    'return ();',
  ], [[1], [2, 1], [3], [2], [2, 2]], [0, 1, 2]),
  schedule: teachingModule(/*i18n*/ { id: 'Schedule covered intersection', message: 'Schedule covered intersection' }, [
    'let checked_groups = pair;',
    'if groups[pair[0]].slope == groups[pair[1]].slope {\n    return ();\n}',
    'let candidate = intersect_supporting_lines(groups[pair[0]], groups[pair[1]]);',
    'if candidate > point && candidate.x <= groups[pair[0]].rightmost.unwrap() && candidate.x <= groups[pair[1]].rightmost.unwrap() {\n    queue.entry(candidate.clone()).or_default();\n}',
    'return ();',
  ], [[1], [2, 1], [4], [4, 2], [5], [2], [3], [4, 1]], [0, 1, 2, 3, 4]),
  take: teachingModule(/*i18n*/ { id: "Take an event", message: "Take an event" }, [
    `// ${comment(/*i18n*/ { id: "Take the next pending event", message: "Take the next pending event" })}
let next = queue.pop_first();`,
    `// ${comment(/*i18n*/ { id: "Extract the event position and contents, or enter the exit branch if no event remains", message: "Extract the event position and contents, or enter the exit branch if no event remains" })}
let Some((point, event)) = next else {
    // ${comment(/*i18n*/ { id: "Exit the loop when no pending event remains", message: "Exit the loop when no pending event remains" })}
    break;
};`,
  ], [[1], [2], [3], [2, 1], [2, 2]]),
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
