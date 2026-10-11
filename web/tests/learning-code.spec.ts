import { expect, test } from './learning-test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SweepTrace } from '../src/geometry'
import { presets } from '../src/presets'

test('取事件的真实小步同步代码、队列和上下文，并可完整回退', async ({ page }) => {
  await page.goto('/cases/crossing/learn')
  const code = page.getByRole('region', { name: '核心代码回放' })
  await page.getByRole('button', { name: '下一个大步', exact: true }).click()
  await expect(code).toContainText('教学代码')
  await expect(code).toContainText('第一条核心语句之前')
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const current = page.getByRole('region', { name: '当前事件', exact: true })
  const nextValue = code.getByTestId('variable-next')
  await expect(nextValue).toContainText('未赋值')
  await expect(queue).toContainText('S0 起点 (0, 0)')
  const before = await code.locator('dd').allTextContents()
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
  await expect(code.getByTestId('variable-point')).toContainText('(0, 0)')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(nextValue).toContainText('未赋值')
  await expect(queue).toContainText('S0 起点 (0, 0)')
  await expect(current).toContainText('尚未处理事件')
  expect(await code.locator('dd').allTextContents()).toEqual(before)
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
    const { trace, intersections }: { trace: SweepTrace; intersections: unknown[] } = await response.json()
    const normal = await request.post('/api/intersections', { data: { segments: presets.find(preset => preset.id === 'spider-web')!.segments } })
    expect((await normal.json()).intersections).toEqual(intersections)
    const entry = trace.steps.findIndex(step => step.action === 'take-entry')
    await page.getByRole('button', { name: '下一个大步', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`step=${entry}$`))
    const panel = page.getByRole('region', { name: '核心代码回放' })
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
    const queue = panel.getByTestId('variable-queue').locator('dd')
    await queue.scrollIntoViewIfNeeded()
    expect(await offset()).toBe(before)
    expect(await queue.evaluate(element => {
      element.scrollTop = element.scrollHeight
      return element.scrollTop
    })).toBeGreaterThan(0)
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(panel.getByTestId('variable-next')).not.toContainText('未赋值')
    await page.getByRole('button', { name: '上一个大步', exact: true }).click()
    await expect(panel.getByTestId('variable-next')).toContainText('未赋值')
    await expect(panel).toContainText('第一条核心语句之前')
    await page.getByRole('button', { name: '下一个大步', exact: true }).click()
    const following = trace.steps.findIndex((step, index) => index > entry && step.execution.entry)
    await expect(page).toHaveURL(new RegExp(`step=${following}$`))
    await expect(panel).toContainText('参与线段分类')
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
  await next.click()
  await expect(panel.getByTestId('variable-next')).toContainText('未赋值')
  await next.click()
  await expect(panel.getByTestId('variable-next')).toContainText('None')
  await next.click()
  await expect(next).toBeDisabled()
  await expect(panel).toContainText('队列为空，退出循环')
  await expect(panel.getByTestId('variable-point')).toContainText('不可用')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(panel.getByTestId('variable-next')).toContainText('未赋值')
  await expect(page.locator('.current-point')).toHaveCount(0)
})
