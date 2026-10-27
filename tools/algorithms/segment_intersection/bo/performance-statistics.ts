// Summarize independent serial batches without pooling different binaries/inputs.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const directories = process.argv.slice(2)
if (!directories.length) throw new Error('Expected one or more comparison output directories')
type Sample = { case: string; batch: number; version: string; mode: string; raw: number[] }
type Input = { id: string; files: { suffix: string; sha256: string }[] }
const runs = directories.map(directory => ({
  manifest: JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')) as { binaries: { sha256: string }[]; inputs: Input[]; rounds: number },
  data: JSON.parse(readFileSync(join(directory, 'samples.json'), 'utf8')) as { samples: Sample[]; failures: unknown[] },
}))
const inputs = new Map<string, string>()
const modes = ['sweep', 'sweep_trace', 'http', 'http_trace']
for (const run of runs) {
  if (JSON.stringify(run.manifest.binaries.map(value => value.sha256)) !== JSON.stringify(runs[0].manifest.binaries.map(value => value.sha256))) throw new Error('Different binary identities; do not pool')
  if (run.data.failures.length) throw new Error('Failed measurements remain incomplete; inspect samples.json')
  const expected = new Set<string>()
  for (const input of run.manifest.inputs) {
    const identity = JSON.stringify(input.files)
    if (inputs.has(input.id) && inputs.get(input.id) !== identity) throw new Error(`Different input identity: ${input.id}`)
    inputs.set(input.id, identity)
    for (const mode of modes) for (const version of ['baseline', 'candidate']) for (const batch of [0, 1]) expected.add(`${input.id}/${mode}/${version}/${batch}`)
  }
  for (const sample of run.data.samples) {
    const key = `${sample.case}/${sample.mode}/${sample.version}/${sample.batch}`
    if (!expected.delete(key)) throw new Error(`Unexpected or duplicate sample: ${key}`)
    if (sample.raw.length !== run.manifest.rounds || sample.raw.some(value => !Number.isFinite(value) || value < 0)) throw new Error(`Invalid samples: ${key}`)
  }
  if (expected.size) throw new Error(`Incomplete measurement: ${[...expected].join(', ')}`)
}
let seed = 265
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
const quantile = (values: number[], probability: number) => {
  const sorted = values.sort((a, b) => a - b)
  if (probability === .5 && sorted.length % 2 === 0) return (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
  return sorted[Math.ceil(probability * sorted.length) - 1]
}
const samples = runs.flatMap(run => run.data.samples)
const keys = [...inputs.keys()].flatMap(id => modes.map(mode => `${id}/${mode}`))
const results = keys.map(key => {
  const matching = samples.filter(sample => `${sample.case}/${sample.mode}` === key)
  const groups = ['baseline', 'candidate'].map(version => matching.filter(sample => sample.version === version).map(sample => sample.raw))
  return { key, metrics: [.5, .95].map(probability => {
    const observed = groups.map(group => quantile(group.flat(), probability))
    const differences: number[] = []
    for (let replicate = 0; replicate < 4000; replicate++) {
      const values = groups.map(group => quantile(group.flatMap(batch => batch.map(() => batch[Math.floor(random() * batch.length)])), probability))
      differences.push(values[1] - values[0])
    }
    const lower = quantile([...differences], .005)
    const upper = quantile(differences, .995)
    return { statistic: probability === .5 ? 'median' : 'p95', baselineMs: observed[0], candidateMs: observed[1], difference99PercentIntervalMs: [lower, upper], conclusion: upper <= 0 ? 'no-regression-evidenced' : lower > 0 ? 'regression-evidenced' : 'unproven' }
  }) }
})
console.log(JSON.stringify({ method: '4000 stratified bootstrap resamples within each version/batch; fixed PRNG seed 265; percentile 99% difference interval; no multiplicity correction; per-metric evidence only', failures: runs.flatMap(run => run.data.failures), results }, null, 2))
