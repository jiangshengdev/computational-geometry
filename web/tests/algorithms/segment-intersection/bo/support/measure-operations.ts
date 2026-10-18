import { expect, type Page } from '@playwright/test'
import { setupI18n } from '@lingui/core'
import { messages } from '../../../../../src/locales/zh-CN/messages'
import { executionSource } from '../../../../../src/algorithms/segment-intersection/bo/learning/executionCode'
import { hasVariableValue, shadowedValueNote, variableValue } from '../../../../../src/algorithms/segment-intersection/bo/learning/executionSymbols'
import { formatExecutionValue } from '../../../../../src/algorithms/segment-intersection/bo/learning/executionValue'
import { formatPoint } from '../../../../../src/geometry/geometry'
import { captureIntersections, readResponse } from './trace-navigation'
import { presets } from '../../../../../src/algorithms/segment-intersection/cases/presets'

interface Observation {
  operation: string; index: number; loaded: number; generating: boolean
  responseMs: number; frameIntervalMs: number; inputs: number
  inputGenerating: boolean; inputLoaded: number; inputAt: number; updateIntervalMs: number
  boundary: string | null
  frames: { id: string | null; rows: string[] }[]
  active: number[]; participants: number[]; checked: number[]; current: string | null
}

declare global {
  var __operationProbe: {
    operation: string; observations: Observation[]; inputAt: number; inputs: number
    previousIndex: number; frameAt: number; running: boolean
    inputGenerating: boolean; inputLoaded: number; updateAt: number; frameIntervals: { operation: string; ms: number }[]
  }
}

