// Frontend-owned export. Rust consumes only the generated neutral text files.
// Run explicitly with Node 24; backend tests never invoke this script.
import { registerHooks } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Rational } from '../../../../src/geometry/geometry'
import type { Intersection } from '../../../../src/algorithms/segment-intersection/geometry'
import type { Preset } from '../../../../src/algorithms/segment-intersection/cases/preset'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.split('/').at(-1)?.includes('.')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})
const { presets } = await import('../../../../src/algorithms/segment-intersection/cases/presets')
const { point } = await import('../../../../src/geometry/geometry')
const { segment } = await import('../../../../src/algorithms/segment-intersection/geometry')
const directory = process.env.BO_PERF_FIXTURES
  ? pathToFileURL(`${resolve(process.env.BO_PERF_FIXTURES)}/`)
  : new URL('../../../../../tests/fixtures/algorithms/segment_intersection/performance/', import.meta.url)
const family = process.env.BO_PERF_FAMILY
if (family !== undefined && !['sparse', 'dense', 'overlap', 'overlap-events'].includes(family)) {
  throw new Error('BO_PERF_FAMILY must be sparse, dense, overlap or overlap-events')
}
const expected = new Map<string, Intersection[]>()
const catalog: Preset[] = []
if (family !== undefined) {
  const values = (process.env.BO_PERF_SIZES ?? '').split(',').map(value => value.trim())
  if (values.some(value => !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))) {
    throw new Error('BO_PERF_SIZES must be comma-separated positive safe integers')
  }
  // These are closed-form answers for the constructions below, not another
  // intersection algorithm. The frontend rational helper does not reduce fractions.
  const reduced = (numerator: bigint, denominator: bigint) => {
    let a = numerator < 0n ? -numerator : numerator
    let b = denominator
    while (b !== 0n) [a, b] = [b, a % b]
    return `${numerator / a}/${denominator / a}`
  }
  for (const size of new Set(values.map(Number))) {
    const id = `${family}-${size}`
    const n = BigInt(size)
    const segments = Array.from({ length: size }, (_, index) => {
      const i = BigInt(index)
      if (family === 'sparse') return segment('0', `${i}`, `${n}`, `${i}`)
      if (family === 'dense') return segment('0', `${i + 1n}`, '1', `${-((i + 1n) ** 2n)}`)
      if (family === 'overlap-events') return segment('0', '0', `${n + 1n}`, '0')
      return segment(`${i}`, '0', `${i + n}`, '0')
    })
    const intersections: Intersection[] = []
    if (family === 'overlap-events') {
      for (let index = 0; index < size; index++) {
        const x = BigInt(index + 1)
        segments.push(segment(`${x}`, '0', `${x}`, '0'))
      }
      for (let index = 0; index < size; index++) {
        const x = BigInt(index + 1)
        segments.push(segment(`${2n * x - 1n}/2`, '-1', `${2n * x + 1n}/2`, '1'))
      }
      for (let left = 0; left < size; left++) {
        for (let right = left + 1; right < size; right++) intersections.push({ segments: [left, right], geometry: { type: 'overlap', start: point('0', '0'), end: point(`${n + 1n}`, '0') } })
        for (let index = 0; index < size; index++) for (const right of [size + index, 2 * size + index]) intersections.push({ segments: [left, right], geometry: { type: 'point', point: point(`${index + 1}`, '0') } })
      }
      for (let index = 0; index < size; index++) intersections.push({ segments: [size + index, 2 * size + index], geometry: { type: 'point', point: point(`${index + 1}`, '0') } })
    } else if (family !== 'sparse') for (let left = 0; left < size; left++) for (let right = left + 1; right < size; right++) {
      const i = BigInt(left)
      const j = BigInt(right)
      intersections.push({ segments: [left, right], geometry: family === 'dense'
        ? { type: 'point', point: point(reduced(1n, 3n + i + j), reduced((i + 1n) * (j + 1n), 3n + i + j)) }
        : { type: 'overlap', start: point(`${j}`, '0'), end: point(`${i + n}`, '0') } })
    }
    catalog.push({ id, name: { id, message: id }, description: { id, message: id }, segments,
      learning: { goal: { id, message: id }, verification: { id, message: id }, ...(family === 'overlap' ? { overlap: true } : {}) } })
    expected.set(id, intersections)
  }
} else {
  const ids = (process.env.BO_PERF_CASES ?? 'spider-web,hexagonal-snowflake,vertical-overlap,mixed-vertical').split(',').map(id => id.trim())
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('BO_PERF_CASES must contain unique preset IDs')
  for (const id of ids) {
    const preset = presets.find(preset => preset.id === id)
    if (!preset) throw new Error(`Unknown performance preset: ${id}`)
    catalog.push(preset)
  }
}
mkdirSync(directory, { recursive: true })
writeFileSync(new URL('catalog.json', directory), JSON.stringify(catalog))
for (const preset of catalog) {
  const { id } = preset
  const { segments } = preset
  const rational = (value: Rational) => `${value.numerator}/${value.denominator}`
  const rows = segments.map(({ start, end }) =>
    [start.x, start.y, end.x, end.y].map(rational).join('\t'))
  writeFileSync(new URL(`${id}.tsv`, directory), `${rows.join('\n')}\n`)
  for (const trace of [false, true]) {
    writeFileSync(new URL(`${id}-${trace}.json`, directory), JSON.stringify({ segments, trace }))
  }
  if (expected.has(id)) writeFileSync(new URL(`${id}.expected.json`, directory), JSON.stringify(expected.get(id)))
  console.log(`${id}: ${segments.length} segments exported`)
}
