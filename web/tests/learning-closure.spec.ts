import { expect, test } from './learning-test'
import { captureIntersections, seekStep, waitForTraceCompletion } from './trace-navigation'
import type { TraceFrame } from '../src/geometry'

test('si 进入真实 retain 调用，显示作用域、独立返回值并逐步回退', async ({ page }) => {
  const capture = await captureIntersections(page)
  await page.goto('/cases/crossing/learn')
  const { trace } = await capture.result
  await waitForTraceCompletion(page)
  const entry = trace.steps.findIndex(step => step.execution.context.function === 'retain closure' && !step.execution.returning)
  expect(entry).toBeGreaterThan(0)
  await seekStep(page, entry - 1, 'jump')
  const code = page.getByRole('region', { name: '核心代码回放', exact: true })
  const source = code.locator('.execution-code > code')
  await expect(source).toContainText('active.splice')
  const callerSource = await source.textContent()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
  const outer = page.getByRole('region', { name: '外层执行上下文 sweep', exact: true })
  await expect(current).toContainText('retain closure')
  await expect(current.getByTestId('variable-id')).toContainText('usize = 0')
  await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
  await expect(current).toContainText('捕获变量')
  await expect(outer).toBeVisible()
  await expect(source).toHaveText(callerSource!)
  expect(callerSource).toContain('active.retain(|&id| {\n    segments[id].right != point\n});')
  await expect(code).toContainText('segments[id].right != point')
  await expect(code).not.toContainText('nop!')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current.getByTestId('variable-return_value')).toContainText('true')
  await expect(code).toContainText('返回值已产生')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current).toContainText('sweep')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(current).toContainText('retain closure')
  await expect(current.getByTestId('variable-return_value')).toContainText('true')
})

test('其余闭包沿用真实参数、返回停点和外层作用域', async ({ page }) => {
  const capture = await captureIntersections(page)
  await page.goto('/cases/crossing/learn')
  const { trace } = await capture.result
  await waitForTraceCompletion(page)
  const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
  for (const name of ['sort_by closure', 'partition_point closure', 'then closure', 'original closure']) {
    const entry = trace.steps.findIndex(step => step.execution.context.function === name && !step.execution.returning)
    expect(entry, name).toBeGreaterThan(0)
    await seekStep(page, entry, 'jump')
    await expect(current).toContainText(name)
    await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
    await expect(page.getByRole('region', { name: '外层执行上下文 sweep', exact: true })).toBeVisible()
    for (const parameter of trace.steps[entry].execution.context.parameters) {
      await expect(current.getByTestId(`variable-${parameter.name}`)).toContainText(trace.values[parameter.value!])
    }
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    const returned = trace.steps[entry + 1].execution.context.locals.find(variable => variable.name === 'return_value')!
    await expect(current.getByTestId('variable-return_value')).toContainText(trace.values[returned.value!])
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
  }
})

