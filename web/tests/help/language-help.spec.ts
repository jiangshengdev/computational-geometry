import { expect, test } from '@playwright/test'

test('帮助内切换语言保留当前主题，键盘关闭后返回原控件', async ({ page }) => {
  await page.goto('/cases/vertical-overlap')
  const trigger = page.getByRole('button', { name: '说明与帮助', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '说明与帮助', exact: true })
  await dialog.getByRole('tab', { name: '重叠处理规则', exact: true }).click()
  await dialog.getByRole('button', { name: 'Language / 语言' }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  const translated = page.getByRole('dialog', { name: 'About and help', exact: true })
  await expect(translated.getByRole('tab', { name: 'Overlap rules', selected: true })).toBeVisible()
  await expect(translated.getByRole('tabpanel', { name: 'Overlap rules' })).toContainText("take the later start and earlier end, and record the complete closed interval once at the overlap's start boundary")
  await translated.getByRole('button', { name: 'Close help', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(translated).toBeHidden()
  await expect(page.getByRole('button', { name: 'About and help', exact: true })).toBeFocused()
})
