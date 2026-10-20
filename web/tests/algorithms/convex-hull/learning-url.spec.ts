import { expect, test } from '@playwright/test'

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName, locale: 'en-US' })

  browserTest(`hull slider commits drag and held keys only on release: ${browserName}`, async ({ page }) => {
    test.setTimeout(60000)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/convex-hull/cases/triangle-interior')
    await page.getByRole('link', { name: 'Learn step by step', exact: true }).click()
    await expect(page.getByText('Trace generated', { exact: false })).toBeVisible()
    const slider = page.getByRole('slider', { name: 'Teaching step' })
    const group = page.getByRole('group', { name: 'Teaching step', exact: true })
    await page.evaluate(() => {
      const original = history.replaceState.bind(history)
      Object.assign(window, { replayWrites: 0 })
      history.replaceState = (...args) => {
        const probe = window as unknown as { replayWrites: number }
        probe.replayWrites++
        return original(...args)
      }
    })
    const writes = () => page.evaluate(() => (window as unknown as { replayWrites: number }).replayWrites)
    const box = (await group.boundingBox())!
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + 1, y)
    await page.mouse.down()
    for (let round = 0; round < 6; round++) {
      await page.mouse.move(box.x + box.width + 20, y, { steps: 24 })
      await page.mouse.move(box.x - 20, y, { steps: 24 })
    }
    await page.mouse.move(box.x + box.width + 20, y, { steps: 24 })
    const last = Number(await slider.getAttribute('max'))
    await expect(slider).toHaveValue(String(last))
    await expect(page.getByRole('region', { name: 'Current action' })).toHaveAttribute('data-action', 'complete')
    expect(await writes()).toBe(0)
    await page.mouse.up()
    await expect.poll(writes).toBe(1)
    await expect(page).toHaveURL(new RegExp(`step=${last}$`))
    await slider.press('End')
    expect(await writes()).toBe(1)
    await page.reload()
    await expect(slider).toHaveValue(String(last))
    await page.goBack()
    await expect(page).toHaveURL(/\/convex-hull\/cases\/triangle-interior$/)
    await page.goForward()
    await expect(slider).toHaveValue(String(last))

    await slider.press('Home')
    await expect(page).toHaveURL(/step=0$/)
    await slider.focus()
    for (let index = 1; index <= 6; index++) {
      await page.keyboard.down('ArrowRight')
      await expect(slider).toHaveValue(String(index))
      await expect(page).toHaveURL(/step=0$/)
    }
    await page.keyboard.up('ArrowRight')
    await expect(page).toHaveURL(/step=6$/)
    await page.reload()
    await expect(slider).toHaveValue('6')
    await slider.focus()
    await page.keyboard.down('ArrowRight')
    await expect(slider).toHaveValue('7')
    await page.getByRole('button', { name: 'Previous step', exact: true }).focus()
    await page.keyboard.up('ArrowRight')
    await expect(page).toHaveURL(/step=7$/)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  browserTest(`hull navigation discards unfinished preview: ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/convex-hull/cases/triangle-interior')
    await page.getByRole('link', { name: 'Learn step by step', exact: true }).click()
    await expect(page.getByText('Trace generated', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Next step', exact: true }).click()
    const slider = page.getByRole('slider', { name: 'Teaching step' })
    await slider.focus()
    await page.keyboard.down('ArrowRight')
    await expect(slider).toHaveValue('2')
    await expect(page).toHaveURL(/step=1$/)
    await page.goBack()
    await page.keyboard.up('ArrowRight')
    await expect(page).toHaveURL(/\/convex-hull\/cases\/triangle-interior$/)
    await page.goForward()
    await expect(slider).toHaveValue('1')
    await expect(page).toHaveURL(/step=1$/)
    await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
    await page.getByRole('article', { name: 'Single point', exact: true }).getByRole('button', { name: 'View details', exact: true }).click()
    await page.getByRole('link', { name: 'Learn step by step', exact: true }).click()
    await expect(slider).toHaveValue('0')
    await expect(page.getByRole('region', { name: 'Current action' })).toHaveAttribute('data-action', 'input')
    expect(errors).toEqual([])
  })
}
