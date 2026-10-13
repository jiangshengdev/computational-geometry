import type { SweepStep } from '../geometry/geometry'
import { scopedVariable, symbolKind, variableDetails } from './executionSymbols'
import { formatExecutionValue, splitExecutionItems } from './executionValue'

export interface Access {
  expression: string
  root: string
  parent?: Access
  field?: string
  index?: Access | number
}

export interface CodeSymbol {
  start: number
  end: number
  name: string
  kind: 'variable' | 'function' | 'control' | 'access'
  access?: Access
}

// Parse source positions before applying highlighting. Only the teaching
// language's member/index syntax is evaluated; calls and arithmetic are not.
export function codeSymbols(source: string): CodeSymbol[] {
  const tokens = [...source.matchAll(/[A-Za-z_][A-Za-z_0-9]*|\d+|::|\.\.|[^\s]/g)]
  const symbols = new Map<number, CodeSymbol>()
  const comment = source.indexOf('//')
  function read(at: number): { access: Access; next: number } | undefined {
    const token = tokens[at]
    if (!token || !/^[A-Za-z_]\w*$/.test(token[0])) return
    const start = token.index
    const kind = symbolKind(token[0], source.slice(0, start), source.slice(start + token[0].length))
    if (!kind) return
    symbols.set(start, { start, end: start + token[0].length, name: token[0], kind })
    if (kind !== 'variable') return
    let access: Access = { expression: token[0], root: token[0] }
    let next = at + 1
    while (tokens[next]) {
      if (tokens[next][0] === '.' && /^[A-Za-z_]\w*$/.test(tokens[next + 1]?.[0] ?? '') && tokens[next + 2]?.[0] !== '(') {
        const field = tokens[next + 1]
        access = { expression: source.slice(start, field.index + field[0].length), root: access.root, parent: access, field: field[0] }
        symbols.set(field.index, { start: field.index, end: field.index + field[0].length, name: field[0], kind: 'access', access })
        next += 2
      } else if (tokens[next][0] === '[') {
        const item = tokens[next + 1]
        const parsed = item && /^\d+$/.test(item[0]) ? { index: Number(item[0]), next: next + 2 } : (() => {
          const nested = read(next + 1)
          return nested && { index: nested.access, next: nested.next }
        })()
        if (!parsed || tokens[parsed.next]?.[0] !== ']') break
        const close = tokens[parsed.next]
        access = { expression: source.slice(start, close.index + 1), root: access.root, parent: access, index: parsed.index }
        symbols.set(close.index, { start: close.index, end: close.index + 1, name: access.expression, kind: 'access', access })
        next = parsed.next + 1
      } else break
    }
    return { access, next }
  }
  for (let at = 0; at < tokens.length && (comment < 0 || tokens[at].index < comment); at++) {
    const parsed = read(at)
    if (parsed) at = parsed.next - 1
  }
  return [...symbols.values()].sort((a, b) => a.start - b.start)
}

interface Value { type: string; value?: string; unavailable?: string }

// Decode the Rust trace's display representation, retaining the original text
// for full parent values. This selects recorded data; it computes no geometry.
function items(source: string) {
  return splitExecutionItems(source) ?? []
}

const fields: Record<string, Record<string, { type: string; meaning: string }>> = {
  Point: { x: { type: 'Rational', meaning: '点的横坐标' }, y: { type: 'Rational', meaning: '点的纵坐标' } },
  SweepSegment: {
    left: { type: 'Point', meaning: '扫描线段的左端点' }, right: { type: 'Point', meaning: '扫描线段的右端点' },
    slope: { type: 'Option<Rational>', meaning: '扫描线段的精确斜率' }, intercept: { type: 'Rational', meaning: '扫描线段的精确截距' },
  },
  Segment: { start: { type: 'Point', meaning: '原始线段的起点' }, end: { type: 'Point', meaning: '原始线段的终点' } },
  Event: { starts: { type: 'Vec<usize>', meaning: '在此事件点开始的线段编号' } },
}

function bareType(type: string) { return type.replace(/^&(?:mut\s+)?/, '') }
function elementType(type: string) { return bareType(type).match(/^(?:Vec<(.+)>|\[(.+)\])$/)?.slice(1).find(Boolean) ?? '当前轨迹未提供类型' }

function resolve(access: Access, step: SweepStep, values: string[], line: number): Value {
  if (!access.parent) {
    const variable = scopedVariable(access.root, step, line)
    return { type: variable?.type ?? '当前作用域未提供类型',
      value: variable?.availability === 'available' && variable.value !== null ? values[variable.value] : undefined,
      unavailable: variable?.availability === 'unassigned' ? '未赋值' : '不可用（当前作用域或轨迹未提供）' }
  }
  const parent = resolve(access.parent, step, values, line)
  const type = access.field ? fields[bareType(parent.type)]?.[access.field]?.type ?? '当前轨迹未提供类型' : elementType(parent.type)
  if (parent.value === undefined) return { type, unavailable: parent.unavailable }
  if (access.field) {
    const source = parent.value
    const value = bareType(parent.type) === 'Point'
      ? items(source.slice(1, -1))[['x', 'y'].indexOf(access.field)]
      : items(source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'))).find(item => item.startsWith(`${access.field}:`))?.slice(access.field.length + 1).trim()
    return { type, value, unavailable: '不可用（当前轨迹未记录字段）' }
  }
  const index = typeof access.index === 'number' ? { value: String(access.index) } : access.index && resolve(access.index, step, values, line)
  if (!index?.value || !/^\d+$/.test(index.value)) return { type, unavailable: '不可用（索引未赋值或不可用）' }
  const value = parent.value.startsWith('[') ? items(parent.value.slice(1, -1))[Number(index.value)] : undefined
  return { type, value, unavailable: '不可用（索引越界或对象未记录）' }
}

export function accessDetails(access: Access, step: SweepStep, previous: SweepStep, values: string[], line: number) {
  const current = resolve(access, step, values, line)
  // A different call or module cannot provide this access's previous binding.
  const prior = step.execution.context.id === previous.execution.context.id && step.execution.module === previous.execution.module
    ? resolve(access, previous, values, line) : undefined
  const parentType = access.parent && resolve(access.parent, step, values, line).type
  const base = variableDetails(access.root, step, previous, values, line)
  return { ...base, type: current.type,
    meaning: access.field ? fields[bareType(parentType ?? '')]?.[access.field]?.meaning ?? `${access.parent?.expression} 的字段 ${access.field}` : `${access.parent?.expression} 中由当前索引选中的元素`,
    value: current.value === undefined ? current.unavailable! : formatExecutionValue(current.value),
    hasValue: current.value !== undefined,
    changed: !!prior && (prior.value !== current.value || prior.unavailable !== current.unavailable),
    previous: prior?.value === undefined ? prior?.unavailable ?? '不可用（当前调用无可比较的值）' : formatExecutionValue(prior.value),
    previousHasValue: prior?.value !== undefined,
  }
}

export function accessParents(access: Access, step: SweepStep, values: string[], line: number) {
  const parents = []
  for (let parent = access.parent; parent; parent = parent.parent) {
    const value = resolve(parent, step, values, line)
    parents.push({ expression: parent.expression, value: value.value === undefined ? value.unavailable! : formatExecutionValue(value.value), hasValue: value.value !== undefined })
  }
  return parents
}