// Runs only against the production services owned by the root performance entry.
// Read all three teaching surfaces in one browser task. No production instrumentation.
export async function measureOperations(page: Page, baseURL: string, id: string) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  // Select a genuine nested call before timing; do not invent navigation targets.
  const preset = presets.find(preset => preset.id === id)!
  const referenceResponse = await page.request.post(`${baseURL}api/bo/intersections`, { data: { segments: preset.segments, trace: true } })
  const reference = await readResponse(referenceResponse)
  const nested = reference.trace.steps.findIndex((step, index) => index > 0 && step.execution.outer.length > 0 && !step.execution.returning)
  expect(nested).toBeGreaterThan(0)
  const capture = await captureIntersections(page)
  await page.addInitScript(() => {
    const probe: typeof globalThis.__operationProbe = globalThis.__operationProbe = {
      operation: '', observations: [] as Observation[], inputAt: 0, inputs: 0,
      previousIndex: -1, frameAt: 0, running: true,
      inputGenerating: false, inputLoaded: 0, updateAt: 0, frameIntervals: [],
    }
    for (const type of ['click', 'keydown', 'pointermove']) document.addEventListener(type, event => {
      if (!probe.operation || !event.isTrusted || (type === 'pointermove' && !(event as PointerEvent).buttons)) return
      probe.inputAt = performance.now()
      probe.inputGenerating = document.querySelector('.learning-replay-controls')?.textContent?.includes('轨迹生成中') ?? false
      probe.inputLoaded = Number(document.querySelector<HTMLInputElement>('.learning-replay-progress input[type="range"]')?.max) + 1
      probe.inputs++
    }, true)
    function frame() {
      if (!probe.running) return
      const now = performance.now()
      if (probe.operation) probe.frameIntervals.push({ operation: probe.operation, ms: now - probe.frameAt })
      const slider = document.querySelector<HTMLInputElement>('.learning-replay-progress input[type="range"]')
      const index = Number(slider?.value ?? -1)
      if (probe.operation && probe.inputs && index >= 0 && index !== probe.previousIndex) {
        const svg = document.querySelector('svg[data-teaching="true"]')
        const inputs = Array.from(svg?.querySelectorAll('.input') ?? [])
        const members = (attribute: string) => inputs.flatMap((element, i) => element.getAttribute(attribute) === 'true' ? [i] : [])
        probe.observations.push({
          operation: probe.operation, index, loaded: Number(slider?.max) + 1,
          generating: document.querySelector('.learning-replay-controls')?.textContent?.includes('轨迹生成中') ?? false,
          responseMs: now - probe.inputAt, frameIntervalMs: now - probe.frameAt, inputs: probe.inputs,
          inputGenerating: probe.inputGenerating, inputLoaded: probe.inputLoaded, inputAt: probe.inputAt,
          updateIntervalMs: now - probe.updateAt,
          boundary: document.querySelector('.execution-boundary')?.getAttribute('aria-label') ?? null,
          frames: Array.from(document.querySelectorAll('.learning-variables [data-context-id]')).map(element => ({
            id: element.getAttribute('data-context-id'), rows: Array.from(element.querySelectorAll('.execution-variable')).map(row =>
              (row.querySelector('button[aria-expanded="false"]') ? row.querySelector('dt') : row)?.textContent ?? ''),
          })),
          active: members('data-active'), participants: members('data-participant'), checked: members('data-checked'),
          current: svg?.querySelector('.current-point')?.parentElement?.getAttribute('aria-label') ?? null,
        })
        probe.previousIndex = index
        probe.updateAt = now
        probe.inputs = 0
      }
      probe.frameAt = now
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
  await page.goto(`${baseURL}bo/cases/${id}/learn?step=0`, { waitUntil: 'commit' })
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toBeVisible()
  const omissions: string[] = []
  async function arm(operation: string) {
    return page.evaluate(operation => {
      const probe = globalThis.__operationProbe
      probe.operation = operation
      probe.inputs = 0
      probe.updateAt = performance.now()
      probe.previousIndex = Number(document.querySelector<HTMLInputElement>('.learning-replay-progress input[type="range"]')!.value)
      return probe.observations.length
    }, operation)
  }
  async function finish(count: number) {
    await page.waitForFunction(count => globalThis.__operationProbe.observations.length > count, count)
    await page.evaluate(() => { globalThis.__operationProbe.operation = '' })
  }
  async function click(name: string, operation: string) {
    const button = page.getByRole('button', { name, exact: true })
    if (!await button.isEnabled()) { omissions.push(`${operation}: disabled`); return }
    const count = await arm(operation)
    await button.click()
    await finish(count)
  }
  async function jump(target: number, operation: string) {
    if (Number(await slider.inputValue()) === target) return
    await page.getByRole('spinbutton', { name: '跳转步骤' }).fill(String(target))
    await click('前往步骤', operation)
  }
  async function sequence(phase: string) {
    await click('下一步', `${phase}:next`)
    await click('上一步', `${phase}:previous`)
    await click('步过', `${phase}:over`)
    await expect.poll(async () => Number(await slider.getAttribute('max'))).toBeGreaterThan(nested)
    await jump(nested, `${phase}:nested-jump`)
    await click('步出', `${phase}:out`)
    const loaded = Number(await slider.getAttribute('max')) + 1
    await jump(Math.min(100, loaded - 2), `${phase}:jump`)
    await slider.focus()
    const keyboardCount = await arm(`${phase}:keyboard-preview`)
    for (let i = 0; i < 12; i++) {
      await page.keyboard.down('ArrowRight')
      await page.waitForTimeout(16)
    }
    await finish(keyboardCount)
    await page.keyboard.up('ArrowRight')
    await page.keyboard.up('ArrowLeft')
    const track = page.locator('.learning-replay-progress [data-slot="slider-track"]')
    const box = await track.boundingBox()
    if (!box) throw new Error('Slider track not available for pointer interaction')
    const thumb = await page.getByTestId('teaching-step-thumb').boundingBox()
    if (!thumb) throw new Error('Slider thumb missing')
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
    await page.mouse.down()
    const pointerCount = await arm(`${phase}:pointer-preview`)
    for (const fraction of [0.2, 0.4, 0.6, 0.8, 0.6, 0.4]) {
      await page.mouse.move(box.x + box.width * fraction, box.y + box.height / 2)
      await page.waitForTimeout(16)
    }
    await finish(pointerCount)
    await page.mouse.up()
    await expect.poll(() => new URL(page.url()).searchParams.get('step')).toBe(await slider.inputValue())
    await click('下一步', `${phase}:after-preview-next`)
  }
  await sequence('early')
  await expect(page.getByRole('region', { name: '回放控制' })).not.toContainText('轨迹生成中', { timeout: 120_000 })
  await jump(0, 'setup')
  await sequence('complete')
  const observations = await page.evaluate(() => {
    globalThis.__operationProbe.running = false
    return globalThis.__operationProbe.observations
  })
  // Decode and verify after timing, using the exact stream consumed by this page.
  const { trace } = await capture.result
  const response = await capture.response
  expect(response.traceId).toBeTruthy()
  expect(errors).toEqual([])
  const i18n = setupI18n({ locale: 'zh-CN', messages: { 'zh-CN': messages } })
  const translate = i18n._.bind(i18n)
  for (const observation of observations) {
    const step = trace.steps[observation.index]
    expect(step, `recorded step ${observation.index}`).toBeDefined()
    const source = executionSource(trace.steps, observation.index)
    if (!source.module) expect(observation.boundary).toBeNull()
    else if (step.execution.module !== 'take') expect(observation.boundary).toBe(`执行边界：${i18n._(source.module.title)} ${step.execution.boundary}`)
    else expect(observation.boundary).toBe(`执行边界：${step.execution.boundary === 0 ? '取事件之前' : step.execution.boundary === 1 ? '匹配之前' : step.execution.boundary === 3 ? 'break 之前' : step.execution.boundary === 4 ? 'break 之后' : '模块结束'}`)
    const frames = [step.execution.context, ...step.execution.outer.toReversed()]
    expect(observation.frames.map(frame => frame.id)).toEqual(frames.map(frame => String(frame.id)))
    for (const [position, frame] of frames.entries()) {
      const variables = [...frame.parameters, ...frame.captures, ...frame.locals]
      expect(observation.frames[position].rows).toHaveLength(variables.length)
      for (const [row, variable] of variables.entries()) {
        const shadowed = variable.availability === 'shadowed' && hasVariableValue(variable)
        const value = variableValue(shadowed ? { ...variable, availability: 'available' } : variable, trace.values, translate)
        const displayed = value.includes('\n') ? formatExecutionValue(value, 'summary') : value
        expect(observation.frames[position].rows[row].replace(/\s+/g, ' ')).toBe(`${variable.name}: ${variable.type} = ${displayed}${shadowed ? translate(shadowedValueNote) : ''}`.replace(/\s+/g, ' '))
      }
    }
    expect(observation.active).toEqual([...step.active].sort((a, b) => a - b))
    expect(observation.participants).toEqual([...new Set([...step.starts, ...step.ends, ...step.passes])].sort((a, b) => a - b))
    expect(observation.checked).toEqual(['check', 'discover'].includes(step.action) ? [...step.subjects].sort((a, b) => a - b) : [])
    if (step.current) expect(observation.current).toContain(formatPoint(step.current))
    else expect(observation.current).toBeNull()
  }
  return { traceId: response.traceId, steps: trace.steps.length, valueCount: trace.values.length,
    maximumValueBytes: Math.max(...trace.values.map(value => Buffer.byteLength(value))), observations, omissions,
    frameIntervals: await page.evaluate(() => globalThis.__operationProbe.frameIntervals),
    generatingOperations: [...new Set(observations.filter(value => value.generating && value.inputGenerating).map(value => value.operation))] }
}
