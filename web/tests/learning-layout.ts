import { expect, type Page } from '@playwright/test'

export async function expectEqualColumns(page: Page) {
  const panels = ['几何视图', '核心代码回放', '核心变量'].map(name => page.getByRole('region', { name, exact: true }))
  for (const panel of panels) await expect(panel).toBeVisible()
  await expect(async () => {
    const [canvas, code, variables] = await Promise.all(panels.map(async panel => (await panel.boundingBox())!))
    for (const panel of [code, variables]) {
      expect(Math.abs(panel.width - canvas.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(panel.y - canvas.y)).toBeLessThanOrEqual(1)
      expect(Math.abs(panel.height - canvas.height)).toBeLessThanOrEqual(1)
    }
    const firstGap = code.x - canvas.x - canvas.width
    const secondGap = variables.x - code.x - code.width
    expect(firstGap).toBeGreaterThan(0)
    expect(Math.abs(firstGap - secondGap)).toBeLessThanOrEqual(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }).toPass()
  await expect(page.getByRole('separator')).toHaveCount(0)
}
