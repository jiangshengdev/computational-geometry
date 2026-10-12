import { expect, test, type Locator } from '@playwright/test'

async function box(locator: Locator) {
  await expect(locator).toBeVisible()
  return (await locator.boundingBox())!
}

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`步骤输入校验、提交与键盘隔离 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/cases/crossing/learn?step=0')
    const input = page.getByRole('spinbutton', { name: '跳转步骤' })
    const submit = page.getByRole('button', { name: '前往步骤', exact: true })
    for (const value of ['', '-1', '1.5']) {
      await input.fill(value)
      await submit.click()
      await expect(page).toHaveURL(/step=0$/)
      expect(await input.evaluate(element => (element as HTMLInputElement).validity.valid)).toBe(false)
    }
    await input.fill('3')
    await input.press('ArrowRight')
    await expect(page).toHaveURL(/step=0$/)
    await input.press('Enter')
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('3')
    await expect(page).toHaveURL(/step=3$/)
    await input.fill('0')
    await submit.click()
    await expect(page).toHaveURL(/step=0$/)
  })
  browserTest(`辅助栏按需浮出与临时面板重置 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/cases/crossing/learn?step=1')
    const code = page.getByRole('region', { name: '核心代码回放', exact: true })
    await expect(page.getByRole('region', { name: '操作解释', exact: true })).toBeHidden()
    await page.getByRole('button', { name: '待处理事件队列', exact: true }).click()
    const queue = page.getByRole('region', { name: '待处理事件队列', exact: true })
    await expect(queue).toContainText('S0 起点 (0, 0)')
    await page.keyboard.press('Escape')
    await expect(queue).toBeHidden()
    await page.getByRole('button', { name: '待处理事件队列', exact: true }).click()
    const outside = await box(code)
    await page.mouse.click(outside.x + 10, outside.y + 10)
    await expect(queue).toBeHidden()
    await expect(page).toHaveURL(/step=1$/)
    const opener = page.getByRole('button', { name: '待处理事件队列', exact: true })
    await opener.click()
    await page.getByRole('button', { name: '关闭待处理事件队列', exact: true }).click()
    await expect(queue).toBeHidden()
    await expect(opener).toBeFocused()
    await page.getByRole('button', { name: '展开左侧辅助栏', exact: true }).click()
    await expect(page.getByRole('region', { name: '同点参与线段', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '展开右侧辅助栏', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '操作解释', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('region', { name: '操作解释', exact: true })).toBeHidden()
  })
}
