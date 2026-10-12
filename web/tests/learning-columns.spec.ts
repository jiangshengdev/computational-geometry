import { expect, test } from '@playwright/test'

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`学习内容可达与回放 ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/cases/crossing/learn?step=1')
    await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
    const controls = page.getByRole('region', { name: '回放控制', exact: true })
    await controls.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(page).toHaveURL(/step=2$/)
    await expect(page.getByRole('region', { name: '核心变量', exact: true }).getByTestId('variable-next')).not.toContainText('未赋值')

    await page.setViewportSize({ width: 390, height: 844 })
    const panels = ['几何视图', '核心代码回放', '核心变量'].map(name => page.getByRole('region', { name, exact: true }))
    for (const panel of panels) {
      await panel.scrollIntoViewIfNeeded()
      await expect(panel).toBeInViewport()
    }
    await expect(page).toHaveURL(/step=2$/)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
