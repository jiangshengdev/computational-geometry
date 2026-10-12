import { expect, test } from './learning-test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readResponse, readTrace, seekStep } from './trace-navigation'
import { presets } from '../src/presets'

test('右大括号分行后，真实轨迹边界仍对齐下一条语句', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const cases = [
    { module: 'take', boundary: 2, next: null },
    { module: 'classify', boundary: 6, next: 'let (mut starts, mut ends, mut passes) = (Vec::new(), Vec::new(), Vec::new());' },
    { module: 'classify', boundary: 11, next: 'ends.push(id);' },
    { module: 'neighbors', boundary: 4, next: 'let candidate = schedule_neighbors(&active, lower, &segments, &point, &mut queue, &mut checked);' },
    { module: 'geometry', boundary: 4, next: 'if point > *current {' },
    { module: 'record', boundary: 13, next: 'result.push(Intersection { segments: [a.min(b), a.max(b)], geometry });' },
  ]
  for (const example of cases) {
    const index = trace.steps.findIndex(step => step.execution.module === example.module && step.execution.boundary === example.boundary)
    expect(index, `${example.module} ${example.boundary}`).toBeGreaterThanOrEqual(0)
    await page.goto(`/cases/crossing/learn?step=${index}`)
    const panel = page.getByRole('region', { name: '核心代码回放' })
    await expect(panel.locator('.code-line').first()).toBeAttached()
    const alignment = await panel.evaluate((element, next) => {
      const lines = Array.from(element.querySelectorAll('.code-line'))
      const following = next === null ? undefined : lines.find(line => line.textContent?.trim() === next)
      const last = lines[lines.length - 1].getBoundingClientRect()
      const expected = next === null ? last.bottom : following?.getBoundingClientRect().top
      const actual = element.querySelector('.execution-boundary')!.getBoundingClientRect().top
      return { expected, actual, lines: lines.map(line => line.textContent!.trim()) }
    }, example.next)
    expect(alignment.expected).toBeDefined()
    expect(Math.abs(alignment.actual - alignment.expected!)).toBeLessThanOrEqual(1)
    expect(alignment.lines.some(line => /}\s*}|;\s*}|}\s*(?:if|else)/.test(line))).toBe(false)
  }
})

