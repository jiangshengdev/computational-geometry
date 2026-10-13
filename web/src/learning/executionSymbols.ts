import type { ExecutionContext, ExecutionControl, ExecutionVariable, ExecutionVariableKind, SweepStep } from './trace'
import { formatExecutionValue } from './executionValue'

const meanings: Record<string, string> = {
  queue: '按扫描坐标排序的待处理事件队列', next: '本次弹出的队首事件，可为空',
  point: '本次事件的扫描坐标', event: '本次事件携带的线段信息',
  segments: '变换到扫描坐标的线段；遮蔽同名原始输入参数', active: '当前活动线段的编号序列',
  incident: '经过当前事件点的线段编号', height_order: '按线段编号保存的精确高度比较缓存；分类循环逐项刷新，尚未访问的项保留先前值，不能视为全部已按当前事件更新',
  id: '当前循环访问的线段编号', starts: '在当前点开始的线段', ends: '在当前点结束的线段',
  passes: '内部经过当前点的线段', i: '当前外层配对索引', a: '当前配对的第一条线段（扫描循环中使用编号）',
  b: '当前配对的第二条线段（扫描循环中使用编号）', shear: '扫描坐标的剪切系数',
  p: '坐标还原闭包的参数，仅在该闭包调用期间有效', start: '重叠候选区间的起点',
  end: '重叠候选区间的终点', geometry: '当前线段对的原坐标交集', result: '截至当前小步已记录的交集',
  position: '新活动线段插入到活动序列的位置', inserted: '本次需要插入的线段数量',
  boundaries: '需检查的插入区间外侧边界', lower: '邻居对中第一条线段的活动序列索引',
  neighbors: '本次检查的相邻线段编号', current: '正在处理的事件扫描坐标',
  checked: '本事件已经检查的邻居对', candidate: '已完成的邻居调用返回的交点候选',
  return_value: '当前调用已经产生的返回值',
}

export const functions: Record<string, { signature: string; purpose: string; parameters: string }> = {
  schedule_neighbors: { signature: 'schedule_neighbors(active, lower, segments, current, queue, checked) -> Option<Point>', purpose: '检查实际邻居，将未来交点加入事件队列并返回几何候选。', parameters: 'active：活动顺序；lower：邻居索引；segments：扫描线段；current：当前事件；queue：事件队列；checked：已检查对。' },
  intersection_candidate: { signature: 'intersection_candidate(a, b) -> Option<Point>', purpose: '教学伪代码中的原子几何计算；对应 Rust 实际精确计算，不展开公式。', parameters: 'a、b：本次参与几何计算的扫描线段。' },
  pop_first: { signature: 'pop_first(&mut self) -> Option<(Point, Event)>', purpose: '移除并返回队列中最早的事件。', parameters: 'self：当前 queue；无显式参数。' },
  y_at: { signature: 'y_at(&self, x: &Rational) -> Rational', purpose: '精确计算线段在指定横坐标的高度。', parameters: 'self：当前线段；x：事件横坐标。' },
  cmp: { signature: 'cmp(&self, other: &Self) -> Ordering', purpose: '按当前表达式比较两个值。', parameters: 'self、other：调用点的两个操作数，可为高度或斜率。' },
  is_eq: { signature: 'is_eq(self) -> bool', purpose: '判断比较结果是否相等。', parameters: 'self：当前高度比较结果；无显式参数。' },
  is_lt: { signature: 'is_lt(self) -> bool', purpose: '判断比较结果是否为小于。', parameters: 'self：调用点的比较结果；无显式参数。' },
  push: { signature: 'push(&mut self, value: T) -> ()', purpose: '向当前目标序列追加一个元素。', parameters: 'self：调用点左侧的序列；value：括号内的元素。' },
  new: { signature: 'Vec::new() -> Vec<T>', purpose: '创建空序列。', parameters: '无参数。' },
  iter: { signature: 'iter(&self) -> Iter<T>', purpose: '依次访问序列元素。', parameters: 'self：调用点的序列；无显式参数。' },
  enumerate: { signature: 'enumerate(self) -> Enumerate<Self>', purpose: '为迭代元素附加从零开始的索引。', parameters: 'self：调用点的迭代器；无显式参数。' },
  original: { signature: 'original(p: &Point) -> Point', purpose: '撤销剪切，恢复原坐标。', parameters: 'p：本次调用的扫描坐标点。' },
  min: { signature: 'min(self, other: Self) -> Self', purpose: '返回两个值中的较小者。', parameters: 'self、other：此调用点的两个操作数。' },
  max: { signature: 'max(self, other: Self) -> Self', purpose: '返回两个值中的较大者。', parameters: 'self、other：此调用点的两个操作数。' },
  retain: { signature: 'retain(&mut self, predicate) -> ()', purpose: '保留满足条件的元素。', parameters: 'predicate：保留条件；self：调用点左侧的序列。' },
  sort_by: { signature: 'sort_by(&mut self, compare) -> ()', purpose: '按比较函数排序。', parameters: 'compare：当前排序规则。' },
  partition_point: { signature: 'partition_point(&self, predicate) -> usize', purpose: '定位有序分区的边界。', parameters: 'predicate：当前分区条件。' },
  len: { signature: 'len(&self) -> usize', purpose: '读取序列长度。', parameters: 'self：调用点的序列；无显式参数。' },
  splice: { signature: 'splice(&mut self, range, replace_with) -> Splice', purpose: '替换指定范围中的元素。', parameters: 'range：替换范围；replace_with：新元素。' },
  checked_sub: { signature: 'checked_sub(self, rhs: usize) -> Option<usize>', purpose: '执行检查下溢的索引减法。', parameters: 'self：调用点的索引；rhs：减数。' },
  then: { signature: 'then(self, f) -> Option<T>', purpose: '条件为真时执行闭包并返回其结果，否则返回 None。', parameters: 'self：条件；f：生成值的闭包。' },
  into_iter: { signature: 'into_iter(self) -> IntoIter<T>', purpose: '将当前集合转为消耗元素的迭代器。', parameters: 'self：调用点的集合。' },
  flatten: { signature: 'flatten(self) -> Flatten<Self>', purpose: '展开嵌套迭代值；Option 中的 None 不产生元素。', parameters: 'self：调用点的迭代器。' },
  get: { signature: 'get(&self, range) -> Option<&[T]>', purpose: '取得指定范围；越界时返回 None。', parameters: 'self：调用点的序列；range：索引范围。' },
  entry: { signature: 'entry(&mut self, key) -> Entry<K, V>', purpose: '取得指定键对应的映射条目。', parameters: 'self：调用点的映射；key：键。' },
  clone: { signature: 'clone(&self) -> Self', purpose: '复制当前值。', parameters: 'self：调用点的值。' },
  or_default: { signature: 'or_default(self) -> &mut V', purpose: '取得条目值；键不存在时插入默认值。', parameters: 'self：调用点的映射条目。' },
}

