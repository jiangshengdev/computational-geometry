import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

for (const width of [1360, 390]) for (const [id, pairs, positions, center, centerPairs, upper] of [
  ['mixed-horizontal', 17, 2, '(2, 0)', 14, '(2, 2)'],
  ['mixed-vertical', 14, 3, '(1/2, 2)', 9, '(1/2, 4)'],
] as const) test(`混合教学：${id} ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto(`/cases/${id}`)
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toBeVisible()
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await expect(page).toHaveTitle(/逐步学习/)
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const explanation = page.getByRole('region', { name: '操作解释' })
  let recordsAtCenter = 0
  let firstCenterRecord = ''
  while (await next.isEnabled()) {
    await next.click()
    const current = page.getByRole('region', { name: '当前事件' })
    if (!(await current.innerText()).includes(center)) continue
    await expect(explanation).toContainText('不进入持续活动顺序')
    await expect(page.getByRole('region', { name: '待处理事件队列' })).toContainText(upper)
    const text = await explanation.innerText()
    if (/记录 .*：参与线段/.test(text)) {
      recordsAtCenter++
      if (!firstCenterRecord) firstCenterRecord = page.url()
      await expect(explanation).toContainText('同一个几何点的相交配对')
      await expect(page.getByRole('img', { name: '交集 S0 × S1', exact: true })).toBeVisible()
    }
  }
  expect(recordsAtCenter).toBe(centerPairs)
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
  await page.screenshot({ path: join(tmpdir(), `bo-learning-${id}-${width}.png`), fullPage: true })
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(0)
  expect(errors).toEqual([])
})
