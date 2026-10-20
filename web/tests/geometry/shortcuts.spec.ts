import { expect, test, type Locator } from '@playwright/test'

// Geometry transforms are measured only to verify view operations, not styling.
async function view(layer: Locator) {
  return layer.evaluate(element => {
    const matrix = (element as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix
    return { scale: Math.hypot(matrix.a, matrix.b), x: matrix.e, y: matrix.f }
  })
}

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName, locale: 'en-US', viewport: { width: 1440, height: 900 } })

  browserTest(`canvas shortcuts share zoom, center and reset across pages: ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    for (const path of [
      '/convex-hull/cases/triangle-interior', '/convex-hull/cases/triangle-interior/learn',
      '/convex-polygon-intersection/cases/overlap', '/triangulation/cases/triangle',
      '/bo/cases/crossing', '/bo/cases/crossing/learn',
    ]) {
      await test.step(path, async () => {
        await page.goto(path)
        const layer = page.locator('[data-layer="geometry"]').first()
        await expect(layer).toBeVisible()
        const controls = page.getByRole('group', { name: 'Canvas view controls', exact: true })
        await expect(controls).toContainText('+ / =')
        await expect(controls).toContainText('Shift+0')
        const initial = await view(layer)
        const url = page.url()
        await page.keyboard.down('=')
        await expect.poll(async () => (await view(layer)).scale).toBeCloseTo(initial.scale * 1.4)
        await page.keyboard.down('=')
        expect((await view(layer)).scale).toBeCloseTo(initial.scale * 1.4)
        await page.keyboard.up('=')
        await page.keyboard.press('-')
        await expect.poll(async () => (await view(layer)).scale).toBeCloseTo(initial.scale)
        await page.keyboard.press('Shift+Equal')
        await expect.poll(async () => (await view(layer)).scale).toBeCloseTo(initial.scale * 1.4)
        await page.keyboard.press('c')
        const centered = await view(layer)
        expect(centered.scale).toBeCloseTo(initial.scale * 1.4)
        await page.getByRole('button', { name: 'Center canvas', exact: true }).click()
        expect(await view(layer)).toEqual(centered)
        await page.keyboard.press('Shift+Digit0')
        await expect.poll(() => view(layer)).toEqual(initial)
        await expect(page).toHaveURL(url)
        await expect(page.locator('vite-error-overlay')).toHaveCount(0)
      })
    }
    expect(errors).toEqual([])
  })

  browserTest(`rotation shortcuts repeat, respect focus and stop on blur: ${browserName}`, async ({ page }) => {
    await page.goto('/convex-hull/cases/triangle-interior/learn')
    const angle = page.getByRole('textbox', { name: 'Canvas angle' })
    await expect(angle).toHaveValue('0')
    const layer = page.locator('[data-layer="geometry"]').first()
    const initial = await view(layer)
    const url = page.url()
    await page.keyboard.down('e')
    await page.keyboard.down('e')
    await expect(angle).toHaveValue('10')
    await page.keyboard.down('Shift')
    await page.keyboard.down('e')
    await expect(angle).toHaveValue('11')
    await page.keyboard.up('e')
    await page.keyboard.up('Shift')
    await page.keyboard.press('Shift+KeyQ')
    await expect(angle).toHaveValue('10')
    await page.keyboard.press('q')
    await expect(angle).toHaveValue('5')
    await page.keyboard.press('0')
    await expect(angle).toHaveValue('0')
    await page.keyboard.press('q')
    await expect(angle).toHaveValue('355')
    await page.keyboard.press('t') // No main arrow at step zero.
    await expect(angle).toHaveValue('355')
    await page.keyboard.press('=')
    await page.keyboard.press('0')
    await expect(angle).toHaveValue('0')
    expect((await view(layer)).scale).toBeCloseTo(1.4)
    await page.keyboard.press('Shift+Digit0')
    await expect.poll(() => view(layer)).toEqual(initial)
    await page.keyboard.down('e')
    await expect(angle).toHaveValue('5')
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await page.keyboard.down('e')
    await expect(angle).toHaveValue('5')
    await page.keyboard.up('e')
    await page.keyboard.press('e')
    await expect(angle).toHaveValue('10')
    await expect(page).toHaveURL(url)

    await angle.focus()
    const before = await view(layer)
    for (const key of ['q', 'e', '=', '-', 'c', 't', 'Shift+Digit0']) await page.keyboard.press(key)
    expect(await view(layer)).toEqual(before)
    // Discard any numeric field edits before testing page-level keys again.
    await angle.press('Escape')
    await page.getByRole('button', { name: 'About this case', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const modalView = await view(layer)
    for (const key of ['q', 'e', '=', '-', 'c', 't', '0', 'Shift+Digit0']) await page.keyboard.press(key)
    expect(await view(layer)).toEqual(modalView)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Reset orientation', exact: true }).click()
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
      const consumed = await page.evaluate(options => {
        const event = new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true, cancelable: true, ...options })
        document.activeElement!.dispatchEvent(event)
        return event.defaultPrevented
      }, options)
      expect(consumed).toBe(false)
      await expect(angle).toHaveValue('0')
    }
    await page.getByRole('slider', { name: 'Teaching step' }).focus()
    const sliderView = await view(layer)
    for (const key of ['q', 'e', '=', '-', 'c', 't', '0', 'Shift+Digit0']) await page.keyboard.press(key)
    expect(await view(layer)).toEqual(sliderView)
    await page.getByRole('button', { name: 'Reset orientation', exact: true }).focus()
    await page.screenshot({ path: `/tmp/cg-canvas-shortcuts-${browserName}.png` })
    await page.keyboard.down('e')
    await expect(angle).toHaveValue('5')
    await page.getByRole('link', { name: 'Back to results viewer', exact: true }).click()
    await expect(angle).toHaveCount(0)
    await page.goBack()
    await expect(angle).toHaveValue('0')
    await page.keyboard.down('e') // A key held across navigation must not resume rotation.
    await expect(angle).toHaveValue('0')
    await page.keyboard.up('e')
    await page.keyboard.press('e')
    await expect(angle).toHaveValue('5')
  })
}
