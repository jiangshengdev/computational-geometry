import { expect, test } from '@playwright/test'

test('滑块可访问描述反映当前教学步骤', async ({ page }) => {
  await page.goto('/bo/cases/crossing/learn')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  await expect(next).toBeEnabled()
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  await expect(slider).toHaveAccessibleDescription(/0 \/ .*事件|0 \/ .*准备开始/)
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  await expect(slider).toHaveAccessibleDescription(/1 \/ .*事件/)
})
