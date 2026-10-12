import { expect, test } from './learning-test'
import { readTrace, seekStep } from './trace-navigation'

test('真实轨迹执行边界指向下一条语句', async ({ page }) => {
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
      return { expected, actual }
    }, example.next)
    expect(alignment.expected).toBeDefined()
    expect(Math.abs(alignment.actual - alignment.expected!)).toBeLessThanOrEqual(1)
  }
})

test('取事件的真实小步同步代码、队列和上下文，并可完整回退', async ({ page }) => {
  await page.goto('/cases/crossing/learn')
  const code = page.getByRole('region', { name: '核心代码回放' })
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  await page.getByRole('button', { name: '下一个大步', exact: true }).click()
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
  await expect(code.getByRole('img', { name: '执行边界：匹配之前' })).toBeVisible()
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
    const index = trace.steps.findIndex(step => step.execution.module === 'neighbors' && step.execution.boundary === 4)
    expect(index).toBeGreaterThanOrEqual(0)
    await page.setViewportSize({ width: 1100, height: 900 })
    await page.goto(`/cases/crossing/learn?step=${index}`)
    const panel = page.getByRole('region', { name: '核心代码回放' })
    const toggle = panel.getByRole('switch', { name: '自动换行' })
    const code = panel.locator('.execution-code')
    await expect(toggle).toBeChecked()
    await expect(code.locator('.code-line').last()).toBeAttached()
    const expectWrappedBoundary = async () => {
      await expect.poll(() => code.evaluate(element => {
        const lines = Array.from(element.querySelectorAll<HTMLElement>('.code-line'))
        const next = lines.find(line => line.textContent?.trim().startsWith('let candidate = schedule_neighbors'))!
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
    await page.goto('/cases/empty/learn')
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
    await page.goto('/cases/spider-web/learn')
    const trace = await readTrace(page, 'spider-web')
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
    // The full-height column fits classification; activity supplies real long code.
    const activity = trace.steps.findIndex(step => step.execution.module === 'activity' && step.execution.entry)
    expect(activity).toBeGreaterThan(following)
    await seekStep(page, activity, 'jump')
    const longCode = panel.getByRole('region', { name: '活动集合更新教学代码' })
    await expect(longCode.locator('.code-line').last()).toBeAttached()
    await page.setViewportSize({ width: 1360, height: 720 })
    expect(await longCode.evaluate(element => {
      element.scrollTop = element.scrollHeight
      return element.scrollTop
    })).toBeGreaterThan(0)
    await page.getByRole('button', { name: '上一个大步', exact: true }).click()
    await expect(panel).toContainText('第一条核心语句之前')
    await expect(page).toHaveTitle('蜘蛛网 · 逐步学习 · BO 结果查看器')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
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
