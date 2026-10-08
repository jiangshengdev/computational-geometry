import { expect, test } from '@playwright/test'

test('HeroUI 默认浅色：系统暗色不改变主题，控件样式与键盘操作可用', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/cases/crossing/learn')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  await expect(next).toBeEnabled()
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light')
  await expect(page.locator('body')).toHaveCSS('background-color', 'oklch(0.9702 0 0)')
  await expect(page.locator('body')).toHaveCSS('color', 'oklch(0.2103 0.0059 285.89)')
  // Official default accent, independently of application geometry colors.
  await expect(next).toHaveCSS('background-color', 'oklch(0.6204 0.195 253.83)')
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  await expect(slider).toHaveAccessibleDescription(/0 \/ .*事件|0 \/ .*准备开始/)
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  await expect(slider).toHaveAccessibleDescription(/1 \/ .*事件/)
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: '重新开始', exact: true })).toBeFocused()
})
