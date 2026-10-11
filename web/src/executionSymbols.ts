import type { ExecutionVariable, SweepStep } from './geometry'

const meanings: Record<string, string> = {
  queue: '按扫描坐标排序的待处理事件队列', next: '本次弹出的队首事件，可为空',
  point: '本次事件的扫描坐标', event: '本次事件携带的线段信息',
  segments: '变换到扫描坐标的线段；遮蔽同名原始输入参数', active: '当前活动线段的编号序列',
  incident: '经过当前事件点的线段编号', height_order: '活动线段在当前横坐标的高度比较结果',
  id: '当前循环访问的线段编号', starts: '在当前点开始的线段', ends: '在当前点结束的线段',
  passes: '内部经过当前点的线段', i: '当前外层配对索引', a: '当前配对的第一条线段编号',
  b: '当前配对的第二条线段编号', shear: '扫描坐标的剪切系数',
  p: '坐标还原闭包的参数，仅在该闭包调用期间有效', start: '重叠候选区间的起点',
  end: '重叠候选区间的终点', geometry: '当前线段对的原坐标交集', result: '截至当前小步已记录的交集',
  position: '新活动线段插入到活动序列的位置', inserted: '本次需要插入的线段数量',
}

export const functions: Record<string, { signature: string; purpose: string; parameters: string }> = {
  pop_first: { signature: 'pop_first(&mut self) -> Option<(Point, Event)>', purpose: '移除并返回队列中最早的事件。', parameters: 'self：当前 queue；无显式参数。' },
  y_at: { signature: 'y_at(&self, x: &Rational) -> Rational', purpose: '精确计算线段在指定横坐标的高度。', parameters: 'self：当前线段；x：事件横坐标。' },
  cmp: { signature: 'cmp(&self, other: &Rational) -> Ordering', purpose: '精确比较两个有理数。', parameters: 'self：线段高度；other：事件纵坐标。' },
  is_eq: { signature: 'is_eq(self) -> bool', purpose: '判断比较结果是否相等。', parameters: 'self：当前高度比较结果；无显式参数。' },
  push: { signature: 'push(&mut self, value: T) -> ()', purpose: '向当前目标序列追加一个元素。', parameters: 'self：调用点左侧的序列；value：括号内的元素。' },
  new: { signature: 'Vec::new() -> Vec<T>', purpose: '创建空序列。', parameters: '无参数。' },
  iter: { signature: 'iter(&self) -> Iter<T>', purpose: '依次访问序列元素。', parameters: 'self：incident；无显式参数。' },
  enumerate: { signature: 'enumerate(self) -> Enumerate<Self>', purpose: '为迭代元素附加从零开始的索引。', parameters: 'self：incident 的迭代器；无显式参数。' },
  original: { signature: 'original(p: &Point) -> Point', purpose: '撤销剪切，恢复原坐标。', parameters: 'p：本次调用的扫描坐标点。' },
  min: { signature: 'min(self, other: Self) -> Self', purpose: '返回两个值中的较小者。', parameters: 'self、other：此调用点的两个操作数。' },
  max: { signature: 'max(self, other: Self) -> Self', purpose: '返回两个值中的较大者。', parameters: 'self、other：此调用点的两个操作数。' },
  retain: { signature: 'retain(&mut self, predicate) -> ()', purpose: '保留满足条件的元素。', parameters: 'predicate：保留条件；self：活动序列。' },
  sort_by: { signature: 'sort_by(&mut self, compare) -> ()', purpose: '按比较函数排序。', parameters: 'compare：当前排序规则。' },
  partition_point: { signature: 'partition_point(&self, predicate) -> usize', purpose: '定位有序分区的边界。', parameters: 'predicate：当前分区条件。' },
  len: { signature: 'len(&self) -> usize', purpose: '读取序列长度。', parameters: 'self：调用点的序列；无显式参数。' },
  splice: { signature: 'splice(&mut self, range, replace_with) -> Splice', purpose: '替换指定范围中的元素。', parameters: 'range：替换范围；replace_with：新元素。' },
}

export function callExpression(name: string, after: string) {
  const open = after.indexOf('(')
  if (open < 0) return name
  let depth = 0
  for (let index = open; index < after.length; index++) {
    if (after[index] === '(') depth++
    if (after[index] === ')' && --depth === 0) return name + after.slice(0, index + 1)
  }
  return name + after
}

export function variableValue(variable: ExecutionVariable | undefined, values: string[]) {
  if (!variable || variable.availability === 'unavailable') return '不可用（当前作用域未提供）'
  if (variable.availability === 'unassigned') return '未赋值'
  return variable.value === null ? '不可用（当前轨迹未提供值）' : values[variable.value]
}

export function variableDetails(name: string, step: SweepStep, previous: SweepStep, values: string[]) {
  const context = step.execution.context
  // Locals deliberately win even while unassigned or unavailable: never expose
  // the input parameter hidden by the scan-coordinate local named segments.
  const variable = context.locals.find(item => item.name === name) ?? context.parameters.find(item => item.name === name)
  const prior = previous.execution.context
  const old = prior.function === context.function && previous.execution.module === step.execution.module
    ? prior.locals.find(item => item.name === name) ?? prior.parameters.find(item => item.name === name)
    : undefined
  return {
    meaning: meanings[name], type: variable?.type ?? '当前作用域未提供类型',
    value: variableValue(variable, values),
    changed: !!old && !!variable && (old.value !== variable.value || old.availability !== variable.availability),
    previous: variableValue(old, values),
  }
}

export function symbolKind(name: string, before: string, after: string) {
  if (functions[name] && (/^\s*\(/.test(after) || name === 'original')) return 'function'
  if (meanings[name] && !/[.:]\s*$/.test(before) && !/^\s*:/.test(after)) return 'variable'
  return null
}
