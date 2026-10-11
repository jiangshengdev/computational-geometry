import { expect, test } from '@playwright/test'
import { projectPoints } from '../src/projection'
import { segment } from '../src/geometry'
import { expectUnscaledViewport } from './viewport'

test('power-of-two fit preserves fractional geometry and puts spare pixels on the right and bottom', () => {
  const input = segment('-1', '-2', '1', '4')
  const p = projectPoints([input.start, input.end], 1079, 561, 64)!
  expect(p.x(1) - p.x(0)).toBe(64)
  expect(p.y(0) - p.y(1)).toBe(64)
  expect(p.x(-1)).toBe(475)
  expect(p.y(4)).toBe(88)
  expect(1079 - p.x(1)).toBe(476)
  expect(561 - p.y(-2)).toBe(89)
  expect(p.x(1 / 3)).toBeCloseTo(p.x(0) + 64 / 3, 10)
  expect(p.y(1 / 3)).toBeCloseTo(p.y(0) - 64 / 3, 10)
})

test('fit changes at the power-of-two boundary and permits negative exponents', () => {
  const input = segment('0', '0', '4', '4')
  for (const [size, unit] of [[639, 64], [640, 128], [641, 128], [130, 0.5]]) {
    const p = projectPoints([input.start, input.end], size, size, 64)!
    expect(p.x(1) - p.x(0)).toBe(unit)
    expect(p.y(0) - p.y(1)).toBe(unit)
    expect(p.x(0)).toBeGreaterThanOrEqual(64)
    expect(size - p.x(4)).toBeGreaterThanOrEqual(64)
  }
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

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`real zero-size layout preserves view and insufficient space hides geometry ${browserName}`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width: 390, height: 1000 } })
    try {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      await page.goto('/cases/crossing/learn?step=5')
      const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
      const layer = svg.locator('[data-layer="geometry"]')
      await expectUnscaledViewport(page)
      await expect(svg.locator('.input > line')).toHaveCount(2)
      const initialViewBox = (await svg.getAttribute('viewBox'))!
      await page.getByRole('button', { name: '放大', exact: true }).click()
      await expect(layer).toHaveAttribute('transform', /scale\(1\.4\)/)
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
        await expectUnscaledViewport(page)
        await expect(svg).toHaveAttribute('viewBox', initialViewBox)
        await expect(layer).toHaveAttribute('transform', transform!)
      }
      await svg.evaluate(element => (element as SVGSVGElement).style.setProperty('width', '100px'))
      await expect.poll(() => svg.evaluate(element => element.getBoundingClientRect().width)).toBe(100)
      await expectUnscaledViewport(page)
      await expect(svg.locator('[data-layer="geometry"]')).toHaveCount(0)
      await expect(page.getByRole('button', { name: '放大', exact: true })).toBeVisible()
      await svg.evaluate(element => element.removeAttribute('style'))
      await expect(svg.locator('.input > line')).toHaveCount(2)
      await expectUnscaledViewport(page)
      await expect(svg).toHaveAttribute('viewBox', initialViewBox)
      expect(errors).toEqual([])
    } finally {
      await page.close()
    }
  })
  browserTest(`stale zero-size notifications preserve geometry and zoom ${browserName}`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width: 390, height: 1000 } })
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
      const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
      await expect(svg.locator('.input > line')).toHaveCount(4)
      await page.waitForFunction(() => 'notifyGeometryResize' in window)
      await page.getByRole('button', { name: '放大', exact: true }).click()
      const layer = svg.locator('[data-layer="geometry"]')
      await expect(layer).toHaveAttribute('transform', /scale\(1\.4\)/)
      const before = await svg.getAttribute('viewBox')
      for (const axis of ['width', 'height'] as const) {
        await page.evaluate(async axis => {
          const notify = (window as unknown as { notifyGeometryResize: (axis: 'width' | 'height') => void }).notifyGeometryResize
          notify(axis)
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
        }, axis)
        await expect(svg).toHaveAttribute('viewBox', before!)
        await expect(layer).toHaveAttribute('transform', /scale\(1\.4\)/)
        expect(await svg.evaluate(element => element.outerHTML.includes('NaN'))).toBe(false)
      }
      expect(errors).toEqual([])
    } finally {
      await page.close()
    }
  })

  browserTest(`actual viewport fit, continuous zoom, reset and resize ${browserName}`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width: 1920, height: 996 }, deviceScaleFactor: 2 })
    try {
      for (const route of ['/cases/same-x', '/cases/same-x/learn?step=28']) {
        await page.goto(route)
        const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
        await expect(svg.locator('.input > line')).toHaveCount(4)
        const fit = async () => {
          await expect.poll(() => svg.evaluate(element => {
            const svg = element as SVGSVGElement
            const line = svg.querySelector('.input > line') as SVGLineElement
            const unit = (line.x2.baseVal.value - line.x1.baseVal.value) / 2
            const { width, height } = svg.viewBox.baseVal
            const rect = svg.getBoundingClientRect()
            const top = svg.querySelectorAll<SVGLineElement>('.input > line')[2].y2.baseVal.value
            return {
              power: Number.isInteger(Math.log2(unit)),
              fits: unit * 2 <= width - 128 && unit * 6 <= height - 128,
              maximal: unit * 4 > width - 128 || unit * 12 > height - 128,
              centered: line.x1.baseVal.value === Math.floor((width - 2 * unit) / 2) && top === Math.floor((height - 6 * unit) / 2),
              viewport: rect.width === width && rect.height === height,
              transform: svg.querySelector('[data-layer="geometry"]')!.getAttribute('transform'),
            }
          })).toEqual({ power: true, fits: true, maximal: true, centered: true, viewport: true, transform: 'translate(0,0) scale(1)' })
        }
        await fit()
        const layer = svg.locator('[data-layer="geometry"]')
        await page.getByRole('button', { name: '放大', exact: true }).click()
        await expect(layer).toHaveAttribute('transform', /scale\(1\.4\)/)
        await page.getByRole('button', { name: '重置视图', exact: true }).click()
        await fit()
        await page.getByRole('button', { name: '放大', exact: true }).click()
        await page.setViewportSize({ width: 1361, height: 901 })
        await fit()
        await page.setViewportSize({ width: 390, height: 844 })
        await fit()
        await page.setViewportSize({ width: 1920, height: 996 })
      }
    } finally {
      await page.close()
    }
  })
}
