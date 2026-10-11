import { expect, type Page } from '@playwright/test'
import { presets } from '../src/presets'
import { decodeTrace, type Intersection, type Segment, type SweepStep, type SweepTrace, type WireSweepTrace } from '../src/geometry'

export async function readResponse(response: { json(): Promise<unknown> }): Promise<{ intersections: Intersection[]; trace: SweepTrace }> {
  const data = await response.json() as { intersections: Intersection[]; trace: WireSweepTrace }
  return { intersections: data.intersections, trace: decodeTrace(data.trace) }
}

// Retain the actual HTTP response before the browser's inspector cache evicts
// large traces. Fulfill with that unmodified response, without a second run.
export async function captureIntersections(page: Page) {
  let resolve!: (value: { intersections: Intersection[]; trace: SweepTrace }) => void
  let reject!: (error: unknown) => void
  const result = new Promise<{ intersections: Intersection[]; trace: SweepTrace }>((done, fail) => { resolve = done; reject = fail })
  await page.route('**/api/intersections', async route => {
    try {
      const response = await route.fetch()
      expect(response.status()).toBe(200)
      const data = await readResponse(response)
      await route.fulfill({ response })
      resolve(data)
    } catch (error) {
      reject(error)
      throw error
    }
  }, { times: 1 })
  return { result }
}

export async function readIntersections(page: Page, input: { segments: Segment[]; trace: boolean }): Promise<{ intersections: Intersection[]; trace: SweepTrace }> {
  const response = await page.request.post('/api/intersections', { data: input })
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

export async function seekStep(page: Page, target: number) {
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  const current = Number(await slider.inputValue())
  for (let remaining = Math.abs(target - current); remaining > 0; remaining--) {
    await slider.press(target > current ? 'ArrowRight' : 'ArrowLeft')
  }
  await expect(slider).toHaveValue(String(target))
}
