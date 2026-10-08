import { expect, test } from '@playwright/test'

test('帮助：两页集中入口、键盘隔离与焦点返回', async ({ page }) => {
  for (const route of ['/cases/crossing', '/cases/crossing/learn?step=3']) {
    await page.goto(route)
    await expect(page.getByRole('region', { name: '几何视图' })).toBeVisible()
    const trigger = page.getByRole('button', { name: '说明与帮助', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: '说明与帮助', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('两两检查')
    for (const key of ['ArrowRight', 'ArrowLeft', 'r', 'Tab', 'Shift+Tab']) {
      await page.keyboard.press(key)
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
    }
    await dialog.getByRole('radio', { name: '参考资料', exact: true }).click()
    await expect(dialog.getByRole('link', { name: /CGAL/ })).toHaveCount(2)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    if (route.includes('/learn')) {
      await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '3')
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '4')
    }
  }
})
