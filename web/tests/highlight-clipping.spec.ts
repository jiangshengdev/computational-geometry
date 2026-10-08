import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

for (const learning of [false, true]) {
  test(`高亮边框完整可见：${learning ? '教学队列' : '原始输入'}`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(`/cases/multiway-endpoints${learning ? '/learn' : ''}`)
    const panel = page.getByRole('region', { name: learning ? '待处理事件队列' : '原始输入', exact: true })
    const row = panel.getByRole('listitem').first()
    await row.hover()
    await expect(row).toHaveAttribute('data-highlighted', 'true')
    const edges = await row.evaluate(element => {
      const style = getComputedStyle(element)
      const outside = Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset))
      const box = element.getBoundingClientRect()
      const paint = { top: box.top - outside, bottom: box.bottom + outside, left: box.left - outside, right: box.right + outside }
      const clips = []
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const css = getComputedStyle(parent)
        if (!['auto', 'scroll', 'hidden', 'clip'].includes(css.overflowY)) continue
        const rect = parent.getBoundingClientRect()
        clips.push({ top: rect.top + parent.clientTop, bottom: rect.top + parent.clientTop + parent.clientHeight,
          left: rect.left + parent.clientLeft, right: rect.left + parent.clientLeft + parent.clientWidth })
      }
      return { paint, clips }
    })
    for (const clip of edges.clips) {
      expect(edges.paint.top).toBeGreaterThanOrEqual(clip.top)
      expect(edges.paint.bottom).toBeLessThanOrEqual(clip.bottom)
      expect(edges.paint.left).toBeGreaterThanOrEqual(clip.left)
      expect(edges.paint.right).toBeLessThanOrEqual(clip.right)
    }
    await page.screenshot({ path: join(tmpdir(), `bo-highlight-${learning ? 'learning' : 'results'}.png`) })
  })
}