for (const { browserName, width } of [
  { browserName: 'chromium', width: 1360 },
  { browserName: 'webkit', width: 1360 },
] as const) {
const browserTest = test.extend({ browserName, viewport: { width, height: 900 } })
browserTest(`闭包停点原地展开并区分相邻闭包与外层变量 ${browserName} ${width}`, async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const capture = await captureIntersections(page)
  await page.goto('/cases/crossing/learn')
  const { trace } = await capture.result
  await waitForTraceCompletion(page)
  const code = page.getByRole('region', { name: '核心代码回放', exact: true })
  const source = code.locator('.execution-code > code')
  const examples = [
    { module: 'retain-end', callerBoundary: 0, opening: 'active.retain(|&id| {', body: 'segments[id].right != point' },
    { module: 'retain-height', callerBoundary: 1, opening: 'active.retain(|&id| {', body: '!height_order[id].is_eq()' },
    { module: 'retain-end', callerBoundary: 2, opening: 'incident.retain(|&id| {', body: 'segments[id].right != point' },
    { module: 'sort-by', callerBoundary: 3, opening: 'incident.sort_by(|&a, &b| {', body: 'segments[a].slope.cmp(&segments[b].slope)' },
    { module: 'partition-point', callerBoundary: 4, opening: 'let position = active.partition_point(|&id| {', body: 'height_order[id].is_lt()' },
    { module: 'then', callerBoundary: 1, opening: 'let boundaries = [position.checked_sub(1), (inserted > 0).then(|| {', body: 'position + inserted - 1' },
    { module: 'original', opening: 'let original = |p| {', body: 'Point { x: p.x - shear * p.y, y: p.y }' },
  ]
  for (const example of examples) {
    const entry = trace.steps.findIndex((step, index) => step.execution.module === example.module && !step.execution.returning &&
      (example.callerBoundary === undefined || trace.steps[index - 1].execution.boundary === example.callerBoundary))
    expect(entry, example.module).toBeGreaterThan(0)
    await seekStep(page, entry - 1, 'jump')
    await expect(source).toContainText(example.body)
    const callerSource = await source.textContent()
    expect(callerSource).toMatch(new RegExp(example.opening.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\n\\s+' + example.body.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\n'))
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(source).toHaveText(callerSource!)
    for (const returning of [false, true]) {
      const alignment = await code.evaluate((element, { opening, body, returning }) => {
        const lines = Array.from(element.querySelectorAll('.code-line'))
        const start = lines.findIndex((line, index) => line.textContent?.trim() === opening && lines[index + 1]?.textContent?.trim() === body)
        const expected = lines[start + (returning ? 2 : 1)].getBoundingClientRect().top
        const actual = element.querySelector('.execution-boundary')!.getBoundingClientRect().top
        return { start, expected, actual }
      }, { ...example, returning })
      expect(alignment.start).toBeGreaterThanOrEqual(0)
      expect(Math.abs(alignment.actual - alignment.expected)).toBeLessThanOrEqual(1)
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      await expect(source).toHaveText(callerSource!)
    }
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(code).toContainText('返回值已产生')
    await expect(source).toHaveText(callerSource!)
  }
  // Both retain-end call sites share a trace module. Only the current site's
  // parameter may expose its value, including when landing directly by URL.
  const incidentEntry = trace.steps.findIndex((step, index) => step.execution.module === 'retain-end' && !step.execution.returning && trace.steps[index - 1].execution.boundary === 2)
  await page.goto(`/cases/crossing/learn?step=${incidentEntry}`)
  await waitForTraceCompletion(page)
  const lines = code.locator('.code-line')
  const activeBody = lines.filter({ hasText: /^\s*segments\[id\]\.right != point\s*$/ }).first()
  const incidentBody = lines.filter({ hasText: /^\s*segments\[id\]\.right != point\s*$/ }).last()
  const tooltip = page.getByRole('tooltip')
  await activeBody.locator('[data-symbol="id"]').hover()
  await expect(tooltip).toContainText('不可用（当前作用域未提供）')
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
  await incidentBody.locator('[data-symbol="id"]').hover()
  const parameter = trace.steps[incidentEntry].execution.context.parameters.find(variable => variable.name === 'id')!
  await expect(tooltip.locator('[data-value-phase="current"]')).toHaveText(`当前值：${trace.values[parameter.value!]}`)
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
  await lines.filter({ hasText: /^incident\.retain/ }).locator('[data-symbol="incident"]').hover()
  await expect(tooltip).toContainText('Vec<usize>')
  await expect(tooltip.locator('[data-value-phase="current"]')).not.toContainText('不可用')
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
  await lines.filter({ hasText: /^active\.retain/ }).first().locator('[data-symbol="retain"]').hover()
  await expect(tooltip.getByText(/^调用表达式：/)).toContainText('segments[id].right != point')
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
  await code.getByRole('img', { name: /执行边界/ }).scrollIntoViewIfNeeded()
  expect(errors).toEqual([])
})
}

test('用户函数调用保留暂停的外层作用域，返回后再赋值给调用方', async ({ page }) => {
  const capture = await captureIntersections(page)
  await page.goto('/cases/crossing/learn')
  const { trace } = await capture.result
  await waitForTraceCompletion(page)
  const entry = trace.steps.findIndex(step => step.execution.context.function === 'schedule_neighbors' && step.execution.entry)
  expect(entry).toBeGreaterThan(0)
  await seekStep(page, entry - 1, 'jump')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
  const outer = page.getByRole('region', { name: '外层执行上下文 sweep', exact: true })
  await expect(current).toContainText('schedule_neighbors')
  await expect(outer.getByTestId('variable-candidate')).toContainText('未赋值')
  const returned = trace.steps.findIndex((step, index) => index >= entry && step.execution.context.id === trace.steps[entry].execution.context.id && step.execution.returning)
  await seekStep(page, returned, 'jump')
  await expect(current.getByTestId('variable-return_value')).toContainText('Some')
  await expect(outer.getByTestId('variable-candidate')).toContainText('未赋值')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current.getByTestId('variable-candidate')).toContainText('Some')
  await expect(outer).toHaveCount(0)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(current).toContainText('schedule_neighbors')
  await expect(outer.getByTestId('variable-candidate')).toContainText('未赋值')
})

