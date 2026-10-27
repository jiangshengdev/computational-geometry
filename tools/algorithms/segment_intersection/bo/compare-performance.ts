// Root-owned serial orchestration of prebuilt Rust diagnostic binaries.
// Build each revision offline in a distinct target directory before invoking.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { cpus, platform, arch } from 'node:os'

const [baselineArgument, candidateArgument, fixtureArgument, outputArgument] = process.argv.slice(2)
if (!baselineArgument || !candidateArgument || !fixtureArgument || !outputArgument) throw new Error('Expected BASELINE_BINARY CANDIDATE_BINARY FIXTURE_DIRECTORY NEW_OUTPUT_DIRECTORY')
const binaries = [resolve(baselineArgument), resolve(candidateArgument)]
const fixtures = resolve(fixtureArgument)
const output = resolve(outputArgument)
const cases = (process.env.BO_PERF_CASES ?? 'spider-web,hexagonal-snowflake,vertical-overlap,mixed-vertical,fullerene,sparse-32,sparse-64,sparse-128,dense-8,dense-16,overlap-8,overlap-16,overlap-events-8,overlap-events-16').split(',')
if (cases.some(id => !/^[a-zA-Z0-9_-]+$/.test(id)) || new Set(cases).size !== cases.length) throw new Error('Invalid case IDs')
const rounds = Number(process.env.BO_PERF_ROUNDS ?? 101)
if (!Number.isSafeInteger(rounds) || rounds < 101 || rounds % 2 !== 1) throw new Error('Use an odd sample count >= 101')
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex')
const metadata = {
  started: new Date().toISOString(), rounds, batches: 2, invocationTimeoutSeconds: 900,
  order: ['baseline,candidate', 'candidate,baseline'],
  statistic: 'median and nearest-rank P95; retain every valid batch; no fixed permitted slowdown',
  uncertainty: 'performance-statistics.ts: 4000 within-version/batch bootstrap resamples, seed 265, 99% percentile interval of candidate minus baseline; upper <= 0 supports no regression, lower > 0 supports regression, otherwise unproven. For uncertain final-version items collect at most two further two-batch campaigns; retain all samples and leave unresolved items unproven.',
  platform: platform(), arch: arch(), cpu: cpus()[0]?.model,
  binaries: binaries.map(path => ({ path, sha256: hash(readFileSync(path)) })),
  inputs: cases.map(id => ({ id, files: ['.tsv', '-false.json', '-true.json'].map(suffix => ({ suffix, sha256: hash(readFileSync(join(fixtures, id + suffix))) })) })),
}
mkdirSync(output) // Refuse overwriting any prior evidence.
writeFileSync(join(output, 'manifest.json'), JSON.stringify(metadata, null, 2))
type Sample = { case: string; batch: number; version: string; mode: string; raw: number[]; median: number; p95: number }
const samples: Sample[] = []
const failures: { case: string; batch: number; version: string; status: number | null; error?: string }[] = []
for (const id of cases) for (let batch = 0; batch < 2; batch++) for (const index of batch === 0 ? [0, 1] : [1, 0]) {
  const version = index === 0 ? 'baseline' : 'candidate'
  process.stdout.write(`${id} batch=${batch + 1} ${version}\n`)
  const run = spawnSync(binaries[index], ['algorithms::segment_intersection::bo::http::case_performance::actual_case_timings', '--exact', '--ignored', '--nocapture', '--test-threads=1'], {
    env: { ...process.env, BO_PERF_FIXTURES: fixtures, BO_PERF_CASES: id, BO_PERF_ROUNDS: String(rounds), BO_PERF_ORACLE: id === 'fullerene' ? 'brute-force' : 'fixture' },
    encoding: 'utf8', timeout: 900_000, maxBuffer: 64 * 1024 * 1024,
  })
  writeFileSync(join(output, `${id}-${batch + 1}-${version}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  if (run.status !== 0 || run.error) {
    failures.push({ case: id, batch, version, status: run.status, error: run.error?.message })
  } else {
    for (const match of run.stdout.matchAll(/(\S+) (sweep|sweep_trace|http|http_trace) raw_ms=(\[[^\n]+\])/g)) {
      const raw = JSON.parse(match[3]) as number[]
      if (raw.length !== rounds || raw.some(value => !Number.isFinite(value) || value < 0)) throw new Error('Invalid samples')
      const sorted = [...raw].sort((a, b) => a - b)
      samples.push({ case: id, batch, version, mode: match[2], raw, median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1] })
    }
  }
  writeFileSync(join(output, 'samples.json'), JSON.stringify({ samples, failures }, null, 2))
}
if (failures.length || samples.length !== cases.length * 16) throw new Error('Incomplete measurement; see samples.json and logs')
if (binaries.some((path, index) => hash(readFileSync(path)) !== metadata.binaries[index].sha256)) {
  failures.push({ case: '*', batch: -1, version: 'identity-check', status: null, error: 'Measured binary changed during execution' })
  writeFileSync(join(output, 'samples.json'), JSON.stringify({ samples, failures }, null, 2))
  throw new Error('Measured binary changed during execution; samples are invalid')
}
for (const id of cases) for (const mode of ['sweep', 'sweep_trace', 'http', 'http_trace']) {
  const values = samples.filter(sample => sample.case === id && sample.mode === mode)
  process.stdout.write(`${id} ${mode} ${values.map(value => `${value.version}/${value.batch + 1}: median=${value.median.toFixed(4)} p95=${value.p95.toFixed(4)}`).join(' ')}\n`)
}