export function callExpression(name: string, after: string) {
  const open = after.search(/\S/)
  if (open < 0 || after[open] !== '(') return name
  let depth = 0
  for (let index = open; index < after.length; index++) {
    if (after[index] === '(') depth++
    if (after[index] === ')' && --depth === 0) return name + after.slice(0, index + 1)
  }
  return name + after
}

export const shadowedValueNote = '（已遮蔽，遮蔽前的最后值）'

export function hasVariableValue(variable: ExecutionVariable | undefined) {
  return !!variable && (variable.availability === 'available' || variable.availability === 'shadowed') && variable.value !== null
}

export function variableValue(variable: ExecutionVariable | undefined, values: string[]) {
  if (!variable || variable.availability === 'unavailable') return '不可用（当前作用域未提供）'
  if (variable.availability === 'unassigned') return '未赋值'
  if (variable.availability === 'shadowed') return variable.value === null
    ? '已遮蔽（遮蔽前的最后值未记录）'
    : `${formatExecutionValue(values[variable.value])}${shadowedValueNote}`
  return variable.value === null ? '不可用（当前轨迹未提供值）' : formatExecutionValue(values[variable.value])
}

export function symbolScope(name: string, module: string, line: number) {
  if (module === 'classify' && name === 'id') return line <= 6 ? '活动线段循环' : '参与线段循环'
  if (module === 'activity' && ['id', 'a', 'b'].includes(name)) return `第 ${line} 行闭包`
  if (module === 'record' && name === 'p') return 'original 闭包'
  if (module.startsWith('retain-')) return 'retain 闭包'
  return `${module} 模块`
}

export function scopedVariable(name: string, step: SweepStep, line: number) {
  const { module, context } = step.execution
  const variable = context.locals.find(item => item.name === name) ?? context.parameters.find(item => item.name === name) ?? context.captures.find(item => item.name === name)
  let visible = true
  if (module === 'classify' && name === 'id') visible = variable?.scope === (line <= 6 ? 'classify.active' : 'classify.incident')
  // Callback parameters are distinct bindings. The sweep's a/b/id and a
  // different invocation's arguments cannot stand in for these parameters.
  if (module === 'activity' && ['id', 'a', 'b'].includes(name)) visible = false
  if (module === 'record') {
    if (name === 'p') visible = false
  }
  return visible ? variable : { name, type: variable?.type ?? '当前词法作用域变量', availability: 'unavailable' as const, value: null, scope: null }
}

