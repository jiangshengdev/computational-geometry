import { expect, test } from '../support/learning-test'
import { seekStep, waitForTraceCompletion, readTrace } from '../support/trace-navigation'
import type { TraceFrame } from '../../../../../src/algorithms/segment-intersection/bo/learning/trace'

for (const functionName of ['prepare', 'recover_members', 'schedule']) {
  test(`真实 ${functionName} 调用保留参数、暂停的外层作用域、独立返回和回退`, async ({ page }) => {
    const trace = await readTrace(page, 'crossing')
    const entry = trace.steps.findIndex(step => step.execution.context.function === functionName && step.execution.entry)
    expect(entry).toBeGreaterThan(0)
    const id = trace.steps[entry].execution.context.id
    const returned = trace.steps.findIndex(step => step.execution.context.id === id && step.execution.returning)
    expect(returned).toBeGreaterThan(entry)
    await page.goto(`/bo/cases/crossing/learn?step=${entry}`)
    const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
    await expect(current).toContainText(functionName)
    await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
    await expect(page.getByRole('region', { name: '外层执行上下文 sweep', exact: true })).toBeVisible()
    await expect(current.getByTestId('variable-active')).toHaveCount(0)
    if (functionName !== 'prepare') await expect(current.getByTestId('variable-result')).toHaveCount(0)
    await seekStep(page, returned - 1, 'jump')
    await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(current.getByTestId('variable-return_value')).not.toContainText('未赋值')
    await expect(page.getByRole('region', { name: '核心代码回放' })).toContainText('返回值已产生')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(current).toContainText('sweep')
    await expect(current.getByTestId('variable-return_value')).toHaveCount(0)
    expect(trace.steps[returned + 1].execution.module).toBe('driver')
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(current).toContainText(functionName)
    await expect(current.getByTestId('variable-return_value')).not.toContainText('未赋值')
    await seekStep(page, entry, 'jump')
    await page.getByRole('button', { name: '步出', exact: true }).click()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(returned + 1))
  })
}

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
            const entry = paused ? -1 : frame.steps.findIndex(step => step.execution.context.function === 'schedule' && !step.execution.returning)
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
  const trace = await readTrace(page, 'crossing')
  const last = trace.steps.findIndex(step => step.execution.context.function === 'schedule' && step.execution.entry)
  await expect(slider).toHaveAttribute('max', String(last))
  await seekStep(page, last, 'jump')
  await expect(page.getByRole('region', { name: '当前执行上下文' })).toContainText('schedule')
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
  await expect(page.getByRole('region', { name: '当前执行上下文' })).toContainText('sweep')
})