test('取事件的真实小步同步代码、队列和上下文，并可完整回退', async ({ page }) => {
  await page.goto('/cases/crossing/learn')
  const code = page.getByRole('region', { name: '核心代码回放' })
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  await page.getByRole('button', { name: '下一个大步', exact: true }).click()
  await expect(code).toContainText('教学代码')
  await expect(code).toContainText('第一条核心语句之前')
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const current = page.getByRole('region', { name: '当前事件', exact: true })
  const nextValue = variables.getByTestId('variable-next')
  await expect(nextValue).toContainText('未赋值')
  await expect(queue).toContainText('S0 起点 (0, 0)')
  const before = await variables.locator('dd').allTextContents()
  const boundary = code.getByRole('img', { name: /执行边界/ })
  const firstPosition = await boundary.boundingBox()
  const lines = code.locator('.code-line')
  const layout = await lines.evaluateAll(elements => elements.map(element => ({ top: element.getBoundingClientRect().top, height: element.getBoundingClientRect().height })))
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(nextValue).toContainText('(0, 0)')
  await expect(queue).not.toContainText('S0 起点 (0, 0)')
  await expect(current).toContainText('尚未处理事件')
  expect((await boundary.boundingBox())!.y).toBeGreaterThan(firstPosition!.y)
  expect(await lines.evaluateAll(elements => elements.map(element => ({ top: element.getBoundingClientRect().top, height: element.getBoundingClientRect().height })))).toEqual(layout)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current).toContainText('S0 起点 (0, 0)')
  await expect(variables.getByTestId('variable-point')).toContainText('(0, 0)')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(nextValue).toContainText('未赋值')
  await expect(queue).toContainText('S0 起点 (0, 0)')
  await expect(current).toContainText('尚未处理事件')
  expect(await variables.locator('dd').allTextContents()).toEqual(before)
})

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  for (const width of [1360, 390]) browserTest(`代码回放：滚动对齐、长上下文和大步入口 ${browserName} ${width}`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/cases/spider-web/learn')
    // Read the real API through the request fixture: Firefox's network inspector
    // evicts large response bodies even when the page consumed them successfully.
    const response = await request.post('/api/intersections', { data: { segments: presets.find(preset => preset.id === 'spider-web')!.segments, trace: true } })
    const { trace, intersections } = await readResponse(response)
    const normal = await request.post('/api/intersections', { data: { segments: presets.find(preset => preset.id === 'spider-web')!.segments } })
    expect((await normal.json()).intersections).toEqual(intersections)
    const entry = trace.steps.findIndex(step => step.action === 'take-entry')
    await page.getByRole('button', { name: '下一个大步', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`step=${entry}$`))
    const panel = page.getByRole('region', { name: '核心代码回放' })
    const variables = page.getByRole('region', { name: '核心变量', exact: true })
    const code = panel.getByRole('region', { name: '取事件教学代码' })
    const boundary = panel.getByRole('img', { name: '执行边界：取事件之前' })
    await expect(boundary).toBeVisible()
    const offset = () => boundary.evaluate(element => {
      const line = element.parentElement!.querySelector('.code-line')!
      return element.getBoundingClientRect().top - line.getBoundingClientRect().top
    })
    const before = await offset()
    const scroll = await code.evaluate(element => {
      element.scrollLeft = element.scrollWidth
      return element.scrollLeft
    })
    if (width === 390) expect(scroll).toBeGreaterThan(0)
    expect(await code.evaluate(element => Math.abs(element.scrollWidth - element.clientWidth - element.scrollLeft))).toBeLessThanOrEqual(1)
    expect(await offset()).toBe(before)
    const queue = variables.getByTestId('variable-queue')
    await queue.getByRole('button').click()
    await queue.scrollIntoViewIfNeeded()
    expect(await offset()).toBe(before)
    expect(await queue.locator('.execution-variable-value').evaluate(element => {
      element.scrollTop = element.scrollHeight
      return element.scrollTop
    })).toBeGreaterThan(0)
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(variables.getByTestId('variable-next')).not.toContainText('未赋值')
    await page.getByRole('button', { name: '上一个大步', exact: true }).click()
    await expect(variables.getByTestId('variable-next')).toContainText('未赋值')
    await expect(panel).toContainText('第一条核心语句之前')
    await page.getByRole('button', { name: '下一个大步', exact: true }).click()
    const following = trace.steps.findIndex((step, index) => index > entry && step.execution.entry)
    await expect(page).toHaveURL(new RegExp(`step=${following}$`))
    await expect(panel).toContainText('参与线段分类')
    const classification = panel.getByRole('region', { name: '参与线段分类教学代码' })
    await expect(classification.locator('.code-line').last()).toBeAttached()
    // The full-height column fits classification; activity supplies real long code.
    const activity = trace.steps.findIndex(step => step.execution.module === 'activity' && step.execution.entry)
    expect(activity).toBeGreaterThan(following)
    await seekStep(page, activity, 'jump')
    const longCode = panel.getByRole('region', { name: '活动集合更新教学代码' })
    await expect(longCode.locator('.code-line').last()).toBeAttached()
    await page.setViewportSize({ width, height: 720 })
    const panelBox = await panel.boundingBox()
    expect(await longCode.evaluate(element => {
      element.scrollTop = element.scrollHeight
      return element.scrollTop
    })).toBeGreaterThan(0)
    expect(await panel.boundingBox()).toEqual(panelBox)
    await page.getByRole('button', { name: '上一个大步', exact: true }).click()
    await expect(panel).toContainText('第一条核心语句之前')
    await expect(page).toHaveTitle('蜘蛛网 · 逐步学习 · BO 结果查看器')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
    await panel.scrollIntoViewIfNeeded()
    await page.screenshot({ path: join(tmpdir(), `bo-code-${browserName}-${width}.png`), fullPage: false })
  })
}

test('空队列真实返回 None，回退恢复未赋值而不出现未来事件', async ({ page }) => {
  await page.goto('/cases/empty/learn')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  await next.click()
  await expect(variables.getByTestId('variable-next')).toContainText('未赋值')
  await next.click()
  await expect(variables.getByTestId('variable-next')).toContainText('None')
  await next.click()
  await expect(next).toBeEnabled()
  await expect(panel.getByRole('img', { name: '执行边界：break 之前' })).toBeVisible()
  await expect(panel).not.toContainText('队列为空，退出循环')
  await next.click()
  await expect(next).toBeDisabled()
  await expect(panel).toContainText('队列为空，退出循环')
  await expect(variables.getByTestId('variable-point')).toContainText('不可用')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(variables.getByTestId('variable-next')).toContainText('未赋值')
  await expect(page.locator('.current-point')).toHaveCount(0)
})
