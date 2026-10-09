import { expect, test, type Page } from '@playwright/test'

async function expectUnscaledViewport(page: Page) {
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

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  for (const deviceScaleFactor of [1, 2]) {
    test(`SVG viewport follows layout ${browserName} DPR=${deviceScaleFactor}`, async ({ playwright, baseURL }) => {
      const browser = await playwright[browserName].launch({ headless: true })
      try {
        const page = await browser.newPage({ baseURL, deviceScaleFactor, viewport: { width: 1920, height: 996 } })
        for (const route of ['/cases/crossing', '/cases/crossing/learn?step=0']) {
          await page.goto(route)
          await expectUnscaledViewport(page)
        }
        await page.getByRole('button', { name: '下一步', exact: true }).click()
        await expect(page.getByRole('img', { name: /事件侧向状态/ })).toBeVisible()
        await expectUnscaledViewport(page)
        for (const viewport of [{ width: 1361, height: 901 }, { width: 390, height: 844 }, { width: 1920, height: 996 }]) {
          await page.setViewportSize(viewport)
          await expectUnscaledViewport(page)
        }
        await page.getByRole('button', { name: '放大', exact: true }).click()
        await expectUnscaledViewport(page)
        await page.getByRole('button', { name: '重置视图', exact: true }).click()
        await expectUnscaledViewport(page)
      } finally {
        await browser.close()
      }
    })
  }
}
