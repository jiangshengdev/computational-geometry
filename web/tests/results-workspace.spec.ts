import { expect, test } from './learning-test'
import { installCase, longResultsCase } from './scrolling-cases'

for (const width of [1360, 390]) {
  test(`hover 触发关联高亮 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/cases/crossing', '/cases/crossing/learn']) {
      await page.goto(path)
      const targets = path.endsWith('/learn')
        ? [page.getByRole('heading', { name: '待处理事件队列', exact: true }), page.getByRole('region', { name: '待处理事件队列', exact: true }).getByRole('listitem').first()]
        : [page.getByRole('region', { name: '原始输入', exact: true }).getByRole('listitem').first(), page.getByRole('radio').first()]
      for (const target of targets) {
        await expect(target).toBeVisible()
        await target.scrollIntoViewIfNeeded()
        await target.hover()
        await expect(target).toHaveAttribute('data-highlighted', 'true')
      }
    }
  })
}

for (const width of [1360, 1920]) {
  test(`结果工作区配对选择与取消 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.goto('/cases/mixed-horizontal')
    await expect(page.getByRole('radio').first()).toBeVisible()
    await expect(page).toHaveTitle('重叠、交叉与重合点 · 计算结果 · BO 结果查看器')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    const inputs = page.getByRole('region', { name: '原始输入', exact: true })
    const canvas = page.getByRole('region', { name: '几何视图', exact: true })
    const results = page.getByRole('complementary', { name: '计算结果' })
    const details = page.getByRole('region', { name: '精确详情' })
    for (const item of [inputs, canvas, results, details]) {
      await expect(item).toBeVisible()
    }
    await page.getByRole('radio', { name: 'S0 × S1 · 重叠区间', exact: true }).click()
    await expect(details).toContainText('(0, 0) → (4, 0)')
    await page.getByRole('radio', { name: 'S0 × S1 · 重叠区间', exact: true }).click()
    await expect(details).toContainText('选择一个配对')
    expect(errors).toEqual([])
  })
}

test('结果工作区长内容末项可达并可查看详情', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 720 })
  await installCase(page, longResultsCase)
  await page.goto(`/cases/${longResultsCase.id}`)
  await expect(page.getByRole('radio')).toHaveCount(16)
  const details = page.getByRole('region', { name: '精确详情' })
  for (const last of [page.getByRole('region', { name: '原始输入', exact: true }).getByRole('listitem').last(), page.getByRole('radio').last()]) {
    await last.scrollIntoViewIfNeeded()
    await expect(last).toBeInViewport()
  }
  await page.getByRole('radio').last().click()
  await expect(details).not.toContainText('选择一个配对')
})
