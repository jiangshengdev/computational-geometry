import { expect, test } from '@playwright/test'
import { expectUnscaledViewport } from './viewport'

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  for (const deviceScaleFactor of [1, 2]) {
    browserTest(`SVG viewport follows layout ${browserName} DPR=${deviceScaleFactor}`, async ({ browser, baseURL }) => {
      const page = await browser.newPage({ baseURL, deviceScaleFactor, viewport: { width: 1920, height: 996 } })
      try {
        for (const route of ['/cases/crossing', '/cases/crossing/learn?step=0']) {
          await page.goto(route)
          await expectUnscaledViewport(page)
        }
        for (let step = 0; step < 3; step++) await page.getByRole('button', { name: '下一步', exact: true }).click()
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
        await page.close()
      }
    })
  }
}
