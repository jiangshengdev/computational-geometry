// Root-owned HTTP orchestration; frontend decoding is reused without starting its toolchain.
import { spawn, execFile, type ChildProcess } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { registerHooks } from 'node:module'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { finished, pipeline } from 'node:stream/promises'
import { createGzip, createGunzip } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { difference, semanticStep } from './compare-traces-support.ts'
import type { TraceFrame } from '../web/src/algorithms/bo/learning/trace.ts'

registerHooks({ resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.split('/').at(-1)?.includes('.')) return nextResolve(`${specifier}.ts`, context)
  return nextResolve(specifier, context)
} })
const { TraceDecoder } = await import('../web/src/algorithms/bo/learning/trace.ts')
const root = fileURLToPath(new URL('../', import.meta.url))
const exec = promisify(execFile)
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const [mode, argument] = process.argv.slice(2)
const baseline = argument ?? process.env.BO_TRACE_BASELINE
if (!['capture', 'compare'].includes(mode) || !baseline) throw new Error('Usage: node tools/compare-traces.ts capture|compare BASELINE.jsonl.gz (or BO_TRACE_BASELINE)')
const directory = resolve(process.env.BO_PERF_FIXTURES ?? join(root, 'tests/fixtures/performance'))
const ids = (process.env.BO_PERF_CASES ?? 'spider-web,hexagonal-snowflake,vertical-overlap,mixed-vertical').split(',').map(id => id.trim())
if (!ids.length || ids.some(id => !/^[a-zA-Z0-9_-]+$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('BO_PERF_CASES must contain unique fixture IDs')
const requests = await Promise.all(ids.map(async id => {
  const body = await readFile(join(directory, `${id}-true.json`), 'utf8')
  const request = JSON.parse(body) as { trace?: boolean; segments?: unknown[] }
  if (request.trace !== true || !Array.isArray(request.segments)) throw new Error(`Invalid trace request: ${id}`)
  return { id, body, inputSha256: sha256(JSON.stringify(request)), segments: request.segments.length }
}))
const git = async (...args: string[]) => (await exec('git', args, { cwd: root })).stdout
const provenance = {
  revision: (await git('rev-parse', 'HEAD')).trim(),
  status: await git('status', '--porcelain'),
  sourceDiffSha256: sha256(await git('diff', 'HEAD', '--', 'src', 'web/src', 'Cargo.toml', 'Cargo.lock')),
  toolSha256: sha256(await readFile(fileURLToPath(import.meta.url), 'utf8')),
  node: process.version,
}
let child: ChildProcess | undefined
let stopping: Promise<void> | undefined
async function stop() {
  if (stopping) return stopping
  stopping = (async () => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return
    const exited = once(child, 'exit')
    child.kill('SIGTERM')
    const timer = setTimeout(() => child?.kill('SIGKILL'), 3000)
    try { await exited } finally { clearTimeout(timer) }
  })()
  return stopping
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  void stop().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143))
})

const gzip = mode === 'capture' ? createGzip() : undefined
const output = gzip ? createWriteStream(resolve(baseline), { flags: 'wx' }) : undefined
const writing = gzip && output ? pipeline(gzip, output) : undefined
// Attach immediately, including refusal to overwrite, before starting a service.
void writing?.catch(() => {})
const input = mode === 'compare' ? createReadStream(resolve(baseline)) : undefined
const gunzip = input ? createGunzip() : undefined
const reading = input && gunzip ? pipeline(input, gunzip) : undefined
void reading?.catch(() => {})
const lines = gunzip ? createInterface({ input: gunzip, crlfDelay: Infinity }) : undefined
const previous = lines?.[Symbol.asyncIterator]()
let records = 0
async function record(value: unknown, label: string, metadata = false) {
  records++
  if (gzip) {
    if (!gzip.write(`${JSON.stringify(value)}\n`)) await once(gzip, 'drain')
  } else {
    const old = await previous!.next()
    if (old.done) throw new Error(`${label}: baseline ended before record ${records}`)
    const expected = JSON.parse(old.value) as Record<string, unknown>
    const actual = value as Record<string, unknown>
    const field = difference(metadata ? { kind: expected.kind, format: expected.format, cases: expected.cases } : expected, metadata ? { kind: actual.kind, format: actual.format, cases: actual.cases } : actual)
    if (field) throw new Error(`${label}: first difference at ${field} (record ${records})`)
  }
}

