import type { I18n, MessageDescriptor } from '@lingui/core'
import type { SweepStep } from './trace'
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

const fields: Record<string, Record<string, { type: string; meaning: MessageDescriptor }>> = {
  Point: { x: { type: 'Rational', meaning: /*i18n*/ { id: "Point x coordinate", message: "Point x coordinate" } }, y: { type: 'Rational', meaning: /*i18n*/ { id: "Point y coordinate", message: "Point y coordinate" } } },
  SweepSegment: {
    left: { type: 'Point', meaning: /*i18n*/ { id: "Left endpoint of the sweep segment", message: "Left endpoint of the sweep segment" } }, right: { type: 'Point', meaning: /*i18n*/ { id: "Right endpoint of the sweep segment", message: "Right endpoint of the sweep segment" } },
    slope: { type: 'Option<Rational>', meaning: /*i18n*/ { id: "Exact slope of the sweep segment", message: "Exact slope of the sweep segment" } }, intercept: { type: 'Rational', meaning: /*i18n*/ { id: "Exact intercept of the sweep segment", message: "Exact intercept of the sweep segment" } },
  },
  Segment: { start: { type: 'Point', meaning: /*i18n*/ { id: "Start of the original segment", message: "Start of the original segment" } }, end: { type: 'Point', meaning: /*i18n*/ { id: "End of the original segment", message: "End of the original segment" } } },
  Event: { starts: { type: 'Vec<usize>', meaning: /*i18n*/ { id: "Indices of segments starting at this event point", message: "Indices of segments starting at this event point" } } },
}

function bareType(type: string) { return type.replace(/^&(?:mut\s+)?/, '') }
function elementType(type: string, _: I18n['_']) { return bareType(type).match(/^(?:Vec<(.+)>|\[(.+)\])$/)?.slice(1).find(Boolean) ?? _(/*i18n*/ { id: "Type not provided by the current trace", message: "Type not provided by the current trace" }) }

function resolve(access: Access, step: SweepStep, values: string[], line: number, _: I18n['_']): Value {
  if (!access.parent) {
    const variable = scopedVariable(access.root, step, line, _)
    return { type: variable?.type ?? _(/*i18n*/ { id: "Type not provided by the current scope", message: "Type not provided by the current scope" }),
      value: variable?.availability === 'available' && variable.value !== null ? values[variable.value] : undefined,
      unavailable: variable?.availability === 'unassigned' ? _(/*i18n*/ { id: "Unassigned", message: "Unassigned" }) : _(/*i18n*/ { id: "Unavailable (not provided by the current scope or trace)", message: "Unavailable (not provided by the current scope or trace)" }) }
  }
  const parent = resolve(access.parent, step, values, line, _)
  const type = access.field ? fields[bareType(parent.type)]?.[access.field]?.type ?? _(/*i18n*/ { id: "Type not provided by the current trace", message: "Type not provided by the current trace" }) : elementType(parent.type, _)
  if (parent.value === undefined) return { type, unavailable: parent.unavailable }
  if (access.field) {
    const source = parent.value
    const value = bareType(parent.type) === 'Point'
      ? items(source.slice(1, -1))[['x', 'y'].indexOf(access.field)]
      : items(source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'))).find(item => item.startsWith(`${access.field}:`))?.slice(access.field.length + 1).trim()
    return { type, value, unavailable: _(/*i18n*/ { id: "Unavailable (field not recorded in the current trace)", message: "Unavailable (field not recorded in the current trace)" }) }
  }
  const index = typeof access.index === 'number' ? { value: String(access.index) } : access.index && resolve(access.index, step, values, line, _)
  if (!index?.value || !/^\d+$/.test(index.value)) return { type, unavailable: _(/*i18n*/ { id: "Unavailable (index unassigned or unavailable)", message: "Unavailable (index unassigned or unavailable)" }) }
  const value = parent.value.startsWith('[') ? items(parent.value.slice(1, -1))[Number(index.value)] : undefined
  return { type, value, unavailable: _(/*i18n*/ { id: "Unavailable (index out of bounds or object not recorded)", message: "Unavailable (index out of bounds or object not recorded)" }) }
}

export function accessDetails(access: Access, step: SweepStep, previous: SweepStep, values: string[], line: number, _: I18n['_']) {
  const current = resolve(access, step, values, line, _)
  // A different call or module cannot provide this access's previous binding.
  const prior = step.execution.context.id === previous.execution.context.id && step.execution.module === previous.execution.module
    ? resolve(access, previous, values, line, _) : undefined
  const parentType = access.parent && resolve(access.parent, step, values, line, _).type
  const base = variableDetails(access.root, step, previous, values, line, _)
  return { ...base, type: current.type,
    meaning: access.field ? fields[bareType(parentType ?? '')]?.[access.field]?.meaning ? _(fields[bareType(parentType ?? '')][access.field].meaning) : _(/*i18n*/ { id: "Field {field} of {expression}", message: "Field {field} of {expression}" , values: { field: access.field, expression: access.parent?.expression }}) : _(/*i18n*/ { id: "Element of {expression} selected by the current index", message: "Element of {expression} selected by the current index" , values: { expression: access.parent?.expression }}),
    value: current.value === undefined ? current.unavailable! : formatExecutionValue(current.value),
    hasValue: current.value !== undefined,
    changed: !!prior && (prior.value !== current.value || prior.unavailable !== current.unavailable),
    previous: prior?.value === undefined ? prior?.unavailable ?? _(/*i18n*/ { id: "Unavailable (no comparable value in the current call)", message: "Unavailable (no comparable value in the current call)" }) : formatExecutionValue(prior.value),
    previousHasValue: prior?.value !== undefined,
  }
}

export function accessParents(access: Access, step: SweepStep, values: string[], line: number, _: I18n['_']) {
  const parents = []
  for (let parent = access.parent; parent; parent = parent.parent) {
    const value = resolve(parent, step, values, line, _)
    parents.push({ expression: parent.expression, value: value.value === undefined ? value.unavailable! : formatExecutionValue(value.value), hasValue: value.value !== undefined })
  }
  return parents
}
