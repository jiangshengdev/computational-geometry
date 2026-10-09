import { expect, test } from '@playwright/test'
import { projectPoints } from '../src/projection'
import { segment } from '../src/geometry'

test('power-of-two fit preserves fractional geometry and puts spare pixels on the right and bottom', () => {
  const input = segment('-1', '-2', '1', '4')
  const p = projectPoints([input.start, input.end], 1079, 561, 64)
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
    const p = projectPoints([input.start, input.end], size, size, 64)
    expect(p.x(1) - p.x(0)).toBe(unit)
    expect(p.y(0) - p.y(1)).toBe(unit)
    expect(p.x(0)).toBeGreaterThanOrEqual(64)
    expect(size - p.x(4)).toBeGreaterThanOrEqual(64)
  }
})

test('empty and point inputs retain finite projections', () => {
  const point = segment('1/3', '2/3', '1/3', '2/3').start
  for (const points of [[], [point]]) {
    const p = projectPoints(points, 160, 120, 16)
    expect(Number.isFinite(p.px(point))).toBe(true)
    expect(Number.isFinite(p.py(point))).toBe(true)
  }
})

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  test(`actual viewport fit, continuous zoom, reset and resize ${browserName}`, async ({ playwright, baseURL }) => {
    const browser = await playwright[browserName].launch({ headless: true })
    try {
      const page = await browser.newPage({ baseURL, viewport: { width: 1920, height: 996 }, deviceScaleFactor: 2 })
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
      await browser.close()
    }
  })
}
