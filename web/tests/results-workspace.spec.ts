import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setReadingFont } from './reading-font'

for (const width of [1360, 390]) {
  test(`hover 高亮不改变文本尺寸 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/cases/crossing', '/cases/crossing/learn']) {
      await page.goto(path)
      const targets = path.endsWith('/learn')
        ? [page.getByRole('heading', { name: '待处理事件队列', exact: true }), page.getByRole('region', { name: '待处理事件队列', exact: true }).getByRole('listitem').first()]
        : [page.getByRole('region', { name: '原始输入', exact: true }).getByRole('listitem').first(), page.getByRole('radio').first()]
      for (const target of targets) {
        await expect(target).toBeVisible()
        await target.scrollIntoViewIfNeeded()
        const before = (await target.boundingBox())!
        await target.hover()
        await expect(target).toHaveAttribute('data-highlighted', 'true')
        const after = (await target.boundingBox())!
        expect(after.width).toBe(before.width)
        expect(after.height).toBe(before.height)
      }
      await page.screenshot({ path: join(tmpdir(), `bo-highlight-spacing-${width}-${path.endsWith('/learn') ? 'learning' : 'results'}.png`) })
    }
  })
}

for (const width of [1360, 1920]) {
  test(`结果工作区画布与辅助信息同屏可用 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.goto('/cases/mixed-horizontal')
    await expect(page.getByRole('radio').first()).toBeVisible()
    await expect(page).toHaveTitle('BO 结果查看器')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    const inputs = page.getByRole('region', { name: '原始输入', exact: true })
    const canvas = page.getByRole('region', { name: '几何视图', exact: true })
    const results = page.getByRole('complementary', { name: '计算结果' })
    const details = page.getByRole('region', { name: '精确详情' })
    for (const item of [inputs, canvas, results, details]) {
      await expect(item).toBeVisible()
      const box = (await item.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(900)
    }
    await page.getByRole('radio', { name: 'S0 × S1 · 重叠区间', exact: true }).click()
    await expect(details).toContainText('(0, 0) → (4, 0)')
    await page.getByRole('radio', { name: 'S0 × S1 · 重叠区间', exact: true }).click()
    await expect(details).toContainText('选择一个配对')
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(900)
    await page.screenshot({ path: join(tmpdir(), `bo-results-workspace-${width}.png`) })
    expect(errors).toEqual([])
  })
}

test('结果工作区长内容独立滚动并保留末项和详情', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 720 })
  await page.goto('/cases/mixed-horizontal')
  await expect(page.getByRole('radio').first()).toBeVisible()
  // A larger default font is a real accessibility scenario, and makes both
  // existing lists overflow without replacing the preset or the HTTP result.
  await setReadingFont(page, 24)
  const canvas = page.getByRole('region', { name: '几何视图' })
  const details = page.getByRole('region', { name: '精确详情' })
  const before = await Promise.all([canvas, details].map(item => item.boundingBox()))
  for (const last of [page.getByRole('region', { name: '原始输入', exact: true }).getByRole('listitem').last(), page.getByRole('radio').last()]) {
    const metrics = await last.evaluate(element => {
      let panel = element.parentElement
      while (panel && !['auto', 'scroll'].includes(getComputedStyle(panel).overflowY)) panel = panel.parentElement
      if (!panel) throw new Error('缺少列表滚动区域')
      const overflow = panel.scrollHeight - panel.clientHeight
      panel.scrollTop = panel.scrollHeight
      return { overflow, scrolled: panel.scrollTop }
    })
    expect(metrics.overflow).toBeGreaterThan(0)
    expect(metrics.scrolled).toBeGreaterThan(0)
    await expect(last).toBeInViewport()
    await last.hover()
    await page.mouse.wheel(0, 400)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(await Promise.all([canvas, details].map(item => item.boundingBox()))).toEqual(before)
  }
  await page.getByRole('radio').last().click()
  await expect(details).not.toContainText('选择一个配对')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1100)
})
