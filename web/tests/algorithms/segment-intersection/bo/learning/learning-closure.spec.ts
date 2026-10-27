import { expect, test } from '../support/learning-test'
import { readTrace, seekStep, waitForTraceCompletion } from '../support/trace-navigation'
import type { TraceFrame } from '../../../../../src/algorithms/segment-intersection/bo/learning/trace'

for (const browserName of ['chromium', 'webkit'] as const) {
  test.extend({ browserName })(`真实阶段调用保留实参、暂停上下文、返回值和逐步回退 ${browserName}`, async ({ page }) => {
    const trace = await readTrace(page, 'crossing')
    await page.goto('/bo/cases/crossing/learn')
    await waitForTraceCompletion(page)
    const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const over = page.getByRole('button', { name: '步过', exact: true })
    const out = page.getByRole('button', { name: '步出', exact: true })
    await expect(out).toBeDisabled()
    for (const name of ['locate', 'record', 'update', 'check', 'schedule', 'append']) {
      const entry = trace.steps.findIndex(step => step.execution.context.function === name && step.execution.entry)
      expect(entry, name).toBeGreaterThan(0)
      const call = trace.steps[entry].execution
      const returned = trace.steps.findIndex((step, i) => i > entry && step.execution.context.id === call.context.id && step.execution.returning)
      expect(returned).toBeGreaterThan(entry)
      const resume = returned + 1
      expect(trace.steps[resume].execution.context.id).toBe(call.outer.at(-1)!.id)
      expect(trace.steps[resume].execution.resuming).toBe(true)
      await seekStep(page, entry - 1, 'jump')
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      await expect(slider).toHaveValue(String(entry))
      await expect(current.getByRole('heading', { name: `当前函数：${name}` })).toBeVisible()
      await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
      await expect(page.getByRole('region', { name: `外层执行上下文 ${call.outer.at(-1)!.function}`, exact: true })).toBeVisible()
      await out.click()
      await expect(slider).toHaveValue(String(resume))
      await page.getByRole('button', { name: '上一步', exact: true }).click()
      await expect(slider).toHaveValue(String(returned))
      await expect(page.getByRole('region', { name: '核心代码回放' })).toContainText('返回值已产生')
      await over.click()
      await expect(slider).toHaveValue(String(resume))
      await seekStep(page, entry - 1, 'jump')
      const after = trace.steps.findIndex((step, i) => i >= resume && step.execution.context.id === call.outer.at(-1)!.id && !step.execution.resuming)
      await over.click()
      await expect(slider).toHaveValue(String(after))
      await page.getByRole('button', { name: '上一步', exact: true }).click()
      await expect(slider).toHaveValue(String(after - 1))
    }
  })
}

test('嵌套输出暂停调用方共享变量，恢复时读取新结果，重复调用保持独立身份', async ({ page }) => {
  const trace = await readTrace(page, 'multiway-interior')
  const entries = trace.steps.map((step, i) => ({ step, i })).filter(({ step }) => step.execution.module === 'output' && step.execution.entry)
  expect(entries.length).toBeGreaterThan(1)
  expect(new Set(entries.map(({ step }) => step.execution.context.id)).size).toBe(entries.length)
  await page.goto('/bo/cases/multiway-interior/learn')
  for (const { step, i } of entries.slice(0, 2)) {
    await seekStep(page, i, 'jump')
    const outer = page.getByRole('region', { name: '外层执行上下文 record', exact: true })
    await expect(outer.getByTestId('variable-result')).toContainText('不可用')
    const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
    await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
    const pair = step.execution.context.parameters.find(v => v.name === 'pair')!
    await expect(current.getByTestId('variable-pair')).toContainText(trace.values[pair.value!])
    await page.getByRole('button', { name: '步出', exact: true }).click()
    await expect(current.getByRole('heading', { name: '当前函数：record' })).toBeVisible()
    await expect(current.getByTestId('variable-result')).not.toContainText('不可用')
  }
})

test('真实流尚未交付返回边界时禁用跳转，交付后才恢复导航', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch
    window.fetch = async (input, init) => {
      const response = await original(input, init)
      if (!String(input).includes('/api/bo/intersections') || !response.headers.get('content-type')?.includes('ndjson')) return response
      let pending = ''
      let paused = false
      const encoder = new TextEncoder()
      const stream = response.body!.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream<string, Uint8Array>({
        async transform(chunk, controller) {
          pending += chunk
          let end: number
          while ((end = pending.indexOf('\n')) >= 0) {
            const line = pending.slice(0, end)
            pending = pending.slice(end + 1)
            if (!line) continue
            const frame = JSON.parse(line) as TraceFrame
            const entry = paused ? -1 : frame.steps.findIndex(step => step.execution.context.function === 'append' && !step.execution.returning)
            if (entry < 0) controller.enqueue(encoder.encode(line + '\n'))
            else {
              paused = true
              // Keep every real dictionary value and stop intact; delay only
              // delivery, splitting this API frame at a real callback entry.
              controller.enqueue(encoder.encode(JSON.stringify({ ...frame, complete: false, intersections: undefined, steps: frame.steps.slice(0, entry + 1) }) + '\n'))
              await new Promise<void>(resolve => {
                Object.assign(window, { releaseClosureTrace: resolve })
              })
              controller.enqueue(encoder.encode(JSON.stringify({ ...frame, values: [], point_values: [], result_values: [], steps: frame.steps.slice(entry + 1) }) + '\n'))
            }
          }
        },
      }))
      return new Response(stream, { status: response.status, headers: response.headers })
    }
  })
  await page.goto('/bo/cases/crossing/learn')
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect.poll(() => page.evaluate(() => 'releaseClosureTrace' in window)).toBe(true)
  await expect.poll(async () => Number(await slider.getAttribute('max'))).toBeGreaterThan(1)
  const last = Number(await slider.getAttribute('max'))
  await seekStep(page, last, 'jump')
  await expect(page.getByRole('region', { name: '当前执行上下文' })).toContainText('append')
  await expect(page.getByRole('button', { name: '步过', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '步出', exact: true })).toBeDisabled()
  await expect(page.getByRole('region', { name: '回放控制' })).toContainText('轨迹生成中')
  await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  await page.getByRole('button', { name: '重新开始', exact: true }).focus()
  for (const key of ['n', 'u']) {
    await page.keyboard.press(key)
    await expect(slider).toHaveValue(String(last))
  }
  await page.evaluate(() => (window as typeof window & { releaseClosureTrace(): void }).releaseClosureTrace())
  await waitForTraceCompletion(page)
  await expect(slider).toHaveValue(String(last))
  await page.getByRole('button', { name: '步过', exact: true }).click()
  await expect(slider).toHaveValue(String(last + 1))
  await expect(page.getByRole('region', { name: '当前执行上下文' }).getByTestId('variable-return_value')).toContainText('未赋值')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(slider).toHaveValue(String(last))
  await expect(page.getByRole('region', { name: '当前执行上下文' }).getByTestId('variable-return_value')).toContainText('未赋值')
  await page.getByRole('button', { name: '步出', exact: true }).click()
  await expect(page.getByRole('region', { name: '当前执行上下文' })).toContainText('record')
})