export function variableDetails(name: string, step: SweepStep, previous: SweepStep, values: string[], line: number) {
  const context = step.execution.context
  // Locals deliberately win even while unassigned or unavailable: never expose
  // the input parameter hidden by the scan-coordinate local named segments.
  const variable = scopedVariable(name, step, line)
  const kind = context.locals.some(item => item.name === name) ? 'locals' : context.parameters.some(item => item.name === name) ? 'parameters' : 'captures'
  return describeVariable(name, variable, kind, step, previous, values, symbolScope(name, step.execution.module, line), line)
}

export function panelVariableDetails(variable: ExecutionVariable, kind: ExecutionVariableKind, step: SweepStep, previous: SweepStep, values: string[], context = step.execution.context) {
  const scope = variable.scope === 'classify.active' ? '活动线段循环'
    : variable.scope === 'classify.incident' ? '参与线段循环'
    : variable.scope ?? (kind === 'parameters' ? `${context.function} 参数`
      : kind === 'captures' ? `${context.function} 捕获变量`
      : context.id === step.execution.context.id ? `${step.execution.module} 模块` : `${context.function} 局部变量`)
  return describeVariable(variable.name, variable, kind, step, previous, values, scope, undefined, context)
}

function describeVariable(name: string, variable: ExecutionVariable | undefined, kind: ExecutionVariableKind, step: SweepStep, previous: SweepStep, values: string[], scope: string, line?: number, context = step.execution.context) {
  const { old, changed } = variableChange(variable, kind, step, previous, line, context)
  return {
    meaning: name === 'segments' && kind === 'parameters'
      ? context.function === 'sweep' ? '原始输入线段，使用原坐标' : '当前函数接收的扫描坐标线段'
      : name === 'segments' && kind === 'captures' ? '当前闭包捕获的扫描坐标线段'
      : meanings[name],
    type: variable?.type ?? '当前作用域未提供类型',
    value: variableValue(variable, values),
    hasValue: hasVariableValue(variable),
    changed,
    previous: variableValue(old, values),
    previousHasValue: hasVariableValue(old),
    scope,
  }
}

export function variableChange(variable: ExecutionVariable | undefined, kind: ExecutionVariableKind, step: SweepStep, previous: SweepStep, line?: number, context: ExecutionContext = step.execution.context) {
  const prior = [previous.execution.context, ...previous.execution.outer].find(frame => frame.id === context.id)
  const binding = prior?.[kind].find(item => item.name === variable?.name && item.scope === variable?.scope)
  const old = binding && line !== undefined && prior === previous.execution.context && previous.execution.module === step.execution.module ? scopedVariable(binding.name, previous, line) : binding
  return { old, changed: !!old && !!variable && (old.value !== variable.value || old.availability !== variable.availability) }
}

export function symbolKind(name: string, before: string, after: string) {
  if (['if', 'else', 'for', 'continue', 'return', 'break'].includes(name)) return 'control'
  if (functions[name] && (/^\s*\(/.test(after) || name === 'original')) return 'function'
  if (meanings[name] && !/(?:\.|::)\s*$/.test(before) && !/^\s*:/.test(after)) return 'variable'
  return null
}

export function controlDescription(keyword: string, control: ExecutionControl | undefined) {
  if (!control) return '本次尚未执行'
  switch (control.state) {
    case 'pending': return keyword === 'for' ? '即将检查下一次迭代；本轮尚未判断' : '即将执行；结果尚未产生'
    case 'true': return '本次条件为真，进入分支'
    case 'false': return '本次条件为假，跳过分支'
    case 'entered': return keyword === 'for' ? '本次已取得迭代元素，进入循环体' : '本次进入 else 分支'
    case 'exhausted': return '本次没有下一个元素，循环已结束'
    case 'skipped': return keyword === 'else' || keyword === 'if' ? '本次跳过此分支' : '本次未执行此语句'
    case 'jumping': return keyword === 'continue' ? '已执行 continue，跳往下一次迭代' : '已执行 break，退出循环'
    case 'returned': return '已执行 return，函数已返回'
    case 'completed': return keyword === 'break' ? '已执行 break，退出循环' : '本次执行已完成'
  }
}
