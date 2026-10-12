import { expect, test } from '@playwright/test'

test('滑块描述与键盘操作可用', async ({ page }) => {
  await page.goto('/cases/crossing/learn')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  await expect(next).toBeEnabled()
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  await expect(slider).toHaveAccessibleDescription(/0 \/ .*事件|0 \/ .*准备开始/)
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  await expect(slider).toHaveAccessibleDescription(/1 \/ .*事件/)
  await page.keyboard.press('Shift+Tab')
  await expect(slider).not.toBeFocused()
  await expect(page.locator('body')).not.toBeFocused()
  await page.keyboard.press('Tab')
  await expect(slider).toBeFocused()
  await expect(slider).toHaveValue('1')
})
