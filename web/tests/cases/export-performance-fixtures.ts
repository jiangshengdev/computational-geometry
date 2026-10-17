// Frontend-owned export. Rust consumes only the generated neutral text files.
// Run explicitly with Node 24; backend tests never invoke this script.
import { registerHooks } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Rational } from '../../src/geometry/geometry'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.split('/').at(-1)?.includes('.')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})
const { presets } = await import('../../src/algorithms/bo/cases/presets')
const directory = new URL('../../../tests/fixtures/performance/', import.meta.url)
mkdirSync(directory, { recursive: true })
for (const id of ['spider-web', 'hexagonal-snowflake', 'vertical-overlap', 'mixed-vertical']) {
  const preset = presets.find(preset => preset.id === id)
  if (!preset) throw new Error(`Unknown performance preset: ${id}`)
  const { segments } = preset
  const rational = (value: Rational) => `${value.numerator}/${value.denominator}`
  const rows = segments.map(({ start, end }) =>
    [start.x, start.y, end.x, end.y].map(rational).join('\t'))
  writeFileSync(new URL(`${id}.tsv`, directory), `${rows.join('\n')}\n`)
  for (const trace of [false, true]) {
    writeFileSync(new URL(`${id}-${trace}.json`, directory), JSON.stringify({ segments, trace }))
  }
  console.log(`${id}: ${segments.length} segments exported`)
}
