import { expect, type Page } from '@playwright/test'

export async function expectUnscaledViewport(page: Page) {
  const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
  await expect(svg).toBeVisible()
  await expect.poll(() => svg.evaluate(element => {
    const svg = element as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const box = svg.viewBox.baseVal
    const matrix = svg.getScreenCTM()!
    return {
      width: Math.abs(rect.width - box.width),
      height: Math.abs(rect.height - box.height),
      scale: Math.abs(matrix.a - 1) + Math.abs(matrix.d - 1),
      origin: Math.abs(matrix.e - rect.x) + Math.abs(matrix.f - rect.y),
    }
  })).toEqual({ width: 0, height: 0, scale: 0, origin: 0 })
}
