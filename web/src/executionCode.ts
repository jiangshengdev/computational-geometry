export interface TeachingModule {
  title: string
  code: string
  traceLines: number[]
  boundaryLines: number[]
}

function teachingModule(title: string, operations: string[], stops: readonly (readonly [line: number, offset?: number])[]): TeachingModule {
  // Each entry retains one Rust trace line even when its display spans several lines.
  const traceLines = operations.flatMap((code, index) => code.split('\n').map(() => index + 1))
  // A stop names the next logical statement or a specific block boundary.
  // Source formatting changes display offsets, never control-flow identities.
  const starts = [0]
  for (const code of operations) starts.push(starts[starts.length - 1] + code.split('\n').length)
  const boundaryLines = stops.map(([line, offset = 0]) => starts[line - 1] + offset)
  return { title, code: operations.join('\n'), traceLines, boundaryLines }
}

// Array positions are trace identities; formatting within an entry must not renumber them.
export const teachingModules: Record<string, TeachingModule> = {
  neighbors: teachingModule('邻居检查', [
    'let mut checked = Vec::new();',
    'let boundaries = [position.checked_sub(1), (inserted > 0).then(|| { position + inserted - 1 })];',
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
    'active.retain(|&id| { segments[id].right != point });',
    'active.retain(|&id| { !height_order[id].is_eq() });',
    'incident.retain(|&id| { segments[id].right != point });',
    'incident.sort_by(|&a, &b| { segments[a].slope.cmp(&segments[b].slope) });',
    'let position = active.partition_point(|&id| { height_order[id].is_lt() });',
    'let inserted = incident.len();',
    'active.splice(position..position, incident);',
  ], [[1], [2], [3], [4], [5], [6], [7], [8]]),
  'retain-end': teachingModule('retain 端点判断闭包', [
    '|&id| {',
    '    segments[id].right != point',
    '}',
  ], [[2], [3]]),
  'retain-height': teachingModule('retain 高度判断闭包', [
    '|&id| {',
    '    !height_order[id].is_eq()',
    '}',
  ], [[2], [3]]),
  'sort-by': teachingModule('sort_by 比较闭包', [
    '|&a, &b| {',
    '    segments[a].slope.cmp(&segments[b].slope)',
    '}',
  ], [[2], [3]]),
  'partition-point': teachingModule('partition_point 判断闭包', [
    '|&id| {',
    '    height_order[id].is_lt()',
    '}',
  ], [[2], [3]]),
  then: teachingModule('then 索引计算闭包', [
    '|| {',
    '    position + inserted - 1',
    '}',
  ], [[2], [3]]),
  original: teachingModule('original 坐标还原闭包', [
    '|p| {',
    '    Point { x: p.x - shear * p.y, y: p.y }',
    '}',
  ], [[2], [3]]),
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
    '        let original = |p| { Point { x: p.x - shear * p.y, y: p.y } };',
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
