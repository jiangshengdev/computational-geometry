import { expect, test } from '@playwright/test'

for (const path of ['/', '/bo', '/convex-hull', '/bo/cases/crossing', '/bo/cases/crossing/learn']) {
  test(`文档入口：${path} 支持语言切换和键盘导航`, async ({ page }) => {
    await page.route('https://cgd.jiangshengdev.com/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<html lang="zh-CN"><title>文档站测试目标</title><h1>文档站测试目标</h1></html>',
    }))
    await page.goto(path)
    const documentation = page.getByRole('link', { name: '文档', exact: true })
    await expect(documentation).toBeVisible()
    await expect(documentation).toHaveAttribute('href', 'https://cgd.jiangshengdev.com')
    const language = page.getByRole('button', { name: 'Language / 语言' })
    await language.focus()
    await page.keyboard.press('Shift+Tab')
    await expect(documentation).toBeFocused()
    await language.click()
    await page.getByRole('option', { name: 'English', exact: true }).click()
    const translated = page.getByRole('link', { name: 'Documentation', exact: true })
    await expect(translated).toBeVisible()
    await expect(translated).toHaveAttribute('href', 'https://cgd.jiangshengdev.com')
    await language.focus()
    await page.keyboard.press('Shift+Tab')
    await expect(translated).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('https://cgd.jiangshengdev.com/')
    await expect(page.getByRole('heading', { name: '文档站测试目标' })).toBeVisible()
  })
}
