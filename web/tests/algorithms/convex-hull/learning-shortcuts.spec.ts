import { expect, test } from '@playwright/test'

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName, locale: 'en-US', viewport: { width: 1440, height: 900 } })

  browserTest(`hull shortcuts navigate single steps and fixed phases: ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/convex-hull/cases/triangle-interior/learn')
    await expect(page.getByText('Trace generated', { exact: false })).toBeVisible()
    const slider = page.getByRole('slider', { name: 'Teaching step' })
    const progress = page.getByRole('region', { name: 'Replay controls', exact: true }).getByRole('status')
    const lastIndex = await slider.getAttribute('max')
    await expect(progress).toContainText(`0 / ${lastIndex}`)
    const button = (name: string) => page.getByRole('button', { name, exact: true })
    await expect(button('Previous step')).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft')
    await expect(button('Next step')).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
    await expect(button('Restart')).toHaveAttribute('aria-keyshortcuts', 'r')
    await page.keyboard.press('ArrowLeft')
    await expect(slider).toHaveValue('0')
    for (const [key, destination] of [['ArrowRight', '1'], ['ArrowLeft', '0']]) {
      await page.keyboard.down(key)
      await expect(slider).toHaveValue(destination)
      await expect(progress).toContainText(`${destination} / ${lastIndex}`)
      await page.keyboard.down(key)
      await expect(slider).toHaveValue(destination)
      await page.keyboard.up(key)
    }
    for (const [name, key, phase] of [
      ['Preprocessing', '1', 'preprocess'], ['Lower hull', '2', 'lower'],
      ['Upper hull', '3', 'upper'], ['Join result', '4', 'join'],
    ]) {
      await expect(button(name)).toHaveAttribute('aria-keyshortcuts', key)
      await button(name).click()
      const destination = await slider.inputValue()
      await expect(page.getByRole('region', { name: 'Current action' })).toHaveAttribute('data-phase', phase)
      await button('Next step').click()
      await page.keyboard.press(key)
      await expect(slider).toHaveValue(destination)
      await expect(page).toHaveURL(new RegExp(`step=${destination}$`))
    }
    await slider.press('End')
    const last = await slider.inputValue()
    await button('Previous step').focus()
    await expect(button('Next step')).toBeDisabled()
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveValue(last)
    await page.keyboard.down('r')
    await expect(slider).toHaveValue('0')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.down('r')
    await expect(slider).toHaveValue('1')
    await page.keyboard.up('r')
    await page.keyboard.press('r')
    await expect(slider).toHaveValue('0')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  browserTest(`hull shortcuts respect focus and absent phases: ${browserName}`, async ({ page }) => {
    await page.goto('/convex-hull/cases/triangle-interior/learn?step=1')
    await expect(page.getByText('Trace generated', { exact: false })).toBeVisible()
    const slider = page.getByRole('slider', { name: 'Teaching step' })
    const keys = ['r', '1', '2', '3', '4']
    await slider.focus()
    for (const key of keys) {
      await page.keyboard.press(key)
      await expect(slider).toHaveValue('1')
    }
    await page.getByRole('button', { name: 'Next step', exact: true }).focus()
    for (const modifier of ['Control', 'Meta', 'Alt', 'Shift']) {
      for (const key of [...keys, 'ArrowRight', 'ArrowLeft']) {
        await test.step(`${modifier}+${key}`, async () => {
          // Native browser chords can leave the page (WebKit Control+ArrowLeft).
          // Check that the application neither consumes the event nor navigates the replay.
          const consumed = await page.evaluate(({ modifier, key }) => {
            const event = new KeyboardEvent('keydown', {
              key, bubbles: true, cancelable: true,
              ctrlKey: modifier === 'Control', metaKey: modifier === 'Meta',
              altKey: modifier === 'Alt', shiftKey: modifier === 'Shift',
            })
            document.activeElement!.dispatchEvent(event)
            return event.defaultPrevented
          }, { modifier, key })
          expect(consumed).toBe(false)
          await expect(page).toHaveURL(/\/convex-hull\/cases\/triangle-interior\/learn\?step=1$/)
          await expect(slider).toHaveValue('1')
        })
      }
    }
    await page.getByRole('button', { name: 'About this case', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    for (const key of [...keys, 'ArrowRight', 'ArrowLeft']) {
      await page.keyboard.press(key)
      await expect(slider).toHaveValue('1')
    }
    for (const preset of ['single', 'empty']) {
      await page.goto(`/convex-hull/cases/${preset}/learn?step=1`)
      await expect(page.getByText('Trace generated', { exact: false })).toBeVisible()
      for (const name of ['Lower hull', 'Upper hull', 'Join result']) {
        await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0)
      }
      for (const key of ['2', '3', '4']) {
        await page.keyboard.press(key)
        await expect(slider).toHaveValue('1')
      }
      await page.keyboard.press('1')
      await expect(slider).toHaveValue('0')
    }
  })
}
