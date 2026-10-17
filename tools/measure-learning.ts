// Root-owned orchestration: each layer builds itself; only this process owns services.
import { spawn, execFile, type ChildProcessByStdio, type SpawnOptions } from 'node:child_process'
import { createRequire, registerHooks } from 'node:module'
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { tmpdir, platform, arch, cpus, totalmem } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { promisify, stripVTControlCharacters } from 'node:util'
import type { Readable } from 'node:stream'
import type { Browser, BrowserContext, BrowserServer } from '@playwright/test'
import type { Preset } from '../web/src/algorithms/bo/cases/preset.ts'

type ServiceProcess = ChildProcessByStdio<null, Readable, Readable> & { launchError?: Error }
interface LifecycleEvent {
  status: string
  sentSteps: number
  producerElapsedMs: number
  observedAtMs: number
  observedAtEpochMs: number
}
interface ResourceSample {
  elapsedMs: number
  backendRssBytes: number
  browserRssBytes: number
  browserJsHeapUsedBytes: number
}
type Entry = 'direct' | 'result-link'
type Temperature = 'cold-context' | 'warm-context'
interface Sample {
  case: string
  segments: number
  inputBytes: number
  round: number
  entry: Entry
  temperature: Temperature
  resourceSamples: ResourceSample[]
  firstStepMs?: number
  firstStepWithinThreeSeconds?: boolean
  traceId?: string
  nextStepMs?: number
  fullGenerationMs?: number
  steps?: number
  traceTransferBytes?: number
  lifecycle?: LifecycleEvent
  remoteTarget?: number
  generatedAtRemoteRequest?: number
  remoteJumpMs?: number
  waitCancellationOutcome?: 'generation-completed-before-cancel' | 'cancelled'
  cancelWaitMs?: number
  cancelObservedMs?: number | null
  leaveClickDispatchMs?: number
  producerStopAfterClickMs?: number | null
  cancellationOutcome?: 'cancelled' | 'producer-completed-before-cancellation-observed' | 'failed'
  backendRssObservedMaxBytes?: number
  browserRssObservedMaxBytes?: number
  browserJsHeapObservedMaxBytes?: number
  resourceError?: string
  error?: string
}

declare global {
  var __learningPerfLeaveAt: number | undefined
}

