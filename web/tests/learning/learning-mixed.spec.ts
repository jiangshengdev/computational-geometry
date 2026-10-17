import { expect, test } from '../support/learning-test'
import { readResponse, seekStep, waitForTraceCompletion } from '../support/trace-navigation'
import { formatPoint } from '../../src/geometry/geometry'

for (const [id, pairs, positions, center, centerPairs, upper] of [
  ['mixed-horizontal', 17, 2, '(2, 0)', 14, '(2, 2)'],
  ['mixed-vertical', 14, 3, '(1/2, 2)', 9, '(1/2, 4)'],
] as const) test(`混合教学：${id}`, async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto(`/cases/${id}`)
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toBeVisible()
  const response = page.waitForResponse(response => response.url().endsWith('/api/bo/intersections') && response.ok() && response.request().postDataJSON().trace === true).then(readResponse)
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const { trace } = await response
  await waitForTraceCompletion(page)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('max', String(trace.steps.length - 1))
  await expect(page.getByRole('region', { name: '回放控制' })).toContainText(`0 / ${trace.steps.length - 1}`)
  await expect(page).toHaveTitle(/逐步学习/)
  const explanation = page.getByRole('region', { name: '操作解释' })
  let recordsAtCenter = 0
  let firstCenterRecord = ''
  for (const [index, step] of trace.steps.entries()) {
    if (!['take', 'record', 'insert', 'remove', 'reorder', 'check', 'discover', 'complete'].includes(step.action)) continue
    if (!step.current || formatPoint(step.current) !== center) continue
    await seekStep(page, index, 'jump')
    const current = page.getByRole('region', { name: '当前事件' })
    await expect(current.locator('[data-event-id]:not([aria-hidden="true"])')).toHaveAttribute('data-event-id', center)
    await expect(explanation).toContainText('不进入持续活动顺序')
    await expect(page.getByRole('region', { name: '待处理事件队列' })).toContainText(upper)
    const text = await explanation.innerText()
    if (id === 'mixed-vertical' && text.includes('换序为')) {
      await expect(explanation).not.toContainText('换序已随加入一起展示')
      await expect(page.getByTestId('active-order')).toHaveText('S2S0S1')
    }
    if (/记录 .*：参与线段/.test(text)) {
      recordsAtCenter++
      if (!firstCenterRecord) firstCenterRecord = page.url()
      await expect(explanation).toContainText('同一个几何点的相交配对')
      await expect(page.getByRole('img', { name: '交集 S0 × S1', exact: true })).toBeVisible()
    }
  }
  expect(recordsAtCenter).toBe(centerPairs)
  await seekStep(page, trace.steps.length - 1, 'jump')
  const result = page.getByRole('region', { name: '学习结果' })
  await expect(result).toContainText(`点类型结果位置：${positions}；重叠区间：1；相交线段对：${pairs}`)
  await expect(result).toContainText('不等于整体交集中的孤立点')
  await expect(result).toContainText('独立数学核对：')
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(pairs)
  await page.goto(firstCenterRecord)
  await expect(explanation).toContainText(center)
  await expect(result).toHaveCount(0)
  // Before the first center pair: only the interval and the two lower-boundary pairs exist.
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(3)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(4)
  await page.getByRole('button', { name: '重叠说明', exact: true }).click()
  await expect(page.getByRole('region', { name: '重叠处理规则' })).toContainText('不合并为几何并集')
  await page.getByRole('button', { name: '关闭帮助' }).click()
  await page.getByRole('region', { name: '操作解释' }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(0)
  expect(errors).toEqual([])
})
