import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expectLearningColumns } from './learning-layout'

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`三栏1:2:2、旧比例失效与窄屏排列 ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.addInitScript(() => {
      localStorage.setItem('bo-learning-layout-v1-ratio', '0.7')
      localStorage.setItem('bo-learning-layout-v1-height-ratio', '0.3')
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/cases/crossing/learn?step=1')
    await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
    await expectLearningColumns(page)
    await page.reload()
    await expectLearningColumns(page)
    const controls = page.getByRole('region', { name: '回放控制', exact: true })
    await controls.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(page).toHaveURL(/step=2$/)
    await expect(page.getByRole('region', { name: '核心变量', exact: true }).getByTestId('variable-next')).not.toContainText('未赋值')
    await expectLearningColumns(page)
    await page.screenshot({ path: join(tmpdir(), `bo-three-columns-${browserName}-desktop.png`) })

    await page.setViewportSize({ width: 390, height: 844 })
    const panels = ['几何视图', '核心代码回放', '核心变量'].map(name => page.getByRole('region', { name, exact: true }))
    const boxes = await Promise.all(panels.map(async panel => {
      await expect(panel).toBeVisible()
      return (await panel.boundingBox())!
    }))
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index].y).toBeGreaterThanOrEqual(boxes[index - 1].y + boxes[index - 1].height)
      expect(Math.abs(boxes[index].width - boxes[0].width)).toBeLessThanOrEqual(1)
    }
    for (const panel of panels) {
      await panel.scrollIntoViewIfNeeded()
      await expect(panel).toBeInViewport()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('separator')).toHaveCount(0)
    await page.screenshot({ path: join(tmpdir(), `bo-three-columns-${browserName}-mobile.png`), fullPage: true })
    for (const viewport of [{ width: 1440, height: 650 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      await expectLearningColumns(page)
    }
    await expect(page).toHaveURL(/step=2$/)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
