import { expect, test } from '@playwright/test'

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`临时面板键盘焦点不能漏到回放 ${browserName}`, async ({ page }) => {
    await page.goto('/cases/crossing/learn?step=1')
    const trigger = page.getByRole('button', { name: '操作解释', exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: '操作解释', exact: true })
    await page.keyboard.press('Shift+Tab')
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/step=1$/)
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
}
