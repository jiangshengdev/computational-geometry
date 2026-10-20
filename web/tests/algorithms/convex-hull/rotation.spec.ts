import { expect, test, type Locator } from '@playwright/test'
import type { HullStep } from '../../../src/algorithms/convex-hull/trace'

async function center(point: Locator) {
  return point.locator('circle').first().evaluate(circle => {
    const element = circle as SVGCircleElement
    const p = new DOMPoint(element.cx.baseVal.value, element.cy.baseVal.value).matrixTransform(element.getScreenCTM()!)
    return { x: p.x, y: p.y }
  })
}

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName, locale: 'en-US', viewport: { width: 1440, height: 900 } })

  browserTest(`horizontal rotation continues outside the control with fine adjustment and separate reset: ${browserName}`, async ({ page }) => {
    await page.goto('/convex-hull/cases/triangle-interior/learn')
    const plot = page.getByRole('group', { name: 'Convex hull plot', exact: true })
    const point = plot.locator('[data-point-id="0"]')
    await expect(point).toBeVisible()
    const initial = await center(point)
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    const bounds = (await plot.boundingBox())!
    await page.mouse.move(bounds.x + 30, bounds.y + 30)
    await page.mouse.down()
    await page.mouse.move(bounds.x + 70, bounds.y + 55, { steps: 8 })
    await page.mouse.up()
    const panned = await center(point)
    const angle = page.getByRole('textbox', { name: 'Canvas angle' })
    await angle.fill('350')
    await angle.press('Tab')
    const url = page.url()
    const compass = page.getByRole('button', { name: 'Drag left or right to rotate; hold Shift for fine adjustment', exact: true })
    const box = (await compass.boundingBox())!
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 200, cy + 100, { steps: 8 })
    await expect(angle).toHaveValue('90')
    await page.mouse.move(cx + 300, cy + 100, { steps: 8 })
    await expect(angle).toHaveValue('140')
    await page.keyboard.down('Shift')
    await page.mouse.move(cx + 400, cy + 100, { steps: 8 })
    await expect(angle).toHaveValue('145')
    await page.keyboard.up('Shift')
    await page.mouse.move(cx + 300, cy + 100, { steps: 8 })
    await expect(angle).toHaveValue('95')
    await page.mouse.up()
    await page.mouse.move(cx, cy)
    await expect(angle).toHaveValue('95')
    await compass.click()
    await expect(angle).toHaveValue('95')
    await compass.focus()
    await compass.press('Shift+ArrowLeft')
    await expect(angle).toHaveValue('94.9')
    await compass.press('ArrowRight')
    await expect(angle).toHaveValue('95.9')
    await expect(page).toHaveURL(url)
    const projectedCenter = () => plot.locator('[data-layer="geometry"]').evaluate(element => {
      const svg = (element as SVGGraphicsElement).ownerSVGElement!
      const p = new DOMPoint(svg.viewBox.baseVal.width / 2, svg.viewBox.baseVal.height / 2)
        .matrixTransform((element as SVGGraphicsElement).getScreenCTM()!)
      return { x: p.x, y: p.y }
    })
    const originBeforeReset = await projectedCenter()
    const lengthBeforeReset = Math.hypot((await center(point)).x - (await center(plot.locator('[data-point-id="1"]'))).x,
      (await center(point)).y - (await center(plot.locator('[data-point-id="1"]'))).y)
    await page.getByRole('button', { name: 'Reset orientation', exact: true }).click()
    await expect(angle).toHaveValue('0')
    const originAfterReset = await projectedCenter()
    expect(originAfterReset.x).toBeCloseTo(originBeforeReset.x, 4)
    expect(originAfterReset.y).toBeCloseTo(originBeforeReset.y, 4)
    expect((await center(plot.locator('[data-point-id="1"]'))).x - (await center(point)).x).toBeCloseTo(lengthBeforeReset, 4)
    const reset = await center(point)
    expect(reset).not.toEqual(initial)
    await page.getByRole('button', { name: 'Reset view', exact: true }).click()
    expect(await center(point)).toEqual(initial)
    expect(panned).not.toEqual(initial)
  })

  browserTest(`incoming arrow aligns once with a fixed turn point and readable labels: ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    const response = page.waitForResponse(r => r.url().endsWith('/api/convex-hull/trace'))
    await page.goto('/convex-hull/cases/spider-web/learn')
    const steps: HullStep[] = (await (await response).text()).trim().split('\n').map(line => JSON.parse(line))
      .filter(frame => frame.type === 'step').map(frame => frame.step)
    const angle = page.getByRole('textbox', { name: 'Canvas angle' })
    const align = page.getByRole('button', { name: 'Point main arrow up', exact: true })
    await expect(align).toBeDisabled()
    await expect(align).toHaveAccessibleDescription('This step has no main arrow to align')
    await page.getByRole('button', { name: 'This step has no main arrow to align', exact: true }).focus()
    await expect(page.getByRole('tooltip')).toContainText('This step has no main arrow to align')
    await page.mouse.move(0, 0)
    const plot = page.getByRole('group', { name: 'Convex hull plot', exact: true })
    const point = (id: number) => plot.locator(`[data-point-id="${id}"]`)
    const slider = page.getByRole('slider', { name: 'Teaching step' })
    const targets = [steps.findIndex(s => s.subjects.join(',') === '10,16,1' && s.action === 'turn'),
      steps.findIndex(s => s.phase === 'upper' && s.action === 'turn')]
    for (const index of targets) {
      expect(index).toBeGreaterThan(0)
      await slider.focus()
      await slider.press('Home')
      for (let n = 0; n < index; n++) await page.keyboard.down('ArrowRight')
      await page.keyboard.up('ArrowRight')
      await expect(slider).toHaveValue(String(index))
      const [a, b] = steps[index].subjects
      const beforeA = await center(point(a)), pivot = await center(point(b))
      const length = Math.hypot(beforeA.x - pivot.x, beforeA.y - pivot.y)
      const action = await page.getByRole('region', { name: 'Current action' }).innerText()
      const url = page.url()
      await align.click()
      const afterA = await center(point(a)), afterB = await center(point(b))
      expect(afterB.x).toBeCloseTo(pivot.x, 3)
      expect(afterB.y).toBeCloseTo(pivot.y, 3)
      expect(afterA.x).toBeCloseTo(afterB.x, 3)
      expect(afterA.y - afterB.y).toBeCloseTo(length, 3)
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('region', { name: 'Current action' })).toHaveText(action)
      if (index === targets[0]) await page.screenshot({ path: `/tmp/cg-hull-rotation-${browserName}.png` })
      for (const label of await plot.locator('text').all()) {
        const axes = await label.evaluate(element => {
          const matrix = (element as SVGGraphicsElement).getScreenCTM()!
          return { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d }
        })
        expect(axes.a).toBeGreaterThan(0)
        expect(axes.d).toBeGreaterThan(0)
        expect(axes.b).toBeCloseTo(0, 5)
        expect(axes.c).toBeCloseTo(0, 5)
      }
      const value = await angle.inputValue()
      await page.getByRole('button', { name: 'Next step', exact: true }).click()
      await expect(angle).toHaveValue(value)
      await page.getByRole('button', { name: 'Previous step', exact: true }).click()
      await expect(angle).toHaveValue(value)
      await angle.fill('123')
      await angle.press('Tab')
      const rotated = await center(point(b))
      expect(rotated.x).toBeCloseTo(pivot.x, 3)
      expect(rotated.y).toBeCloseTo(pivot.y, 3)
      await point(b).locator('circle').first().click()
      await expect(point(b)).toHaveAttribute('aria-pressed', 'true')
    }
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  browserTest(`angle rotates clockwise without changing scale or URL: ${browserName}`, async ({ page }) => {
    await page.goto('/convex-hull/cases/triangle-interior/learn')
    const plot = page.getByRole('group', { name: 'Convex hull plot', exact: true })
    const point = (id: number) => plot.locator(`[data-point-id="${id}"]`)
    await expect(point(0)).toBeVisible()
    const before = [await center(point(0)), await center(point(1))]
    const url = page.url()
    const angle = page.getByRole('textbox', { name: 'Canvas angle' })
    await angle.fill('450')
    await angle.press('Tab')
    await expect(angle).toHaveValue('90')
    const after = [await center(point(0)), await center(point(1))]
    expect(after[1].x - after[0].x).toBeCloseTo(0, 3)
    expect(after[1].y - after[0].y).toBeCloseTo(before[1].x - before[0].x, 3)
    const bounds = await plot.boundingBox()
    const cx = bounds!.x + bounds!.width / 2
    const cy = bounds!.y + bounds!.height / 2
    expect(after[0].x - cx).toBeCloseTo(-(before[0].y - cy), 3)
    expect(after[0].y - cy).toBeCloseTo(before[0].x - cx, 3)
    await expect(page).toHaveURL(url)
    await page.getByRole('button', { name: 'Next step', exact: true }).click()
    await expect(angle).toHaveValue('90')
    await page.getByRole('button', { name: 'Reset view', exact: true }).click()
    await expect(angle).toHaveValue('0')
    expect(await center(point(0))).toEqual(before[0])
    await angle.fill('-45')
    await angle.press('Tab')
    await expect(angle).toHaveValue('315')
    await angle.fill('359.9999')
    await angle.press('Tab')
    await expect(angle).toHaveValue('0')
    await angle.fill('12.345')
    await angle.press('Tab')
    await expect(angle).toHaveValue('12.345')
    await page.reload()
    await expect(angle).toHaveValue('0')
  })
}
