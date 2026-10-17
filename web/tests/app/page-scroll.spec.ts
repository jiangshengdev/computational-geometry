import { expect, test, type Page } from '../support/learning-test'

async function scrollTo(page: Page, y: number) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y)
  // Let the browser deliver the scroll event before the next navigation.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
}

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`页面滚动恢复：返回列表和浏览器历史 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.goto('/bo')
    const link = page.getByRole('article', { name: '共线分离', exact: true }).getByRole('link', { name: '查看详情', exact: true })
    await link.scrollIntoViewIfNeeded()
    const saved = await page.evaluate(() => window.scrollY)
    expect(saved).toBeGreaterThan(0)
    await link.click()
    await expect(page).toHaveURL(/\/bo\/cases\/collinear-disjoint$/)
    await expect(page).toHaveTitle('共线分离 · 计算结果 · BO 结果查看器')
    await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await page.getByRole('link', { name: '返回列表', exact: true }).click()
    await expect(page).toHaveURL('/bo')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(saved)
    await link.click()
    await expect(page).toHaveURL(/\/bo\/cases\/collinear-disjoint$/)
    await page.goBack()
    await expect(page).toHaveTitle('案例列表 · BO 结果查看器')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(saved)
    await page.goForward()
    await expect(page).toHaveURL(/\/bo\/cases\/collinear-disjoint$/)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  for (const interrupted of [false, true]) browserTest(`页面滚动恢复：异步教学内容${interrupted ? '由用户取消恢复' : '恢复位置'}与步骤切换 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 700 })
    await page.goto('/bo')
    await page.getByRole('article', { name: '普通交叉', exact: true }).getByRole('link', { name: '开始学习', exact: true }).click()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
    const saved = await page.evaluate(() => Math.floor((document.documentElement.scrollHeight - innerHeight) / 2))
    expect(saved).toBeGreaterThan(0)
    await scrollTo(page, saved)
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/\?step=1$/)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(saved)
    await page.goBack()
    await expect(page).toHaveURL('/bo')

    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/bo/intersections', async route => {
      await gate
      await route.continue()
    })
    await page.goForward()
    await expect(page.getByRole('status')).toContainText('正在加载教学轨迹')
    expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThan(saved)
    if (interrupted) {
      await page.mouse.wheel(0, -100)
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    }
    release()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('1')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(interrupted ? 0 : saved)
  })
}
