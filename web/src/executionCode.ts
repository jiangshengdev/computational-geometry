import type { ExecutionState, SweepStep } from './geometry'

interface InlineClosure {
  module: string
  line: number
  start: number
  end: number
  parameterColumn: number
}

export interface TeachingModule {
  title: string
  code: string
  traceLines: number[]
  boundaryLines: number[]
  closures: InlineClosure[]
}

function teachingModule(title: string, operations: (string | { code: string; closure: string })[], stops: readonly (readonly [line: number, offset?: number])[]): TeachingModule {
  const code = operations.map(operation => typeof operation === 'string' ? operation : operation.code)
  // Each entry retains one Rust trace line even when its display spans several lines.
  const traceLines = code.flatMap((code, index) => code.split('\n').map(() => index + 1))
  // A stop names the next logical statement or a specific block boundary.
  // Source formatting changes display offsets, never control-flow identities.
  const starts = [0]
  for (const operation of code) starts.push(starts[starts.length - 1] + operation.split('\n').length)
  const boundaryLines = stops.map(([line, offset = 0]) => starts[line - 1] + offset)
  const closures = operations.flatMap((operation, index) => typeof operation === 'string' ? [] : [{
    module: operation.closure, line: index + 1, start: starts[index], end: starts[index + 1] - 1,
    parameterColumn: operation.code.indexOf('|'),
  }])
  return { title, code: code.join('\n'), traceLines, boundaryLines, closures }
}

// Array positions are trace identities; formatting within an entry must not renumber them.
export const teachingModules: Record<string, TeachingModule> = {
  neighbors: teachingModule('邻居检查', [
    'let mut checked = Vec::new();',
    { closure: 'then', code: 'let boundaries = [position.checked_sub(1), (inserted > 0).then(|| {\n    position + inserted - 1\n})];' },
    'for lower in boundaries.into_iter().flatten() {',
    '    let Some(neighbors) = active.get(lower..lower + 2) else {\n        continue;\n    };',
    '    let candidate = schedule_neighbors(&active, lower, &segments, &point, &mut queue, &mut checked);',
    '}',
  ], [[1], [2], [3], [4], [5], [6], [7], [4, 1], [3]]),
  geometry: teachingModule('几何调用与入队', [
    'let Some(neighbors) = active.get(lower..lower + 2) else {\n    return None;\n};',
    'checked.push([neighbors[0], neighbors[1]]);',
    'let (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);',
    'let Some(point) = intersection_candidate(a, b) else {\n    return None;\n};',
    'if point > *current {',
    '    queue.entry(point.clone()).or_default();',
    '}',
    'return Some(point);',
  ], [[1], [2], [3], [4], [5], [6], [8], [8], [9], [1, 1], [4, 1], [1, 2], [4, 2]]),
  activity: teachingModule('活动集合更新', [
    { closure: 'retain-end', code: 'active.retain(|&id| {\n    segments[id].right != point\n});' },
    { closure: 'retain-height', code: 'active.retain(|&id| {\n    !height_order[id].is_eq()\n});' },
    { closure: 'retain-end', code: 'incident.retain(|&id| {\n    segments[id].right != point\n});' },
    { closure: 'sort-by', code: 'incident.sort_by(|&a, &b| {\n    segments[a].slope.cmp(&segments[b].slope)\n});' },
    { closure: 'partition-point', code: 'let position = active.partition_point(|&id| {\n    height_order[id].is_lt()\n});' },
    'let inserted = incident.len();',
    'active.splice(position..position, incident);',
  ], [[1], [2], [3], [4], [5], [6], [7], [8]]),
  take: teachingModule('取事件', [
    'let next = queue.pop_first();',
    'let Some((point, event)) = next else {\n    break;\n};',
  ], [[1], [2], [3], [2, 1], [2, 2]]),
  classify: teachingModule('参与线段分类', [
    'let mut incident = event.starts;',
    'for &id in &active {',
    '    height_order[id] = segments[id].y_at(&point.x).cmp(&point.y);',
    '    if height_order[id].is_eq() {',
    '        incident.push(id);',
    '    }\n}',
    'let (mut starts, mut ends, mut passes) = (Vec::new(), Vec::new(), Vec::new());',
    'for &id in &incident {',
    '    if segments[id].left == point {',
    '        starts.push(id);',
    '    }\n    if segments[id].right == point {',
    '        ends.push(id);',
    '    }\n    if segments[id].left != point && segments[id].right != point {',
    '        passes.push(id);',
    '    }\n}',
  ], [[1], [2], [3], [4], [5], [6, 1], [7], [8], [9], [10], [11, 1], [12], [13, 1], [14], [15, 1], [16], [2], [8]]),
  record: teachingModule('配对与记录', [
    'for (i, &a) in incident.iter().enumerate() {',
    '    for &b in &incident[i + 1..] {',
    { closure: 'original', code: '        let original = |p| {\n            Point { x: p.x - shear * p.y, y: p.y }\n        };' },
    '        let geometry = if segments[a].slope == segments[b].slope {',
    '            let start = segments[a].left.max(segments[b].left);',
    '            if start != &point {',
    '                continue;\n            }',
    '            let end = segments[a].right.min(segments[b].right);',
    '            if start < end {',
    '                Geometry::Overlap { start: original(start), end: original(end) }',
    '            }\n            else {\n                Geometry::Point(original(start))\n            }',
    '        }\n        else {\n            Geometry::Point(original(&point))\n        };',
    '        // geometry 已赋值',
    '        result.push(Intersection { segments: [a.min(b), a.max(b)], geometry });',
    '    }',
    '}',
  ], [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11, 2], [12, 2], [13], [14], [15], [16], [17], [2], [1]]),
}

const closureModules = new Map(Object.values(teachingModules).flatMap(module => module.closures.map(closure => [closure.module, module] as const)))

// Navigation compares stops within a call, independently of where its code is displayed.
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
    boundaryLine: step.execution.returning ? closure.end : closure.start + 1 }
}
