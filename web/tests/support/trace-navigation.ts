import { expect, type Page } from '@playwright/test'
import { presets } from '../../src/algorithms/bo/cases/presets'
import { type Intersection, type Segment } from '../../src/geometry/geometry'
import { TraceDecoder, type SweepStep, type SweepTrace, type TraceFrame } from '../../src/algorithms/bo/learning/trace'

export async function readResponse(response: { text(): Promise<string> }): Promise<{ intersections: Intersection[]; trace: SweepTrace }> {
  const decoder = new TraceDecoder()
  for (const line of (await response.text()).trim().split('\n')) decoder.append(JSON.parse(line) as TraceFrame)
  expect(decoder.complete).toBe(true)
  return { intersections: decoder.intersections, trace: decoder.trace }
}

export async function readResult(response: { json(): Promise<unknown> }): Promise<{ intersections: Intersection[] }> {
  const data = await response.json() as { intersections: Intersection[] }
  expect(data).not.toHaveProperty('trace')
  return data
}

// Read a clone of the page's own stream: inspector caches can evict large
// responses, and route.fetch() outlives a cancelled StrictMode request.
export async function captureIntersections(page: Page) {
  return captureResponse(page, readResponse)
}

export async function captureResult(page: Page) {
  return captureResponse(page, readResult)
}

async function captureResponse<T>(page: Page, read: (response: { json(): Promise<unknown>; text(): Promise<string> }) => Promise<T>) {
  const capture = await responseCapture(page)
  const response = capture.next()
  const result = response.then(({ status, body }) => {
    expect(status).toBe(200)
    return read({ text: async () => body, json: async () => JSON.parse(body) })
  })
  // Preserve rejection for the consumer without an unhandled rejection while
  // the test is still interacting with the page.
  void result.catch(() => {})
  return { result, response }
}

type CapturedResponse = { status: number; body: string; traceId: string | null }
type CaptureMessage = { kind: 'start' } | { kind: 'complete'; token: number; response: CapturedResponse } | { kind: 'error'; token: number; error: string }
const captures = new WeakMap<Page, Promise<{ next(): Promise<CapturedResponse> }>>()

function responseCapture(page: Page) {
  let capture = captures.get(page)
  if (!capture) {
    capture = (async () => {
      let token = 0
      let pending: { resolve(value: CapturedResponse): void; reject(error: Error): void } | undefined
      await page.exposeBinding('__captureApiResponse', (_source, message: CaptureMessage) => {
        if (message.kind === 'start') return pending ? token : null
        if (!pending || message.token !== token) return
        if (message.kind === 'complete') pending.resolve(message.response)
        else pending.reject(new Error(message.error))
        pending = undefined
      })
      const install = () => {
        const browser = window as typeof window & {
          __captureApiResponse(message: CaptureMessage): Promise<number | null>
        }
        const original = window.fetch
        window.fetch = async (input, init) => {
          const url = new URL(input instanceof Request ? input.url : String(input), location.href)
          if (url.pathname !== '/api/bo/intersections' || (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase() !== 'POST') {
            return original(input, init)
          }
          const captureToken = browser.__captureApiResponse({ kind: 'start' })
          const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
          const reportError = async (error: unknown) => {
            const token = await captureToken
            if (token !== null && !signal?.aborted) await browser.__captureApiResponse({ kind: 'error', token, error: String(error) })
          }
          try {
            const response = await original(input, init)
            const token = await captureToken
            if (token !== null) {
              void response.clone().text().then(async body => {
                if (!signal?.aborted) await browser.__captureApiResponse({ kind: 'complete', token, response: { status: response.status, body, traceId: response.headers.get('x-trace-id') } })
              }, reportError)
            }
            return response
          } catch (error) {
            await reportError(error)
            throw error
          }
        }
      }
      await page.addInitScript(install)
      await page.evaluate(install)
      page.on('close', () => pending?.reject(new Error('Page closed before the captured response completed')))
      return {
        next() {
          if (pending) throw new Error('A response capture is already pending')
          token++
          return new Promise<CapturedResponse>((resolve, reject) => { pending = { resolve, reject } })
        },
      }
    })()
    captures.set(page, capture)
  }
  return capture
}

export async function waitForTraceCompletion(page: Page) {
  await expect(page.getByRole('region', { name: '回放控制' })).not.toContainText('轨迹生成中')
}

export async function readIntersections(page: Page, input: { segments: Segment[]; trace: boolean }): Promise<{ intersections: Intersection[]; trace: SweepTrace }> {
  const response = await page.request.post('/api/bo/intersections', { data: input })
  expect(response.status()).toBe(200)
  return readResponse(response)
}

export async function readTrace(page: Page, id: string): Promise<SweepTrace> {
  const preset = presets.find(preset => preset.id === id)
  if (!preset) throw new Error(`Unknown preset: ${id}`)
  return (await readIntersections(page, { segments: preset.segments, trace: true })).trace
}

export function stepIndex(trace: SweepTrace, predicate: (step: SweepStep, index: number) => boolean): number {
  const index = trace.steps.findIndex(predicate)
  expect(index, '真实轨迹中必须存在目标动作').toBeGreaterThanOrEqual(0)
  return index
}

export async function seekStep(page: Page, target: number, mode: 'step' | 'jump' = 'step') {
  const slider = page.getByRole('slider', { name: '教学步骤' })
  // Domain-state replay checks each selected observation; keyboard and
  // animation tests retain the default traversal through every small step.
  if (mode === 'jump') {
    const destination = page.getByRole('spinbutton', { name: '跳转步骤' })
    await destination.fill(String(target))
    await destination.press('Enter')
    await expect(slider).toHaveValue(String(target))
    await expect.poll(() => new URL(page.url()).searchParams.get('step') ?? '0').toBe(String(target))
    await slider.focus()
    return
  }
  await slider.focus()
  const current = Number(await slider.inputValue())
  for (let remaining = Math.abs(target - current); remaining > 0; remaining--) {
    await slider.press(target > current ? 'ArrowRight' : 'ArrowLeft')
  }
  await expect(slider).toHaveValue(String(target))
}