test('步过跳过语句内部调用，步出只结束当前调用，上一步仍逐停点回退', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const capture = await captureIntersections(page)
  await page.goto('/cases/crossing/learn')
  const { trace } = await capture.result
  await waitForTraceCompletion(page)
  const slider = page.getByRole('slider', { name: '教学步骤' })
  const over = page.getByRole('button', { name: '步过', exact: true })
  const out = page.getByRole('button', { name: '步出', exact: true })
  await expect(out).toBeDisabled()
  const entry = trace.steps.findIndex(step => step.execution.context.function === 'retain closure' && !step.execution.returning)
  const caller = trace.steps[entry - 1]
  const afterStatement = trace.steps.findIndex((step, index) => index > entry && step.execution.context.id === 0 && step.execution.module === 'activity' && step.execution.boundary === caller.execution.boundary! + 1)
  await seekStep(page, entry - 1, 'jump')
  await over.click()
  await expect(slider).toHaveValue(String(afterStatement))
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(slider).toHaveValue(String(afterStatement - 1))
  await seekStep(page, entry, 'jump')
  await out.click()
  await expect(slider).toHaveValue(String(entry + 2))
  await expect(out).toBeDisabled()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(slider).toHaveValue(String(entry + 1))
  await expect(page.getByRole('region', { name: '当前执行上下文' }).getByTestId('variable-return_value')).toContainText('true')
  for (const name of ['retain closure', 'sort_by closure', 'partition_point closure', 'then closure', 'original closure', 'schedule_neighbors']) {
    const start = trace.steps.findIndex(step => step.execution.context.function === name && !step.execution.returning)
    expect(start, name).toBeGreaterThan(0)
    const end = trace.steps.findIndex((step, index) => index > start && step.execution.context.id === trace.steps[start].execution.outer.at(-1)!.id)
    await seekStep(page, start, 'jump')
    await out.click()
    await expect(slider).toHaveValue(String(end))
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(slider).toHaveValue(String(end - 1))
    await expect(page.getByRole('region', { name: '核心代码回放' })).toContainText('返回值已产生')
  }
  const returnStatement = trace.steps.findIndex(step => step.execution.module === 'geometry' && step.execution.boundary === 6)
  expect(returnStatement).toBeGreaterThan(0)
  const callerAfterReturn = trace.steps.findIndex((step, index) => index > returnStatement && step.execution.context.id === 0)
  await seekStep(page, returnStatement, 'jump')
  await over.click()
  await expect(slider).toHaveValue(String(callerAfterReturn))
  const repeated = trace.steps.findIndex((step, index) => step.execution.context.function === 'retain closure' && !step.execution.returning
    && trace.steps[index + 3]?.execution.context.function === 'retain closure'
    && trace.steps[index + 3].execution.context.id !== step.execution.context.id)
  expect(repeated).toBeGreaterThan(0)
  await seekStep(page, repeated, 'jump')
  await out.click()
  await expect(slider).toHaveValue(String(repeated + 2))
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(slider).toHaveValue(String(repeated + 3))
  await expect(page.getByRole('region', { name: '当前执行上下文' })).toContainText('retain closure')
  await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('真实流尚未交付返回边界时禁用跳转，交付后才恢复导航', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch
    window.fetch = async (input, init) => {
      const response = await original(input, init)
      if (!String(input).includes('/api/intersections') || !response.headers.get('content-type')?.includes('ndjson')) return response
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
            const entry = paused ? -1 : frame.steps.findIndex(step => step.execution.context.function === 'retain closure' && !step.execution.returning)
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
  await page.goto('/cases/crossing/learn')
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect.poll(() => page.evaluate(() => 'releaseClosureTrace' in window)).toBe(true)
  await expect.poll(async () => Number(await slider.getAttribute('max'))).toBeGreaterThan(1)
  const last = Number(await slider.getAttribute('max'))
  await seekStep(page, last, 'jump')
  await expect(page.getByRole('region', { name: '当前执行上下文' })).toContainText('retain closure')
  await expect(page.getByRole('button', { name: '步过', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '步出', exact: true })).toBeDisabled()
  await expect(page.getByRole('region', { name: '回放控制' })).toContainText('轨迹生成中')
  await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  await page.evaluate(() => (window as typeof window & { releaseClosureTrace(): void }).releaseClosureTrace())
  await waitForTraceCompletion(page)
  await expect(slider).toHaveValue(String(last))
  await page.getByRole('button', { name: '步过', exact: true }).click()
  await expect(slider).toHaveValue(String(last + 2))
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(slider).toHaveValue(String(last + 1))
})
