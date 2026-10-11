import { expect, test, type Locator } from '@playwright/test'

async function box(locator: Locator) {
  await expect(locator).toBeVisible()
  return (await locator.boundingBox())!
}

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`中央比例拖动、恢复与窄屏 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/cases/crossing/learn?step=1')
    const splitter = page.getByRole('separator', { name: '画布与调试区宽度', exact: true })
    const geometry = page.getByRole('region', { name: '几何视图', exact: true })
    const code = page.getByRole('region', { name: '核心代码回放', exact: true })
    const start = await box(splitter)
    const before = await box(geometry)
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
    await page.mouse.down()
    await page.mouse.move(start.x + 100, start.y + start.height / 2, { steps: 6 })
    await page.mouse.up()
    const after = await box(geometry)
    expect(after.width).toBeGreaterThan(before.width + 80)
    await expect(page).toHaveURL(/step=1$/)
    await page.reload()
    expect(Math.abs((await box(geometry)).width - after.width)).toBeLessThanOrEqual(2)
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(splitter).toBeHidden()
    const narrow = await box(geometry)
    expect((await box(code)).y).toBeGreaterThanOrEqual(narrow.y + narrow.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.setViewportSize({ width: 1440, height: 900 })
    expect(Math.abs((await box(geometry)).width - after.width)).toBeLessThanOrEqual(2)
    await splitter.dblclick()
    expect(Math.abs((await box(geometry)).width - (await box(code)).width)).toBeLessThanOrEqual(2)
    await page.reload()
    expect(Math.abs((await box(geometry)).width - (await box(code)).width)).toBeLessThanOrEqual(2)
  })
}
