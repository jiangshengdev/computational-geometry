import { expect, test } from '@playwright/test'
import { projectPoints } from '../src/projection'
import { segment } from '../src/geometry'
import { waitForTraceCompletion } from './trace-navigation'

test('projection preserves equal axis scale and fractional geometry', () => {
  const input = segment('-1', '-2', '1', '4')
  const p = projectPoints([input.start, input.end], 1079, 561, 64)!
  const unit = p.x(1) - p.x(0)
  expect(unit).toBeGreaterThan(0)
  expect(p.y(0) - p.y(1)).toBeCloseTo(unit, 10)
  expect(p.x(1 / 3)).toBeCloseTo(p.x(0) + unit / 3, 10)
  expect(p.y(1 / 3)).toBeCloseTo(p.y(0) - unit / 3, 10)
})

test('empty and point inputs retain finite projections', () => {
  const point = segment('1/3', '2/3', '1/3', '2/3').start
  for (const points of [[], [point]]) {
    const p = projectPoints(points, 160, 120, 16)!
    expect(Number.isFinite(p.px(point))).toBe(true)
    expect(Number.isFinite(p.py(point))).toBe(true)
  }
})

test('unusable drawing dimensions have no projection', () => {
  const input = segment('0', '0', '4', '4')
  for (const size of [0, 100, 128, NaN, Infinity, -1]) {
    expect(projectPoints([input.start, input.end], size, 196, 64)).toBeNull()
    expect(projectPoints([input.start, input.end], 318, size, 64)).toBeNull()
  }
})

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`real zero-size layout preserves view and insufficient space hides geometry ${browserName}`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width: 1360, height: 1000 } })
    try {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      await page.goto('/cases/crossing/learn?step=5')
      await waitForTraceCompletion(page)
      const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
      const layer = svg.locator('[data-layer="geometry"]')
      await expect(svg.locator('.input > line')).toHaveCount(2)
      const initialViewBox = (await svg.getAttribute('viewBox'))!
      const initialTransform = (await layer.getAttribute('transform'))!
      await page.getByRole('button', { name: '放大', exact: true }).click()
      await expect(layer).not.toHaveAttribute('transform', initialTransform)
      const zoomed = await layer.getAttribute('transform')
      const box = (await svg.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 15, { steps: 5 })
      await page.mouse.up()
      await expect(layer).not.toHaveAttribute('transform', zoomed!)
      const transform = await layer.getAttribute('transform')
      for (const axis of ['width', 'height'] as const) {
        await svg.evaluate(async (element, axis) => {
          const svg = element as SVGSVGElement
          svg.style.setProperty(axis, '0px', 'important')
          if (axis === 'height') svg.style.setProperty('flex', 'none')
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
        }, axis)
        expect(await svg.evaluate((element, axis) => element.getBoundingClientRect()[axis], axis)).toBe(0)
        await expect(svg).toHaveAttribute('viewBox', initialViewBox)
        await expect(layer).toHaveAttribute('transform', transform!)
        await svg.evaluate(async element => {
          element.removeAttribute('style')
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
        })
        await expect(svg).toHaveAttribute('viewBox', initialViewBox)
        await expect(layer).toHaveAttribute('transform', transform!)
      }
      await svg.evaluate(element => (element as SVGSVGElement).style.setProperty('width', '100px'))
      await expect.poll(() => svg.evaluate(element => element.getBoundingClientRect().width)).toBe(100)
      await expect(svg.locator('[data-layer="geometry"]')).toHaveCount(0)
      await expect(page.getByRole('button', { name: '放大', exact: true })).toBeVisible()
      await svg.evaluate(element => element.removeAttribute('style'))
      await expect(svg.locator('.input > line')).toHaveCount(2)
      await expect(svg).toHaveAttribute('viewBox', initialViewBox)
      expect(errors).toEqual([])
    } finally {
      await page.close()
    }
  })
  browserTest(`stale zero-size notifications preserve geometry and zoom ${browserName}`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width: 1360, height: 1000 } })
    try {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      await page.addInitScript(() => {
        const NativeResizeObserver = window.ResizeObserver
        window.ResizeObserver = class extends NativeResizeObserver {
          constructor(callback: ResizeObserverCallback) {
            super((entries, observer) => {
              callback(entries, observer)
              const entry = entries.find(entry => entry.target.getAttribute('aria-label') === '输入与交集坐标图')
              if (!entry) return
              // Replay the captured notification while leaving the real layout intact.
              Object.assign(window, {
                notifyGeometryResize: (axis: 'width' | 'height') => callback([new Proxy(entry, {
                  get(target, key) {
                    if (key === 'contentRect') return new DOMRect(0, 0,
                      axis === 'width' ? 0 : target.contentRect.width,
                      axis === 'height' ? 0 : target.contentRect.height)
                    return Reflect.get(target, key, target)
                  },
                })], observer),
              })
            })
          }
        }
      })
      await page.goto('/cases/same-x/learn?step=22')
      await waitForTraceCompletion(page)
      const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
      await expect(svg.locator('.input > line')).toHaveCount(4)
      await page.waitForFunction(() => 'notifyGeometryResize' in window)
      const layer = svg.locator('[data-layer="geometry"]')
      const initialTransform = (await layer.getAttribute('transform'))!
      await page.getByRole('button', { name: '放大', exact: true }).click()
      await expect(layer).not.toHaveAttribute('transform', initialTransform)
      const zoomed = (await layer.getAttribute('transform'))!
      const before = await svg.getAttribute('viewBox')
      for (const axis of ['width', 'height'] as const) {
        await page.evaluate(async axis => {
          const notify = (window as unknown as { notifyGeometryResize: (axis: 'width' | 'height') => void }).notifyGeometryResize
          notify(axis)
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
        }, axis)
        await expect(svg).toHaveAttribute('viewBox', before!)
        await expect(layer).toHaveAttribute('transform', zoomed)
        expect(await svg.evaluate(element => element.outerHTML.includes('NaN'))).toBe(false)
      }
      expect(errors).toEqual([])
    } finally {
      await page.close()
    }
  })
}