const root = fileURLToPath(new URL('../', import.meta.url))
const web = join(root, 'web')
const require = createRequire(new URL('../web/package.json', import.meta.url))
const { chromium, expect } = require('@playwright/test') as typeof import('@playwright/test')
const exec = promisify(execFile)
const watchdogMs = 120_000 // Diagnostic watchdog, never a product acceptance limit.
const mode = process.env.BO_PERF_MODE ?? 'first'
const rounds = Number(process.env.BO_PERF_ROUNDS ?? 3)
if (!['first', 'full', 'cancel'].includes(mode)) throw new Error('BO_PERF_MODE must be first, full or cancel')
if (!Number.isSafeInteger(rounds) || rounds < 1) throw new Error('BO_PERF_ROUNDS must be a positive integer')
registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.split('/').at(-1)?.includes('.')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})
const { presets } = await import('../web/src/algorithms/bo/cases/presets.ts')
const ids = (process.env.BO_PERF_CASES ?? 'carbon-nanotube,fullerene,penrose').split(',').map(id => id.trim()).filter(Boolean)
if (!ids.length) throw new Error('BO_PERF_CASES must not be empty')
const cases = ids.map(id => {
  const preset = presets.find(item => item.id === id)
  if (!preset?.learning) throw new Error(`Unknown learning case: ${id}`)
  return preset
})
const children = new Set<ServiceProcess>()
const lifecycle = new Map<string, LifecycleEvent[]>()
let browser: Browser | undefined
let browserServer: BrowserServer | undefined
let backend: ServiceProcess | undefined
let output: string | undefined
const report = {
  mode, rounds, startedAt: new Date().toISOString(), samples: [] as Sample[],
  error: undefined as string | undefined,
  finishedAt: undefined as string | undefined,
  output: undefined as string | null | undefined,
  environment: { platform: platform(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, physicalMemoryBytes: totalmem(), node: process.version } as Record<string, string | number | undefined>,
  methodology: {
    build: 'Rust release offline; frontend production build served by Vite preview',
    browser: 'headless Chromium; fresh context per case/round/entry; warm repeats in the same context',
    cold: 'fresh browser context, not cold operating-system caches or a freshly restarted backend',
    pinnedPanels: true, reducedMotion: 'reduce' as const, viewport: { width: 1360, height: 900 },
    firstStep: 'action start to visible slider value 0, enabled next button and visible current-event context',
    full: 'action start to UI no longer generating; final replay step and learning-results region verified',
    memory: '250 ms interval samples; observed maxima of backend RSS, isolated Chromium process-tree summed RSS and page JSHeapUsedSize; RSS may double-count shared pages; not exact peaks',
    bytes: 'CDP Network.loadingFinished encodedDataLength for the trace response; includes protocol overhead; unavailable for cancelled streams',
    cancellation: 'action start to receipt of matching backend trace_lifecycle cancelled log; includes observer and IPC scheduling',
    watchdogMs,
  },
}

function launch(command: string, args: string[], options: Pick<SpawnOptions, 'cwd' | 'env'> = {}) {
  const child: ServiceProcess = spawn(command, args, { cwd: root, env: process.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'], ...options })
  children.add(child)
  child.stdout.on('data', chunk => process.stderr.write(chunk))
  child.stderr.on('data', chunk => process.stderr.write(chunk))
  child.on('error', error => { child.launchError = error })
  return child
}

async function build(command: string, args: string[]) {
  const child = launch(command, args)
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed: code=${code}, signal=${signal}`)))
  })
  children.delete(child)
}

function serviceUrl(child: ServiceProcess, pattern: RegExp) {
  return new Promise<string>((resolve, reject) => {
    let text = ''
    const timer = setTimeout(() => finish(new Error('Service startup diagnostic watchdog expired')), watchdogMs)
    const data = (chunk: Buffer) => {
      text += chunk.toString()
      const match = stripVTControlCharacters(text).match(pattern)
      if (match) finish(null, match[1])
    }
    const failed = (error: Error) => finish(error)
    const exited = (code: number | null, signal: NodeJS.Signals | null) => finish(new Error(`Service exited before ready: ${code}/${signal}`))
    function finish(...[error, value]: [Error] | [null, string]) {
      clearTimeout(timer)
      child.stdout.off('data', data)
      child.off('error', failed)
      child.off('exit', exited)
      if (error === null) resolve(value)
      else reject(error)
    }
    child.stdout.on('data', data)
    child.once('error', failed)
    child.once('exit', exited)
  })
}

async function until<T>(read: () => T | undefined, description: string): Promise<T> {
  const started = performance.now()
  while (performance.now() - started < watchdogMs) {
    const value = read()
    if (value) return value
    if (backend?.exitCode !== null || backend?.launchError) throw new Error('Backend exited during measurement')
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error(`Diagnostic watchdog expired: ${description}`)
}

async function stop() {
  await browser?.close().catch(() => {})
  await browserServer?.close().catch(() => {})
  for (const child of children) {
    if (!child.pid) continue
    try { process.kill(-child.pid, 'SIGTERM') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') process.stderr.write(`${error}\n`) }
  }
  await new Promise(resolve => setTimeout(resolve, 300))
  for (const child of children) {
    if (!child.pid) continue
    try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') process.stderr.write(`${error}\n`) }
  }
  children.clear()
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void stop().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143))
  })
}

async function measure(context: BrowserContext, baseURL: string, preset: Preset, round: number, entry: Entry, temperature: Temperature) {
  const backendPid = backend?.pid
  const browserPid = browserServer?.process().pid
  if (!backendPid || !browserPid) throw new Error('Measurement services are not running')
  const page = await context.newPage()
  page.setDefaultTimeout(watchdogMs)
  page.setDefaultNavigationTimeout(watchdogMs)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Performance.enable')
  const network = new Map<string, { traceId: string; encodedDataLength?: number }>()
  cdp.on('Network.responseReceived', event => {
    const headers = event.response.headers
    const traceId = Object.entries(headers).find(([key]) => key.toLowerCase() === 'x-trace-id')?.[1]
    if (traceId) network.set(event.requestId, { traceId: String(traceId) })
  })
  cdp.on('Network.loadingFinished', event => {
    const item = network.get(event.requestId)
    if (item) item.encodedDataLength = event.encodedDataLength
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const sample: Sample = { case: preset.id, segments: preset.segments.length, inputBytes: Buffer.byteLength(JSON.stringify({ segments: preset.segments, trace: true })), round, entry, temperature, resourceSamples: [] }
  report.samples.push(sample)
  let sampling = false
  let activeSample = Promise.resolve()
  let timer: ReturnType<typeof setInterval> | undefined
  let started: number
  const takeSample = () => {
    if (sampling) return activeSample
    sampling = true
    activeSample = (async () => {
      const [rss, heap] = await Promise.all([
        exec('ps', ['-axo', 'pid=,ppid=,rss=']),
        cdp.send('Performance.getMetrics'),
      ])
      const processes = rss.stdout.trim().split('\n').map(line => {
        const [pid, parent, rssKiB] = line.trim().split(/\s+/).map(Number)
        return { pid, parent, rssKiB }
      })
      const rssKiB = processes.find(item => item.pid === backendPid)?.rssKiB
      if (rssKiB === undefined || !Number.isFinite(rssKiB) || rssKiB <= 0) throw new Error('Backend RSS sample unavailable')
      const browserPids = new Set([browserPid])
      let changed = true
      while (changed) {
        changed = false
        for (const item of processes) if (browserPids.has(item.parent) && !browserPids.has(item.pid)) {
          browserPids.add(item.pid)
          changed = true
        }
      }
      const browserRss = processes.filter(item => browserPids.has(item.pid)).reduce((sum, item) => sum + item.rssKiB * 1024, 0)
      const used = heap.metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value
      if (used === undefined || !Number.isFinite(used)) throw new Error('Chromium JSHeapUsedSize unavailable')
      sample.resourceSamples.push({ elapsedMs: performance.now() - started, backendRssBytes: rssKiB * 1024, browserRssBytes: browserRss, browserJsHeapUsedBytes: used })
    })().catch(error => { sample.resourceError = String(error) }).finally(() => { sampling = false })
    return activeSample
  }
  try {
    if (entry === 'result-link') {
      await page.goto(`${baseURL}bo/cases/${preset.id}`)
      await expect(page.getByRole('radio').first()).toBeVisible({ timeout: watchdogMs })
    }
    const traceResponse = page.waitForResponse(response => response.url().endsWith('/api/bo/intersections') && response.request().postDataJSON()?.trace === true)
    // The awaited action can fail first; retain that primary diagnostic without
    // a later unhandled rejection from the pending response observer.
    void traceResponse.catch(() => {})
    started = performance.now()
    timer = setInterval(takeSample, 250)
    if (entry === 'direct') await page.goto(`${baseURL}bo/cases/${preset.id}/learn`, { waitUntil: 'commit' })
    else await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    await expect(slider).toBeVisible({ timeout: watchdogMs })
    await expect(slider).toHaveValue('0', { timeout: watchdogMs })
    await expect(next).toBeEnabled({ timeout: watchdogMs })
    await expect(page.getByRole('region', { name: '当前事件', exact: true })).toBeVisible({ timeout: watchdogMs })
    sample.firstStepMs = performance.now() - started
    sample.firstStepWithinThreeSeconds = sample.firstStepMs <= 3000
    const response = await traceResponse
    expect(response.status()).toBe(200)
    const traceId = response.headers()['x-trace-id']
    if (!traceId) throw new Error('Missing x-trace-id')
    sample.traceId = traceId
    const nextStarted = performance.now()
    await next.click()
    await expect(slider).toHaveValue('1', { timeout: watchdogMs })
    sample.nextStepMs = performance.now() - nextStarted
    if (mode === 'full') {
      await expect(page.getByRole('region', { name: '回放控制' })).not.toContainText('轨迹生成中', { timeout: watchdogMs })
      sample.fullGenerationMs = performance.now() - started
      const maximum = await slider.getAttribute('max') ?? await slider.getAttribute('aria-valuemax')
      sample.steps = Number(maximum) + 1
      if (!Number.isSafeInteger(sample.steps) || sample.steps < 2) throw new Error('Invalid complete step count')
      await slider.focus()
      await slider.press('End')
      await expect(slider).toHaveValue(String(sample.steps - 1), { timeout: watchdogMs })
      await expect(page.getByRole('region', { name: '学习结果' })).toBeVisible({ timeout: watchdogMs })
      const transfer = await until(() => [...network.values()].find(item => item.traceId === sample.traceId && item.encodedDataLength !== undefined), 'finished trace transfer')
      sample.traceTransferBytes = transfer.encodedDataLength
      sample.lifecycle = await until(() => lifecycle.get(traceId)?.find(event => event.status !== 'started'), 'complete producer lifecycle')
      expect(sample.lifecycle.status).toBe('completed')
    } else {
      const destination = mode === 'cancel' ? 1 : preset.segments.length > 20 ? 2000 : 100
      if (mode === 'first') {
        sample.remoteTarget = destination
        sample.generatedAtRemoteRequest = Number(await slider.getAttribute('max')) + 1
        await page.getByRole('spinbutton', { name: '跳转步骤' }).fill(String(destination))
        const jumpStarted = performance.now()
        await page.getByRole('button', { name: '前往步骤' }).click()
        await expect(slider).toHaveValue(String(destination), { timeout: watchdogMs })
        sample.remoteJumpMs = performance.now() - jumpStarted
      }
      let returnedToResults = false
      if (mode === 'first' && (await page.getByRole('region', { name: '回放控制' }).innerText()).includes('轨迹生成中')) {
        await page.getByRole('spinbutton', { name: '跳转步骤' }).fill('999999999')
        await page.getByRole('button', { name: '前往步骤' }).click()
        const cancel = page.getByRole('button', { name: '取消跳转等待' })
        const recovery = page.getByRole('navigation', { name: '恢复导航' }).getByRole('link', { name: '查看详情', exact: true })
        // Completion may overtake the deliberately unreachable target before
        // automation observes waiting. Both outcomes are valid and exclusive.
        await expect(cancel.or(recovery)).toBeVisible({ timeout: watchdogMs })
        const waitCancelStarted = performance.now()
        await cancel.or(recovery).click()
        await expect(page.getByRole('status', { name: '步骤等待' })).toHaveCount(0, { timeout: watchdogMs })
        returnedToResults = new URL(page.url()).pathname === `/bo/cases/${preset.id}`
        if (returnedToResults) sample.waitCancellationOutcome = 'generation-completed-before-cancel'
        else {
          await expect(slider).toHaveValue(String(destination), { timeout: watchdogMs })
          sample.cancelWaitMs = performance.now() - waitCancelStarted
          sample.waitCancellationOutcome = 'cancelled'
        }
      }
      await page.evaluate(id => {
        document.addEventListener('click', event => {
          const link = event.target instanceof Element ? event.target.closest('a') : null
          if (link && new URL(link.href).pathname === `/bo/cases/${id}`) globalThis.__learningPerfLeaveAt = Date.now()
        }, { capture: true, once: true })
      }, preset.id)
      const cancellationStartedEpoch = Date.now()
      const cancellationStarted = performance.now()
      if (!returnedToResults) await page.getByRole('link', { name: '返回结果查看器', exact: true }).click()
      const ended = await until(() => lifecycle.get(traceId)?.find(event => event.status !== 'started'), 'producer cancellation or prior completion')
      sample.lifecycle = ended
      sample.cancelObservedMs = ended.status === 'cancelled' ? ended.observedAtMs - cancellationStarted : null
      const dispatchedAt = await page.evaluate(() => globalThis.__learningPerfLeaveAt)
      if (!returnedToResults && dispatchedAt !== undefined && Number.isFinite(dispatchedAt)) {
        sample.leaveClickDispatchMs = dispatchedAt - cancellationStartedEpoch
        sample.producerStopAfterClickMs = ended.status === 'cancelled' ? ended.observedAtEpochMs - dispatchedAt : null
      }
      sample.cancellationOutcome = ended.status === 'cancelled' ? 'cancelled' : ended.status === 'completed' ? 'producer-completed-before-cancellation-observed' : 'failed'
      if (ended.status === 'failed') throw new Error('Trace producer failed')
    }
    await takeSample()
    if (sample.resourceError) throw new Error(sample.resourceError)
    sample.backendRssObservedMaxBytes = Math.max(...sample.resourceSamples.map(item => item.backendRssBytes))
    sample.browserRssObservedMaxBytes = Math.max(...sample.resourceSamples.map(item => item.browserRssBytes))
    sample.browserJsHeapObservedMaxBytes = Math.max(...sample.resourceSamples.map(item => item.browserJsHeapUsedBytes))
    expect(errors).toEqual([])
  } catch (error) {
    sample.error = String(error)
    throw error
  } finally {
    clearInterval(timer)
    await activeSample
    await page.close()
  }
}

try {
  // Check installed tools and browser before any build; never install components.
  report.environment.cargo = (await exec('cargo', ['--version'])).stdout.trim()
  report.environment.pnpm = (await exec('pnpm', ['--version'])).stdout.trim()
  report.environment.revision = (await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim()
  const diff = (await exec('git', ['diff', 'HEAD', '--', 'src', 'web/src', 'Cargo.toml', 'Cargo.lock', 'web/package.json', 'web/pnpm-lock.yaml'], { cwd: root })).stdout
  report.environment.sourceDiffSha256 = createHash('sha256').update(diff).digest('hex')
  report.environment.measurementSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex')
  await exec('ps', ['-o', 'rss=', '-p', String(process.pid)])
  await access(chromium.executablePath(), constants.X_OK)
  browserServer = await chromium.launchServer({ headless: true })
  browser = await chromium.connect(browserServer.wsEndpoint())
  report.environment.chromium = browser.version()
  output = process.env.BO_PERF_OUTPUT ?? join(await mkdtemp(join(tmpdir(), 'bo-learning-perf-')), 'report.json')
  await access(dirname(output), constants.W_OK)
  await build('cargo', ['build', '--release', '--offline'])
  await build('pnpm', ['--dir', 'web', 'build'])
  backend = launch(join(root, 'target/release/computational-geometry'), [], { env: { ...process.env, BO_PORT: '0', BO_TRACE_LIFECYCLE: '1' } })
  let stderr = ''
  backend.stderr.on('data', chunk => {
    stderr += chunk.toString()
    const lines = stderr.split('\n')
    stderr = lines.pop()!
    for (const line of lines) {
      const match = line.match(/trace_lifecycle id=(\d+) status=(\w+) sent_steps=(\d+) elapsed_ms=(\d+)/)
      if (!match) continue
      const [, id, status, steps, elapsed] = match
      const events = lifecycle.get(id) ?? []
      events.push({ status, sentSteps: Number(steps), producerElapsedMs: Number(elapsed), observedAtMs: performance.now(), observedAtEpochMs: Date.now() })
      lifecycle.set(id, events)
    }
  })
  const apiURL = await serviceUrl(backend, /BO API listening on (http:\/\/127\.0\.0\.1:\d+)/)
  const frontend = launch('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '0', '--strictPort'], { cwd: web, env: { ...process.env, BO_API_URL: apiURL, NO_COLOR: '1' } })
  const baseURL = await serviceUrl(frontend, /Local:\s+(http:\/\/127\.0\.0\.1:\d+\/)/)
  for (const preset of cases) for (let round = 1; round <= rounds; round++) {
    for (const entry of mode === 'first' ? ['direct', 'result-link'] as const : ['direct'] as const) {
      const context = await browser.newContext({ viewport: report.methodology.viewport, reducedMotion: 'reduce' })
      await context.addInitScript(() => {
        for (const side of ['left', 'right']) localStorage.setItem(`bo-learning-layout-v1-${side}`, 'true')
      })
      try {
        await measure(context, baseURL, preset, round, entry, 'cold-context')
        if (mode === 'first') await measure(context, baseURL, preset, round, entry, 'warm-context')
      } finally { await context.close() }
    }
  }
} catch (error) {
  report.error = String(error)
  process.exitCode = 1
} finally {
  await stop()
  report.finishedAt = new Date().toISOString()
  report.output = output ?? null
  const json = `${JSON.stringify(report, null, 2)}\n`
  if (output) await writeFile(output, json)
  process.stdout.write(json)
}
