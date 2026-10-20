import { expect, test } from '@playwright/test'

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName, locale: 'en-US', viewport: { width: 1440, height: 900 } })

  browserTest(`shared learning entry supports click and guarded shortcut: ${browserName}`, async ({ page }) => {
    for (const path of ['/convex-hull/cases/triangle-interior', '/bo/cases/crossing']) {
      await page.goto(path)
      const entry = page.getByRole('link', { name: 'Start step-by-step learning', exact: true })
      await expect(entry).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
      await page.getByRole('button', { name: 'About this case', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('ArrowRight')
      await expect(page).toHaveURL(path)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toBeHidden()
      await entry.focus()
      for (const key of ['Control+ArrowRight', 'Meta+ArrowRight', 'Alt+ArrowRight', 'Shift+ArrowRight']) {
        await page.keyboard.press(key)
        await expect(page).toHaveURL(path)
      }
      await page.keyboard.down('ArrowRight')
      await expect(page).toHaveURL(`${path}/learn`)
      await page.keyboard.down('ArrowRight')
      await page.keyboard.up('ArrowRight')
      await expect(page).toHaveURL(`${path}/learn`)
      await page.goBack()
      await expect(page).toHaveURL(path)
      await entry.click()
      await expect(page).toHaveURL(`${path}/learn`)
    }
  })

  browserTest(`hull display preferences preserve playback and remain separate from BO: ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/convex-hull/cases/triangle-interior/learn?step=3')
    const ratio = page.getByRole('button', { name: 'Main layout ratio (ordered points, geometry, stacks)' })
    await expect(ratio).toContainText('1:3:1')
    for (const value of ['1:2:1', '1:1:1']) {
      await ratio.click()
      await page.getByRole('option', { name: value, exact: true }).click()
      await expect(ratio).toContainText(value)
      await expect(page).toHaveURL(/step=3$/)
    }
    const zen = page.getByRole('switch', { name: 'Zen mode', exact: true })
    const controls = page.getByRole('region', { name: 'Replay controls', exact: true })
    await page.getByText('Zen mode', { exact: true }).click()
    await expect(zen).toBeChecked()
    await expect(page.locator('.app-header')).toBeHidden()
    await expect(controls).toBeVisible()
    await expect(page.getByRole('region', { name: 'Current action' })).toBeVisible()
    await controls.getByRole('button', { name: 'Next step', exact: true }).click()
    await expect(page).toHaveURL(/step=4$/)
    await page.reload()
    await expect(ratio).toContainText('1:1:1')
    await expect(zen).toBeChecked()
    await expect(controls).toBeVisible()
    await page.getByRole('link', { name: 'Back to cases', exact: true }).focus()
    await page.keyboard.press('z')
    await expect(zen).not.toBeChecked()
    await expect(page.locator('.app-header')).toBeVisible()
    await controls.getByRole('button', { name: 'Join result', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Current action' })).toHaveAttribute('data-phase', 'join')
    await page.getByRole('slider', { name: 'Teaching step' }).press('End')
    await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByRole('button')).toHaveCount(3)
    await expect(page.getByRole('region', { name: 'Ordered points', exact: true })).toBeVisible()
    await page.goto('/bo/cases/crossing/learn')
    await expect(page.getByRole('button', { name: 'Main layout ratio (geometry, code, variables)' })).toContainText('2:3:3')
    await expect(zen).not.toBeChecked()
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
