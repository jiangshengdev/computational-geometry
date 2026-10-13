import { expect, test } from '@playwright/test'

for (const [languages, expected] of [
  [['zh-CN'], 'zh-CN'], [['en-US'], 'en'], [['zh-TW', 'zh-CN'], 'en'],
  [['fr-FR'], 'en'], [['fr-FR', 'zh-SG'], 'zh-CN'], [['en-GB', 'zh-CN'], 'en'],
  [['zh'], 'zh-CN'], [['zh-Hant'], 'en'],
] as const) {
  test(`浏览器语言顺序 ${languages.join(',')} 选择 ${expected}`, async ({ page }) => {
    await page.addInitScript(languages => Object.defineProperty(navigator, 'languages', { value: languages }), languages)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', expected)
    await expect(page.getByRole('region', { name: expected === 'en' ? 'Cases' : '案例列表', exact: true })).toBeVisible()
    await expect(page).toHaveTitle(expected === 'en' ? 'Cases · BO Results Viewer' : '案例列表 · BO 结果查看器')
  })
}

test('键盘切换语言更新案例并记住选择，保留真实结果选择与 URL', async ({ page }) => {
  await page.goto('/cases/crossing')
  await page.getByRole('radio', { name: 'S0 × S1 · 点' }).click()
  let requests = 0
  page.on('request', request => { if (request.url().endsWith('/api/intersections')) requests++ })
  const language = page.getByRole('button', { name: 'Language / 语言' })
  await language.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('option', { name: 'English', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('radio', { checked: true })).toContainText('S0 × S1')
  await expect(page).toHaveURL(/\/cases\/crossing$/)
  await expect(page).toHaveTitle(/ · Results · BO Results Viewer$/)
  await expect(page.getByRole('heading', { name: 'Ordinary crossing', exact: true })).toBeVisible()
  expect(requests).toBe(0)
  await page.getByRole('button', { name: 'About this case', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'About and help', exact: true })).toContainText('Observe insertion, intersection discovery, reordering, and removal.')
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
  await expect(page.getByRole('heading', { name: '普通交叉', exact: true })).toHaveCount(0)
  await expect(page.getByRole('article', { name: 'Ordinary crossing', exact: true })).toContainText('Two diagonals intersect at (2, 2).')
  await expect(page.getByRole('link', { name: 'Start learning', exact: true }).first()).toBeVisible()
})