try {
  if (output) await once(output, 'open')
  await record({ kind: 'metadata', format: 1, provenance, cases: requests.map(({ id, inputSha256, segments }) => ({ id, inputSha256, segments })) }, 'inputs', true)
  // Existing installed compiler only; no dependency installation or ordinary dev ports.
  await exec('cargo', ['build', '--release', '--offline'], { cwd: root })
  child = spawn(join(root, 'target/release/computational-geometry'), [], { cwd: root, env: { ...process.env, BO_PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stderr!.on('data', chunk => process.stderr.write(chunk))
  const url = await new Promise<string>((resolve, reject) => {
    let log = ''
    const timer = setTimeout(() => reject(new Error('Backend startup diagnostic watchdog expired')), 120_000)
    const data = (chunk: Buffer) => {
      log += chunk.toString()
      const match = log.match(/BO API listening on (http:\/\/127\.0\.0\.1:\d+)/)
      if (match) { clearTimeout(timer); child!.stdout!.off('data', data); resolve(match[1]) }
    }
    child!.stdout!.on('data', data)
    child!.once('error', error => { clearTimeout(timer); reject(error) })
    child!.once('exit', code => { clearTimeout(timer); reject(new Error(`Backend exited: ${code}`)) })
  })
  for (const request of requests) {
    const response = await fetch(`${url}/api/bo/intersections`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: request.body })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('application/x-ndjson') || !response.headers.get('x-trace-id') || !response.body) throw new Error(`${request.id}: invalid HTTP trace response`)
    const reader = response.body.getReader()
    const text = new TextDecoder()
    const decoder = new TraceDecoder()
    let pending = ''
    let steps = 0
    let frames = 0
    try {
      while (true) {
        const { value, done } = await reader.read()
        pending += text.decode(value, { stream: !done })
        let newline: number
        while ((newline = pending.indexOf('\n')) >= 0) {
          const line = pending.slice(0, newline)
          pending = pending.slice(newline + 1)
          if (!line) continue
          const frame = JSON.parse(line) as TraceFrame
          if (frames++ === 0 && (frame.complete || frame.steps.length !== 1 || frame.steps[0].action !== 'initial')) throw new Error(`${request.id}: invalid initial frame`)
          if (decoder.complete || (!frame.complete && frame.intersections !== undefined)) throw new Error(`${request.id}: invalid completion ordering`)
          if (frames > 1 && difference(decoder.trace.shear, frame.shear)) throw new Error(`${request.id}: shear changed`)
          const start = decoder.trace.steps.length
          decoder.append(frame)
          for (const step of decoder.trace.steps.slice(start)) {
            await record({ kind: 'step', case: request.id, index: steps, step: semanticStep(step, decoder.trace.values) }, `${request.id} step ${steps}`)
            steps++
          }
          // discover needs only the previous step; dictionaries and labels remain request-scoped.
          decoder.trace.steps.splice(0, Math.max(0, decoder.trace.steps.length - 1))
        }
        if (done) break
      }
      if (pending.trim() || !decoder.complete || frames < 2) throw new Error(`${request.id}: incomplete trace`)
      await record({ kind: 'final', case: request.id, steps, shear: decoder.trace.shear, intersections: decoder.intersections, pointLabels: decoder.trace.pointLabels }, `${request.id} final`)
      process.stderr.write(`${request.id}: ${steps} complete semantic steps ${mode === 'capture' ? 'captured' : 'matched'}\n`)
    } finally { await reader.cancel(); reader.releaseLock() }
  }
  if (previous && !(await previous.next()).done) throw new Error('Baseline contains extra records')
  if (reading) await reading
  if (gzip) { gzip.end(); await writing }
  process.stdout.write(`${JSON.stringify({ mode, records, provenance })}\n`)
} finally {
  await stop()
  lines?.close()
  input?.destroy()
  gunzip?.destroy()
  gzip?.destroy()
  output?.destroy()
  if (output) await finished(output).catch(() => {})
}
