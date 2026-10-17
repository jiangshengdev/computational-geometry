import assert from 'node:assert/strict'
import { test } from 'node:test'
import { difference, semanticStep } from './compare-traces-support.ts'
import type { SweepStep } from '../web/src/algorithms/bo/learning/trace.ts'

const variable = { name: 'id', type: 'usize', availability: 'available' as const, value: 0, scope: null }
const step: SweepStep = {
  phase: 'initial', action: 'initial', subjects: [], current: null, pending: [], active: [], results: [], checked: [], starts: [], ends: [], passes: [],
  execution: { module: 'initial', boundary: null, entry: false, controls: [], blocks: [], returning: false, resuming: false,
    context: { id: 0, function: 'sweep', parameters: [], captures: [], locals: [variable] }, outer: [],
    calls: [{ line: 1, function: 'get', occurrence: 0, arguments: [variable], result: variable }],
  },
}

test('semantic comparison ignores dictionary layout while retaining variable values', () => {
  const shifted = structuredClone(step)
  shifted.execution.context.locals[0].value = 1
  shifted.execution.calls[0].arguments[0].value = 1
  shifted.execution.calls[0].result.value = 1
  assert.deepEqual(semanticStep(step, ['7']), semanticStep(shifted, ['unused', '7']))
  assert.throws(() => semanticStep(step, []), /Invalid variable index/)
})

test('differences identify step, variable and call fields', () => {
  const expected = semanticStep(step, ['7'])
  const state = structuredClone(expected)
  state.active.push(1)
  assert.equal(difference(expected, state), '$.active.length')
  const value = structuredClone(expected)
  value.execution.context.locals[0].value = '8'
  assert.equal(difference(expected, value), '$.execution.context.locals[0].value')
  const call = structuredClone(expected)
  call.execution.calls[0].result.availability = 'unavailable'
  assert.equal(difference(expected, call), '$.execution.calls[0].result.availability')
  assert.equal(difference({ a: null }, {}), '$.a')
  assert.equal(difference([1, 2], [2, 1]), '$[0]')
})
