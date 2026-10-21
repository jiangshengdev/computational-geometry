import { expect, test, type Locator } from '@playwright/test'

async function endpoints(line: Locator) {
  return line.evaluate(node => {
    const element = node as SVGLineElement
    const matrix = element.getScreenCTM()!
    return [new DOMPoint(element.x1.baseVal.value, element.y1.baseVal.value),
      new DOMPoint(element.x2.baseVal.value, element.y2.baseVal.value)]
      .map(point => { const p = point.matrixTransform(matrix); return { x: p.x, y: p.y } })
  })
}

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName, locale: 'en-US', viewport: { width: 1600, height: 1000 } })

  browserTest(`polygon rotation keeps the canvas center fixed after pan and zoom: ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/convex-polygon-intersection/cases/irregular-overlap/learn?step=15')
    const plot = page.getByRole('group', { name: 'Convex polygon intersection plot', exact: true })
    const layer = plot.locator('[data-layer="geometry"]')
    const edge = plot.locator('[data-edge="A"]')
    const angle = page.getByRole('textbox', { name: 'Canvas angle' })
    await expect(edge).toBeVisible()
    const initial = await endpoints(edge)
    const coordinates = await page.getByRole('listitem').allTextContents()
    const action = page.getByRole('region', { name: 'Current action', exact: true })
    const description = await action.innerText()
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    const box = (await plot.boundingBox())!
    await page.mouse.move(box.x + 25, box.y + 25)
    await page.mouse.down()
    await page.mouse.move(box.x + 105, box.y + 65, { steps: 5 })
    await page.mouse.up()
    const before = await endpoints(edge)
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2
    const url = page.url()
    await angle.fill('450')
    await angle.press('Tab')
    await expect(angle).toHaveValue('90')
    const after = await endpoints(edge)
    for (let i = 0; i < 2; i++) {
      expect(after[i].x - cx).toBeCloseTo(-(before[i].y - cy), 3)
      expect(after[i].y - cy).toBeCloseTo(before[i].x - cx, 3)
    }
    await page.keyboard.press('q')
    await expect(angle).toHaveValue('85')
    await page.keyboard.press('Shift+e')
    await expect(angle).toHaveValue('86')
    for (let i = 0; i < 6; i++) await page.keyboard.down('e')
    await page.keyboard.up('e')
    await expect(angle).toHaveValue('116')
    const compass = page.getByRole('button', { name: 'Drag left or right to rotate; hold Shift for fine adjustment', exact: true })
    const control = (await compass.boundingBox())!
    const x = control.x + control.width / 2, y = control.y + control.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 100, y + 50, { steps: 5 })
    await expect(angle).toHaveValue('166')
    await page.keyboard.down('Shift')
    await page.mouse.move(x + 200, y + 50, { steps: 5 })
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await expect(angle).toHaveValue('171')
    await expect(page).toHaveURL(url)
    await expect(action).toHaveText(description, { useInnerText: true })
    expect(await page.getByRole('listitem').allTextContents()).toEqual(coordinates)
    await page.keyboard.press('0')
    await expect(angle).toHaveValue('0')
    const reset = await endpoints(edge)
    for (let i = 0; i < 2; i++) {
      expect(reset[i].x).toBeCloseTo(before[i].x, 3)
      expect(reset[i].y).toBeCloseTo(before[i].y, 3)
    }
    await page.keyboard.press('e')
    const scale = await layer.evaluate(node => Math.hypot((node as SVGGraphicsElement).getCTM()!.a, (node as SVGGraphicsElement).getCTM()!.b))
    await page.keyboard.press('c')
    await expect(angle).toHaveValue('5')
    expect(await layer.evaluate(node => Math.hypot((node as SVGGraphicsElement).getCTM()!.a, (node as SVGGraphicsElement).getCTM()!.b))).toBeCloseTo(scale, 5)
    await page.keyboard.press('Shift+0')
    await expect(angle).toHaveValue('0')
    const restored = await endpoints(edge)
    for (let i = 0; i < 2; i++) {
      expect(restored[i].x).toBeCloseTo(initial[i].x, 3)
      expect(restored[i].y).toBeCloseTo(initial[i].y, 3)
    }
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  browserTest(`A alignment, side overlays and upright labels survive polygon rotation: ${browserName}`, async ({ page }) => {
    await page.goto('/convex-polygon-intersection/cases/irregular-overlap/learn')
    const align = page.getByRole('button', { name: 'Point A edge up', exact: true })
    await expect(align).toBeDisabled()
    await expect(align).toHaveAccessibleDescription('This step has no valid A edge to align')
    await page.goto('/convex-polygon-intersection/cases/irregular-overlap/learn?step=15')
    const plot = page.getByRole('group', { name: 'Convex polygon intersection plot', exact: true })
    const edge = plot.locator('[data-edge="A"]')
    await expect(edge).toBeVisible()
    const before = await endpoints(edge)
    await align.click()
    const after = await endpoints(edge)
    expect(after[1].x).toBeCloseTo(after[0].x, 3)
    expect(after[1].y).toBeLessThan(after[0].y)
    expect(Math.hypot(after[1].x - after[0].x, after[1].y - after[0].y))
      .toBeCloseTo(Math.hypot(before[1].x - before[0].x, before[1].y - before[0].y), 3)
    const angle = page.getByRole('textbox', { name: 'Canvas angle' })
    const value = await angle.inputValue()
    await page.getByRole('button', { name: 'Next step', exact: true }).click()
    await expect(angle).toHaveValue(value)
    await page.getByRole('button', { name: 'Previous step', exact: true }).click()
    await angle.fill('123')
    await angle.press('Tab')
    await page.keyboard.press('t')
    await expect(angle).toHaveValue(value)
    for (const label of await plot.locator('text').all()) {
      const axes = await label.evaluate(node => {
        const matrix = (node as SVGGraphicsElement).getScreenCTM()!
        return { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d }
      })
      expect(axes.a).toBeGreaterThan(0)
      expect(axes.d).toBeGreaterThan(0)
      expect(axes.b).toBeCloseTo(0, 5)
      expect(axes.c).toBeCloseTo(0, 5)
    }
    const direction = page.locator('[data-edge-direction]')
    const arrow = await endpoints(direction.locator('g > line[marker-end]').first())
    expect(arrow[1].x).toBeCloseTo(arrow[0].x, 3)
    expect(arrow[1].y).toBeLessThan(arrow[0].y)
    const surface = plot.locator('..')
    const label = surface.locator('[data-side-label="0"]')
    await expect(label).toBeVisible()
    await label.click()
    await expect(surface.locator('[data-side-guide="0"]')).toBeVisible()
    const matrix = (node: Element) => {
      const m = (node as SVGGraphicsElement).getScreenCTM()!
      return [m.a, m.b, m.c, m.d, m.e, m.f]
    }
    const geometryMatrix = await plot.locator('[data-layer="geometry"]').evaluate(matrix)
    const guideMatrix = await surface.locator('[data-side-guide="0"]').evaluate(matrix)
    guideMatrix.forEach((value, i) => expect(value).toBeCloseTo(geometryMatrix[i], 5))
    await page.screenshot({ path: `/tmp/cg-polygon-rotation-${browserName}.png` })
    await page.reload()
    await expect(angle).toHaveValue('0')
  })
}
