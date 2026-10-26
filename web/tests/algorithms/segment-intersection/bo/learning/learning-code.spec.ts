import { expect, test } from '../support/learning-test'
import { readTrace, seekStep } from '../support/trace-navigation'

test('真实轨迹执行边界指向下一条语句', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const cases = [
    { module: 'take', boundary: 1, next: 'let Some((point, event)) = next else { break; };' },
    { module: 'event', boundary: 1, next: 'report_cross_line_and_point_pairs(incident, event.points);' },
    { module: 'members', boundary: 3, next: 'return members;' },
    { module: 'certificate', boundary: 3, next: 'return candidate;' },
    { module: 'report', boundary: 1, next: null },
    { module: 'driver', boundary: 4, next: 'report_cross_line_and_point_pairs(members);' },
  ]
  for (const example of cases) {
    const index = trace.steps.findIndex(step => step.execution.module === example.module && step.execution.boundary === example.boundary)
    expect(index, `${example.module} ${example.boundary}`).toBeGreaterThanOrEqual(0)
    await page.goto(`/bo/cases/crossing/learn?step=${index}`)
    const panel = page.getByRole('region', { name: '核心代码回放' })
    await expect(panel.locator('.code-line').first()).toBeAttached()
    const alignment = await panel.evaluate((element, next) => {
      const lines = Array.from(element.querySelectorAll('.code-line'))
      const following = next === null ? undefined : lines.find(line => line.textContent?.trim() === next)
      const last = lines[lines.length - 1].getBoundingClientRect()
      const expected = next === null ? last.bottom : following?.getBoundingClientRect().top
      const actual = element.querySelector('.execution-boundary')!.getBoundingClientRect().top
      return { expected, actual }
    }, example.next)
    expect(alignment.expected).toBeDefined()
    expect(Math.abs(alignment.actual - alignment.expected!)).toBeLessThanOrEqual(1)
  }
})

