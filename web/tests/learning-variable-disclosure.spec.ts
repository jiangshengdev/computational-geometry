import { expect, test } from './learning-test'
import { readTrace, waitForTraceCompletion } from './trace-navigation'
import { formatExecutionValue } from '../src/executionValue'

test('折叠摘要完整保留第一个元素，仅在有后续元素时省略', () => {
  const first = 'SweepSegment { left: (123456789/17, 987654321/19), right: (987654321/17, 123456789/19), slope: Some(1), input_ids: [0, 1] }'
  const cases = [
    [`[${first}, SweepSegment { left: (0, 0), right: (1, 1) }]`, `[${first}, ...]`],
    [`[${first}]`, `[${first}]`],
    ['{(0, 0): Event { starts: [0, 1], ends: [], crossings: [[2, 3]] }, (4, 4): Event { starts: [] }}', '{(0, 0): Event { starts: [0, 1], ends: [], crossings: [[2, 3]] }, ...}'],
    ['{(0, 0): Event { starts: [0, 1] }}', '{(0, 0): Event { starts: [0, 1] }}'],
    ['[S0 × S1: (1/2, 1/3) → (1/2, 5/3), S2 × S3: (0, 0)]', '[S0 × S1: (1/2, 1/3) → (1/2, 5/3), ...]'],
    ['[S0 × S1: (1/2, 1/3) → (1/2, 5/3)]', '[S0 × S1: (1/2, 1/3) → (1/2, 5/3)]'],
  ]
  for (const [source, summary] of cases) {
    expect(formatExecutionValue(formatExecutionValue(source), 'summary')).toBe(summary)
  }
  for (const source of ['[]', '{}', '[0, 1, 2]', '[[0, 1], [1, 2]]', '[Some(0), None]', 'Some(((0, 0), Event { starts: [0] }))']) {
    expect(formatExecutionValue(source, 'summary')).toBe(source)
  }
})

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  for (const width of [1440, 390]) test.extend({ browserName })(`变量两级折叠及页面内状态 ${browserName} ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()) })
    const trace = await readTrace(page, 'crossing')
    const start = trace.steps.findIndex(step => step.action === 'take-entry')
    const call = trace.steps.findIndex(step => step.execution.context.function === 'schedule_neighbors')
    expect(call).toBeGreaterThan(start)
    await page.goto(`/cases/crossing/learn?step=${start}`)
    await expect(page).toHaveTitle(/逐步学习/)
    await waitForTraceCompletion(page)
    await expect(page.locator('.execution-code')).toBeVisible()
    const panel = page.getByRole('region', { name: '当前执行上下文', exact: true })
    const parameters = panel.getByRole('button', { name: '核心参数', exact: true })
    const locals = panel.getByRole('button', { name: '核心局部变量', exact: true })
    const input = panel.getByRole('button', { name: 'segments: &[Segment]', exact: true })
    const segments = panel.getByRole('button', { name: 'segments: Vec<SweepSegment>', exact: true })
    const queue = panel.getByTestId('variable-queue')
    const queueTrigger = queue.getByRole('button')
    await expect(parameters).toHaveAttribute('aria-expanded', 'true')
    await expect(locals).toHaveAttribute('aria-expanded', 'true')
    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await expect(segments).toHaveAttribute('aria-expanded', 'false')
    await expect(input.locator('code').last()).toHaveText('[Segment { start: (0, 0), end: (4, 4) }, ...]')
    await expect(queueTrigger.locator('code').last()).toHaveText('{(0, 0): Event { starts: [0] }, ...}')
    const segmentSummary = segments.locator('code').last()
    await expect(segmentSummary).toHaveText('[SweepSegment { left: (0, 0), right: (4, 4), slope: Some(1), intercept: 0 }, ...]')
    const summaryLayout = await segmentSummary.evaluate(element => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const lines = new Set(Array.from(range.getClientRects(), rect => Math.round(rect.top)))
      const panel = element.closest('.learning-panel-content')!
      return { lines: lines.size, overflow: panel.scrollWidth - panel.clientWidth }
    })
    expect(summaryLayout.overflow).toBeLessThanOrEqual(1)
    if (width === 390) expect(summaryLayout.lines).toBeGreaterThan(1)
    await page.screenshot({ path: testInfo.outputPath('collapsed-variables.png'), fullPage: true })
    // Click the far right of the row, independently of the trigger's width,
    // so a content-sized button cannot accidentally satisfy this contract.
    for (const trigger of [parameters, locals, input, segments]) {
      const initiallyExpanded = await trigger.getAttribute('aria-expanded')
      for (const expected of [String(initiallyExpanded !== 'true'), initiallyExpanded!]) {
        await trigger.scrollIntoViewIfNeeded()
        const position = await trigger.evaluate(element => {
          const row = element.closest('.execution-variable') ?? element.closest('h4')!
          const box = row.getBoundingClientRect()
          const style = getComputedStyle(row)
          return {
            x: box.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth) - 2 - element.getBoundingClientRect().left,
            y: parseFloat(getComputedStyle(element).lineHeight) / 2,
          }
        })
        await trigger.click({ position })
        await expect(trigger).toHaveAttribute('aria-expanded', expected)
      }
    }
    // The disclosure panel owns clipping/visibility; WebKit retains geometry
    // for descendants of hidden="until-found" even when the panel is collapsed.
    const details = queue.locator('[data-slot="disclosure-content"]')
    await expect(details).not.toBeVisible()
    await expect(details).toHaveAttribute('aria-hidden', 'true')
    await expect(queue.locator('dt')).toContainText('Event')
    await queueTrigger.focus()
    await queueTrigger.press('Enter')
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'true')
    const expectedQueue = trace.steps[start].execution.context.locals.find(variable => variable.name === 'queue')!
    await expect(queue.locator('.execution-variable-value')).toHaveText(formatExecutionValue(trace.values[expectedQueue.value!]))
    await expect(queue.locator('.execution-variable-value')).toBeVisible()
    await input.click()
    await expect(segments).toHaveAttribute('aria-expanded', 'false')
    await locals.click()
    await expect(queueTrigger).not.toBeVisible()
    await locals.click()
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'true')
    await expect(queue).toHaveAttribute('data-changed', 'true')
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'true')
    await expect(queue.locator('.execution-variable-value')).toHaveText(formatExecutionValue(trace.values[expectedQueue.value!]))
    await locals.click()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    await slider.fill(String(call))
    await expect(panel.getByRole('heading', { name: /当前函数/ })).toContainText('schedule_neighbors')
    await expect(locals).toHaveAttribute('aria-expanded', 'true')
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'false')
    await queueTrigger.click()
    await slider.fill(String(start))
    await expect(locals).toHaveAttribute('aria-expanded', 'false')
    await locals.click()
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'true')
    await slider.fill(String(call))
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'true')
    await page.reload()
    await expect(locals).toHaveAttribute('aria-expanded', 'true')
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'false')
    await queueTrigger.click()
    await queueTrigger.press('Space')
    await expect(queueTrigger).toHaveAttribute('aria-expanded', 'false')
    await expect(details).not.toBeVisible()
    await expect(details).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('单行坐标、非空编号列表及标量直接显示，不提供折叠', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.execution.context.locals.some(variable => variable.name === 'active' && variable.value !== null && trace.values[variable.value] === '[0]'))
  expect(index).toBeGreaterThan(0)
  await page.goto(`/cases/crossing/learn?step=${index}`)
  const panel = page.getByRole('region', { name: '核心变量', exact: true })
  const context = trace.steps[index].execution.context
  const singleLine = context.locals.filter(variable => variable.availability === 'available' && variable.value !== null && !formatExecutionValue(trace.values[variable.value]).includes('\n'))
  expect(singleLine.map(variable => variable.name)).toEqual(expect.arrayContaining(['active', 'point', 'shear']))
  for (const variable of singleLine) {
    const row = panel.getByTestId(`variable-${variable.name}`)
    await expect(row.getByRole('button')).toHaveCount(0)
    await expect(row.locator('dd')).toHaveText(trace.values[variable.value!])
  }
})
