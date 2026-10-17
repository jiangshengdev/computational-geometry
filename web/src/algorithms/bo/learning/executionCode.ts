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
  neighbors: teachingModule(/*i18n*/ { id: "Neighbor checks", message: "Neighbor checks" }, [
    `// ${comment(/*i18n*/ { id: "Prepare to record the segment pairs checked in this event", message: "Prepare to record the segment pairs checked in this event" })}
let mut checked = Vec::new();`,
    { closure: 'then', code: `// ${comment(/*i18n*/ { id: "Find the neighboring positions to check on either side of the insertion", message: "Find the neighboring positions to check on either side of the insertion" })}
let boundaries = [position.checked_sub(1), (inserted > 0).then(|| {
    // ${comment(/*i18n*/ { id: "When segments are inserted, find the position of the last new segment", message: "When segments are inserted, find the position of the last new segment" })}
    position + inserted - 1
})];` },
    `// ${comment(/*i18n*/ { id: "Check each neighboring position that exists", message: "Check each neighboring position that exists" })}
for lower in boundaries.into_iter().flatten() {`,
    `    // ${comment(/*i18n*/ { id: "Try to get the two neighboring segments at this position", message: "Try to get the two neighboring segments at this position" })}
    let Some(neighbors) = active.get(lower..lower + 2) else {
        // ${comment(/*i18n*/ { id: "Skip this check if fewer than two segments remain", message: "Skip this check if fewer than two segments remain" })}
        continue;
    };`,
    `    // ${comment(/*i18n*/ { id: "Compute the intersection candidate and schedule a future event", message: "Compute the intersection candidate and schedule a future event" })}
    let candidate = schedule_neighbors(&active, lower, &segments, &point, &mut queue, &mut checked);`,
    '}',
  ], [[1], [2], [3], [4], [5], [6], [7], [4, 1], [3]]),
  geometry: teachingModule(/*i18n*/ { id: "Geometry calls and queue insertion", message: "Geometry calls and queue insertion" }, [
    `// ${comment(/*i18n*/ { id: "Try to get the two neighboring segments to check", message: "Try to get the two neighboring segments to check" })}
let Some(neighbors) = active.get(lower..lower + 2) else {
    // ${comment(/*i18n*/ { id: "Return no candidate if fewer than two segments remain", message: "Return no candidate if fewer than two segments remain" })}
    return None;
};`,
    `// ${comment(/*i18n*/ { id: "Record the segment pair being checked", message: "Record the segment pair being checked" })}
checked.push([neighbors[0], neighbors[1]]);`,
    `// ${comment(/*i18n*/ { id: "Look up both segments by their indices", message: "Look up both segments by their indices" })}
let (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);`,
    `// ${comment(/*i18n*/ { id: "Try to compute an intersection candidate for these segments", message: "Try to compute an intersection candidate for these segments" })}
let Some(point) = intersection_candidate(a, b) else {
    // ${comment(/*i18n*/ { id: "End this check if there is no candidate", message: "End this check if there is no candidate" })}
    return None;
};`,
    `// ${comment(/*i18n*/ { id: "Check whether the intersection follows the current event", message: "Check whether the intersection follows the current event" })}
if point > *current {`,
    `    // ${comment(/*i18n*/ { id: "Add the intersection to the queue, preserving any existing event", message: "Add the intersection to the queue, preserving any existing event" })}
    queue.entry(point.clone()).or_default();`,
    '}',
    `// ${comment(/*i18n*/ { id: "Return the intersection candidate found by this check", message: "Return the intersection candidate found by this check" })}
return Some(point);`,
  ], [[1], [2], [3], [4], [5], [6], [7], [8], [9], [1, 1], [4, 1], [1, 2], [4, 2]]),
  activity: teachingModule(/*i18n*/ { id: "Update the active set", message: "Update the active set" }, [
    { closure: 'retain-end', code: `// ${comment(/*i18n*/ { id: "Remove segments that end at the current point from the active set", message: "Remove segments that end at the current point from the active set" })}
active.retain(|&id| {
    // ${comment(/*i18n*/ { id: "Check whether this segment extends beyond the current point", message: "Check whether this segment extends beyond the current point" })}
    segments[id].right != point
});` },
    { closure: 'retain-height', code: `// ${comment(/*i18n*/ { id: "Temporarily remove segments through the current point before reinserting them in order", message: "Temporarily remove segments through the current point before reinserting them in order" })}
active.retain(|&id| {
    // ${comment(/*i18n*/ { id: "Keep segments that do not pass through the current point", message: "Keep segments that do not pass through the current point" })}
    !height_order[id].is_eq()
});` },
    { closure: 'retain-end', code: `// ${comment(/*i18n*/ { id: "Keep incident segments that must remain in the active set", message: "Keep incident segments that must remain in the active set" })}
incident.retain(|&id| {
    // ${comment(/*i18n*/ { id: "Exclude segments that end at the current point", message: "Exclude segments that end at the current point" })}
    segments[id].right != point
});` },
    { closure: 'sort-by', code: `// ${comment(/*i18n*/ { id: "Sort these segments by their vertical order just beyond the current point", message: "Sort these segments by their vertical order just beyond the current point" })}
incident.sort_by(|&a, &b| {
    // ${comment(/*i18n*/ { id: "Compare slopes, placing smaller slopes below larger ones", message: "Compare slopes, placing smaller slopes below larger ones" })}
    segments[a].slope.cmp(&segments[b].slope)
});` },
    { closure: 'partition-point', code: `// ${comment(/*i18n*/ { id: "Find where to insert this group into the active set", message: "Find where to insert this group into the active set" })}
let position = active.partition_point(|&id| {
    // ${comment(/*i18n*/ { id: "Check whether an active segment lies below the current point", message: "Check whether an active segment lies below the current point" })}
    height_order[id].is_lt()
});` },
    `// ${comment(/*i18n*/ { id: "Record how many segments will be inserted", message: "Record how many segments will be inserted" })}
let inserted = incident.len();`,
    `// ${comment(/*i18n*/ { id: "Insert the sorted segments back into the active set", message: "Insert the sorted segments back into the active set" })}
active.splice(position..position, incident);`,
  ], [[1], [2], [3], [4], [5], [6], [7], [8]]),
  take: teachingModule(/*i18n*/ { id: "Take an event", message: "Take an event" }, [
    `// ${comment(/*i18n*/ { id: "Take the next pending event", message: "Take the next pending event" })}
let next = queue.pop_first();`,
    `// ${comment(/*i18n*/ { id: "Extract the event position and contents, or enter the exit branch if no event remains", message: "Extract the event position and contents, or enter the exit branch if no event remains" })}
let Some((point, event)) = next else {
    // ${comment(/*i18n*/ { id: "Exit the loop when no pending event remains", message: "Exit the loop when no pending event remains" })}
    break;
};`,
  ], [[1], [2], [3], [2, 1], [2, 2]]),
  classify: teachingModule(/*i18n*/ { id: "Classify incident segments", message: "Classify incident segments" }, [
    `// ${comment(/*i18n*/ { id: "Start by collecting segments that begin at the current point", message: "Start by collecting segments that begin at the current point" })}
let mut incident = event.starts;`,
    `// ${comment(/*i18n*/ { id: "Check each currently active segment", message: "Check each currently active segment" })}
for &id in &active {`,
    `    // ${comment(/*i18n*/ { id: "Compare the segment height at the sweep line with the current point height", message: "Compare the segment height at the sweep line with the current point height" })}
    height_order[id] = segments[id].y_at(&point.x).cmp(&point.y);`,
    `    // ${comment(/*i18n*/ { id: "Check whether this segment passes through the current point", message: "Check whether this segment passes through the current point" })}
    if height_order[id].is_eq() {`,
    `        // ${comment(/*i18n*/ { id: "Add it to the incident segments for this event", message: "Add it to the incident segments for this event" })}
        incident.push(id);`,
    '    }\n}',
    `// ${comment(/*i18n*/ { id: "Prepare separate lists for starting, ending, and passing segments", message: "Prepare separate lists for starting, ending, and passing segments" })}
let (mut starts, mut ends, mut passes) = (Vec::new(), Vec::new(), Vec::new());`,
    `// ${comment(/*i18n*/ { id: "Classify each incident segment relative to the current point", message: "Classify each incident segment relative to the current point" })}
for &id in &incident {`,
    `    // ${comment(/*i18n*/ { id: "Check whether the current point is the segment start", message: "Check whether the current point is the segment start" })}
    if segments[id].left == point {`,
    `        // ${comment(/*i18n*/ { id: "Record the segment as starting here", message: "Record the segment as starting here" })}
        starts.push(id);`,
    `    }
    // ${comment(/*i18n*/ { id: "Check whether the current point is the segment end", message: "Check whether the current point is the segment end" })}
    if segments[id].right == point {`,
    `        // ${comment(/*i18n*/ { id: "Record the segment as ending here", message: "Record the segment as ending here" })}
        ends.push(id);`,
    `    }
    // ${comment(/*i18n*/ { id: "Exclude both endpoints to check whether the point lies in the segment interior", message: "Exclude both endpoints to check whether the point lies in the segment interior" })}
    if segments[id].left != point && segments[id].right != point {`,
    `        // ${comment(/*i18n*/ { id: "Record the segment as passing through this point", message: "Record the segment as passing through this point" })}
        passes.push(id);`,
    '    }\n}',
  ], [[1], [2], [3], [4], [5], [6, 1], [7], [8], [9], [10], [11, 1], [12], [13, 1], [14], [15, 1], [16], [2], [8], [6], [11], [13], [15]]),
  record: teachingModule(/*i18n*/ { id: "Pair and record", message: "Pair and record" }, [
    `// ${comment(/*i18n*/ { id: "Select each segment passing through the current point", message: "Select each segment passing through the current point" })}
for (i, &a) in incident.iter().enumerate() {`,
    `    // ${comment(/*i18n*/ { id: "Pair only with later segments to avoid recording the same pair twice", message: "Pair only with later segments to avoid recording the same pair twice" })}
    for &b in &incident[i + 1..] {`,
    { closure: 'original', code: `        // ${comment(/*i18n*/ { id: "Prepare to convert sweep coordinates back to input coordinates", message: "Prepare to convert sweep coordinates back to input coordinates" })}
        let original = |p| {
            // ${comment(/*i18n*/ { id: "Undo the shear of the x coordinate, leaving the y coordinate unchanged", message: "Undo the shear of the x coordinate, leaving the y coordinate unchanged" })}
            Point { x: p.x - shear * p.y, y: p.y }
        };` },
    `        // ${comment(/*i18n*/ { id: "Compare slopes to determine whether overlap handling is needed", message: "Compare slopes to determine whether overlap handling is needed" })}
        let geometry = if segments[a].slope == segments[b].slope {`,
    `            // ${comment(/*i18n*/ { id: "Use the later start point as the overlap start", message: "Use the later start point as the overlap start" })}
            let start = segments[a].left.max(segments[b].left);`,
    `            // ${comment(/*i18n*/ { id: "Check whether this event differs from the overlap start", message: "Check whether this event differs from the overlap start" })}
            if start != &point {`,
    `                // ${comment(/*i18n*/ { id: "Record only at the overlap start; skip this pair here", message: "Record only at the overlap start; skip this pair here" })}
                continue;
            }`,
    `            // ${comment(/*i18n*/ { id: "Use the earlier end point as the overlap end", message: "Use the earlier end point as the overlap end" })}
            let end = segments[a].right.min(segments[b].right);`,
    `            // ${comment(/*i18n*/ { id: "Check whether the intersection has nonzero length", message: "Check whether the intersection has nonzero length" })}
            if start < end {`,
    `                // ${comment(/*i18n*/ { id: "Restore both endpoints to produce an overlap result", message: "Restore both endpoints to produce an overlap result" })}
                Geometry::Overlap { start: original(start), end: original(end) }`,
    `            }
            // ${comment(/*i18n*/ { id: "Treat a zero-length intersection as a single point", message: "Treat a zero-length intersection as a single point" })}
            else {
                // ${comment(/*i18n*/ { id: "Restore the contact point to produce a point result", message: "Restore the contact point to produce a point result" })}
                Geometry::Point(original(start))
            }`,
    `        }
        // ${comment(/*i18n*/ { id: "For different slopes, the intersection is the current event point", message: "For different slopes, the intersection is the current event point" })}
        else {
            // ${comment(/*i18n*/ { id: "Restore the current point to produce a point result", message: "Restore the current point to produce a point result" })}
            Geometry::Point(original(&point))
        };`,
    '',
    `        // ${comment(/*i18n*/ { id: "Store the pair in ascending index order together with its intersection", message: "Store the pair in ascending index order together with its intersection" })}
        result.push(Intersection { segments: [a.min(b), a.max(b)], geometry });`,
    '    }',
    '}',
  ], [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11, 2], [12, 2], [13], [14], [15], [16], [17], [2], [1], [11], [11, 3], [12], [12, 3]]),
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