test('取事件的真实小步同步代码、队列和上下文，并可完整回退', async ({ page }) => {
  await page.goto('/bo/cases/crossing/learn')
  const code = page.getByRole('region', { name: '核心代码回放' })
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  const trace = await readTrace(page, 'crossing')
  await seekStep(page, trace.steps.findIndex(step => step.action === 'take-entry'), 'jump')
  await expect(code.getByRole('region', { name: '取事件教学代码' })).toBeVisible()
  await expect(code).toContainText('第一条核心语句之前')
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const current = page.getByRole('region', { name: '当前事件', exact: true })
  const nextValue = variables.getByTestId('variable-next')
  await expect(nextValue).toContainText('未赋值')
  await expect(queue).toContainText('S0 起点 (0, 0)')
  const before = await variables.locator('dd').allTextContents()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(nextValue).toContainText('(0, 0)')
  await expect(queue).not.toContainText('S0 起点 (0, 0)')
  await expect(current).toContainText('尚未处理事件')
  await expect(code.getByRole('img', { name: /执行边界/ })).toBeVisible()
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

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`自动换行保持执行边界并记住跨案例偏好 ${browserName}`, async ({ page }) => {
    const trace = await readTrace(page, 'crossing')
    const index = trace.steps.findIndex(step => step.execution.module === 'driver' && step.execution.boundary === 3)
    expect(index).toBeGreaterThanOrEqual(0)
    await page.setViewportSize({ width: 1100, height: 900 })
    await page.goto(`/bo/cases/crossing/learn?step=${index}`)
    const panel = page.getByRole('region', { name: '核心代码回放' })
    const toggle = panel.getByRole('switch', { name: '自动换行' })
    const code = panel.locator('.execution-code')
    await expect(toggle).toBeChecked()
    await expect(code.locator('.code-line').last()).toBeAttached()
    const expectWrappedBoundary = async () => {
      await expect.poll(() => code.evaluate(element => {
        const lines = Array.from(element.querySelectorAll<HTMLElement>('.code-line'))
        const next = lines.find(line => line.textContent?.trim().startsWith('let members = recover_members'))!
        const boundary = element.querySelector('.execution-boundary')!
        return Math.abs(next.getBoundingClientRect().top - boundary.getBoundingClientRect().top)
      })).toBeLessThanOrEqual(1)
    }
    await expectWrappedBoundary()
    await page.setViewportSize({ width: 1360, height: 900 })
    await expectWrappedBoundary()
    const source = await code.textContent()
    await panel.getByText('自动换行', { exact: true }).click()
    await expect(code).toHaveAttribute('data-wrap', 'false')
    expect(await code.textContent()).toBe(source)
    await page.reload()
    await expect(toggle).not.toBeChecked()
    await page.goto('/bo/cases/empty/learn')
    await expect(toggle).not.toBeChecked()
    await toggle.focus()
    await page.keyboard.press('Space')
    await expect(toggle).toBeChecked()
    await page.reload()
    await expect(toggle).toBeChecked()
  })
  browserTest(`代码回放：滚动对齐、长上下文和大步入口 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/bo/cases/spider-web/learn')
    const trace = await readTrace(page, 'spider-web')
    const entry = trace.steps.findIndex(step => step.action === 'take-entry')
    await seekStep(page, entry, 'jump')
    const panel = page.getByRole('region', { name: '核心代码回放' })
    const variables = page.getByRole('region', { name: '核心变量', exact: true })
    const code = panel.getByRole('region', { name: '取事件教学代码' })
    const boundary = panel.getByRole('img', { name: /执行边界/ })
    await expect(boundary).toBeVisible()
    const offset = () => boundary.evaluate(element => {
      const line = element.parentElement!.querySelector('.code-line')!
      return element.getBoundingClientRect().top - line.getBoundingClientRect().top
    })
    const before = await offset()
    await panel.getByText('自动换行', { exact: true }).click()
    await expect(panel.getByRole('switch', { name: '自动换行' })).not.toBeChecked()
    await code.evaluate(element => {
      element.scrollLeft = element.scrollWidth
    })
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
    // The new source is short; use a constrained viewport to exercise its
    // scrolling container without introducing fictitious algorithm statements.
    const driver = trace.steps.findIndex(step => step.execution.module === 'driver' && step.execution.boundary === 3)
    await seekStep(page, driver, 'jump')
    const longCode = panel.locator('.execution-code')
    await expect(longCode.locator('.code-line').last()).toBeAttached()
    await page.setViewportSize({ width: 1360, height: 480 })
    await longCode.evaluate(element => { element.scrollTop = element.scrollHeight })
    await page.getByRole('button', { name: '上一个大步', exact: true }).click()
    await expect(panel.getByRole('img', { name: /执行边界/ })).toBeInViewport()
    await expect(page).toHaveTitle('蜘蛛网 · 逐步学习 · BO 结果查看器')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('空队列真实返回 None，回退恢复未赋值而不出现未来事件', async ({ page }) => {
  await page.goto('/bo/cases/empty/learn')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  const trace = await readTrace(page, 'empty')
  await seekStep(page, trace.steps.findIndex(step => step.action === 'take-entry'), 'jump')
  await expect(variables.getByTestId('variable-next')).toContainText('未赋值')
  await next.click()
  await expect(variables.getByTestId('variable-next')).toContainText('None')
  await expect(next).toBeEnabled()
  await expect(panel.getByRole('img', { name: /执行边界/ })).toBeVisible()
  await expect(panel).not.toContainText('队列为空，退出循环')
  await next.click()
  await expect(next).toBeDisabled()
  await expect(page.getByRole('region', { name: '操作解释', exact: true })).toContainText('队列为空')
  await expect(variables.getByTestId('variable-point')).toHaveCount(0)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(variables.getByTestId('variable-next')).toContainText('未赋值')
  await expect(page.locator('.current-point')).toHaveCount(0)
})
