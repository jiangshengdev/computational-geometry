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
    await dialog.getByRole('link').last().focus()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: '关闭帮助' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('link').last()).toBeFocused()
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

test.describe('触屏帮助', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })
  test('帮助入口无需悬停即可阅读和关闭', async ({ page }) => {
    await page.goto('/cases/partial-overlap/learn?step=3')
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '3')
    await page.getByRole('button', { name: '重叠说明', exact: true }).tap()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('radio', { name: '重叠处理规则', exact: true })).toBeChecked()
    await expect(dialog).toContainText('不是上下交换')
    await dialog.getByRole('button', { name: '关闭帮助' }).tap()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '3')
    await page.getByRole('button', { name: '下一步', exact: true }).tap()
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '4')
  })
})
