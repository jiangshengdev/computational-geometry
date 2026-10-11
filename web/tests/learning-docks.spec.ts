import { expect, test, type Locator } from '@playwright/test'

async function box(locator: Locator) {
  await expect(locator).toBeVisible()
  return (await locator.boundingBox())!
}

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`辅助栏按需浮出和独立记忆 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/cases/crossing/learn?step=1')
    const geometry = page.getByRole('region', { name: '几何视图', exact: true })
    const code = page.getByRole('region', { name: '核心代码回放', exact: true })
    const original = [await box(geometry), await box(code)]
    await expect(page.getByRole('region', { name: '操作解释', exact: true })).toBeHidden()
    await page.getByRole('button', { name: '待处理事件队列', exact: true }).click()
    const queue = page.getByRole('region', { name: '待处理事件队列', exact: true })
    await expect(queue).toContainText('S0 起点 (0, 0)')
    expect([await box(geometry), await box(code)]).toEqual(original)
    await page.keyboard.press('Escape')
    await expect(queue).toBeHidden()
    await page.getByRole('button', { name: '待处理事件队列', exact: true }).click()
    const outside = await box(code)
    await page.mouse.click(outside.x + 10, outside.y + 10)
    await expect(queue).toBeHidden()
    await expect(page).toHaveURL(/step=1$/)
    await page.getByRole('button', { name: '展开左侧辅助栏', exact: true }).click()
    await expect(page.getByRole('region', { name: '同点参与线段', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '展开右侧辅助栏', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '操作解释', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: '收起左侧辅助栏', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: '操作解释', exact: true })).toBeHidden()
    await page.goto('/cases/multiway-endpoints/learn')
    await expect(page.getByRole('button', { name: '收起左侧辅助栏', exact: true })).toBeVisible()
  })
  browserTest(`左右工作区与统一回放 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/cases/crossing/learn?step=1')
    const geometry = page.getByRole('region', { name: '几何视图', exact: true })
    const code = page.getByRole('region', { name: '核心代码回放', exact: true })
    const canvasBox = await box(geometry)
    const codeBox = await box(code)
    expect(codeBox.x).toBeGreaterThanOrEqual(canvasBox.x + canvasBox.width)
    expect(Math.abs(canvasBox.width - codeBox.width)).toBeLessThanOrEqual(2)
    expect(Math.abs(canvasBox.y - codeBox.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(canvasBox.height - codeBox.height)).toBeLessThanOrEqual(1)
    const controls = page.getByRole('region', { name: '回放控制', exact: true })
    expect((await box(controls)).y).toBeGreaterThanOrEqual(codeBox.y + codeBox.height)
    for (const name of ['上一步', '下一步', '上一个大步', '下一个大步', '重新开始']) {
      await expect(controls.getByRole('button', { name, exact: true })).toBeInViewport()
    }
    await controls.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(page).toHaveURL(/step=2$/)
    await expect(code.getByTestId('variable-next')).toContainText('(0, 0)')
    await page.setViewportSize({ width: 390, height: 844 })
    const narrowCanvas = await box(geometry)
    expect((await box(code)).y).toBeGreaterThanOrEqual(narrowCanvas.y + narrowCanvas.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
