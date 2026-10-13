import type { ExecutionState, SweepStep } from './trace'

interface InlineClosure {
  module: string
  line: number
  start: number
  end: number
  lines: number[]
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
  neighbors: teachingModule('邻居检查', [
    '// 准备记录本轮检查过的线段对\nlet mut checked = Vec::new();',
    { closure: 'then', code: '// 找出插入位置两侧需要检查的相邻位置\nlet boundaries = [position.checked_sub(1), (inserted > 0).then(|| {\n    // 有新线段插入时，找到最后一条新线段的位置\n    position + inserted - 1\n})];' },
    '// 依次检查存在的相邻位置\nfor lower in boundaries.into_iter().flatten() {',
    '    // 尝试取出这个位置上的两条相邻线段\n    let Some(neighbors) = active.get(lower..lower + 2) else {\n        // 不足两条线段，跳过这次检查\n        continue;\n    };',
    '    // 计算这对线段的交点，并安排后续事件\n    let candidate = schedule_neighbors(&active, lower, &segments, &point, &mut queue, &mut checked);',
    '}',
  ], [[1], [2], [3], [4], [5], [6], [7], [4, 1], [3]]),
  geometry: teachingModule('几何调用与入队', [
    '// 尝试取出要检查的两条相邻线段\nlet Some(neighbors) = active.get(lower..lower + 2) else {\n    // 不足两条线段，返回无候选交点\n    return None;\n};',
    '// 记下本次检查的线段对\nchecked.push([neighbors[0], neighbors[1]]);',
    '// 根据编号取出两条线段\nlet (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);',
    '// 尝试计算这两条线段的候选交点\nlet Some(point) = intersection_candidate(a, b) else {\n    // 没有候选交点，结束这次检查\n    return None;\n};',
    '// 判断交点是否排在当前事件之后\nif point > *current {',
    '    // 把交点加入待处理队列，已有事件则保留\n    queue.entry(point.clone()).or_default();',
    '}',
    '// 返回本次找到的候选交点\nreturn Some(point);',
  ], [[1], [2], [3], [4], [5], [6], [7], [8], [9], [1, 1], [4, 1], [1, 2], [4, 2]]),
  activity: teachingModule('活动集合更新', [
    { closure: 'retain-end', code: '// 从活动集合中移除在当前点结束的线段\nactive.retain(|&id| {\n    // 判断这条线段是否还会继续向前延伸\n    segments[id].right != point\n});' },
    { closure: 'retain-height', code: '// 暂时移除经过当前点的线段，稍后重新排序插入\nactive.retain(|&id| {\n    // 保留不经过当前点的线段\n    !height_order[id].is_eq()\n});' },
    { closure: 'retain-end', code: '// 从参与线段中选出还需要留在活动集合里的线段\nincident.retain(|&id| {\n    // 排除在当前点结束的线段\n    segments[id].right != point\n});' },
    { closure: 'sort-by', code: '// 按越过当前点后的上下顺序排列这些线段\nincident.sort_by(|&a, &b| {\n    // 比较斜率，斜率较小的排在下方\n    segments[a].slope.cmp(&segments[b].slope)\n});' },
    { closure: 'partition-point', code: '// 在活动集合中找到这组线段的插入位置\nlet position = active.partition_point(|&id| {\n    // 判断已有线段是否位于当前点下方\n    height_order[id].is_lt()\n});' },
    '// 记下本次要插入的线段数量\nlet inserted = incident.len();',
    '// 把排好序的线段插回活动集合\nactive.splice(position..position, incident);',
  ], [[1], [2], [3], [4], [5], [6], [7], [8]]),
  take: teachingModule('取事件', [
    '// 取出下一个待处理的事件\nlet next = queue.pop_first();',
    '// 取出事件的位置和内容；没有事件时进入结束分支\nlet Some((point, event)) = next else {\n    // 没有待处理的事件，结束循环\n    break;\n};',
  ], [[1], [2], [3], [2, 1], [2, 2]]),
  classify: teachingModule('参与线段分类', [
    '// 先收集在当前点开始的线段\nlet mut incident = event.starts;',
    '// 逐条检查当前活动线段\nfor &id in &active {',
    '    // 比较线段在扫描线上的高度与当前点的高度\n    height_order[id] = segments[id].y_at(&point.x).cmp(&point.y);',
    '    // 判断这条线段是否经过当前点\n    if height_order[id].is_eq() {',
    '        // 把它加入本次参与处理的线段中\n        incident.push(id);',
    '    }\n}',
    '// 准备分别记录在此开始、结束和从中间经过的线段\nlet (mut starts, mut ends, mut passes) = (Vec::new(), Vec::new(), Vec::new());',
    '// 逐条判断参与线段与当前点的关系\nfor &id in &incident {',
    '    // 判断当前点是不是这条线段的起点\n    if segments[id].left == point {',
    '        // 记入在此开始的线段\n        starts.push(id);',
    '    }\n    // 判断当前点是不是这条线段的终点\n    if segments[id].right == point {',
    '        // 记入在此结束的线段\n        ends.push(id);',
    '    }\n    // 排除两端，判断当前点是否在线段内部\n    if segments[id].left != point && segments[id].right != point {',
    '        // 记入从中间经过当前点的线段\n        passes.push(id);',
    '    }\n}',
  ], [[1], [2], [3], [4], [5], [6, 1], [7], [8], [9], [10], [11, 1], [12], [13, 1], [14], [15, 1], [16], [2], [8], [6], [11], [13], [15]]),
  record: teachingModule('配对与记录', [
    '// 依次选取一条经过当前点的线段\nfor (i, &a) in incident.iter().enumerate() {',
    '    // 只与后面的线段配对，避免重复记录同一对\n    for &b in &incident[i + 1..] {',
    { closure: 'original', code: '        // 准备把扫描坐标还原为输入时的坐标\n        let original = |p| {\n            // 撤销横坐标的剪切变换，纵坐标保持不变\n            Point { x: p.x - shear * p.y, y: p.y }\n        };' },
    '        // 比较两条线段的斜率，判断是否需要处理重叠\n        let geometry = if segments[a].slope == segments[b].slope {',
    '            // 取两个起点中较后的一个，作为重叠起点\n            let start = segments[a].left.max(segments[b].left);',
    '            // 判断当前事件是否不是这段重叠的起点\n            if start != &point {',
    '                // 只在重叠起点记录一次，跳过当前线段对\n                continue;\n            }',
    '            // 取两个终点中较前的一个，作为重叠终点\n            let end = segments[a].right.min(segments[b].right);',
    '            // 判断交集是否有长度，是一段线段\n            if start < end {',
    '                // 还原两端坐标，生成重叠线段的结果\n                Geometry::Overlap { start: original(start), end: original(end) }',
    '            }\n            // 没有长度时，按单个交点处理\n            else {\n                // 还原接触点坐标，生成交点结果\n                Geometry::Point(original(start))\n            }',
    '        }\n        // 斜率不同时，交集就是当前事件点\n        else {\n            // 还原当前点坐标，生成交点结果\n            Geometry::Point(original(&point))\n        };',
    '',
    '        // 按编号从小到大保存线段对及其交集\n        result.push(Intersection { segments: [a.min(b), a.max(b)], geometry });',
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
