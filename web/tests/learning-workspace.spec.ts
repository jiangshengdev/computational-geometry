import { expect, test, type Locator } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setReadingFont } from './reading-font'

async function bounds(locator: Locator) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return box!
}

for (const viewport of [{ width: 1360, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`学习工作区：${viewport.width} 三栏核心区域同时可见`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/cases/multiway-endpoints/learn')
    const regions = ['当前事件', '同点参与线段', '几何视图', '待处理事件队列', '活动线段顺序', '操作解释']
    const boxes = await Promise.all(regions.map(name => bounds(page.getByRole('region', { name, exact: true }))))
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    }
    const [current, participants, canvas, queue, active, explanation] = boxes
    expect(current.x).toBe(queue.x)
    expect(current.width).toBe(queue.width)
    expect(current.y).toBe(canvas.y)
    expect(current.y + current.height).toBeLessThan(queue.y)
    expect(queue.y + queue.height).toBeCloseTo(canvas.y + canvas.height, 0)
    expect(participants.x + participants.width).toBeLessThan(canvas.x)
    expect(canvas.x + canvas.width).toBeLessThan(queue.x)
    expect(canvas.x + canvas.width).toBeLessThan(active.x)
    expect(explanation.x).toBe(canvas.x)
    for (const control of [page.getByRole('button', { name: '下一步', exact: true }), page.getByRole('slider', { name: '教学步骤' })]) {
      const box = await bounds(control)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    }
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('其他尚未发现的内部交点不预先加入')
    await testInfo.attach('learning-workspace', { body: await page.screenshot({ path: join(tmpdir(), `bo-learning-workspace-${viewport.width}.png`) }), contentType: 'image/png' })
  })
}

test('学习工作区：真实溢出队列内部滚动不移动画布、操作和解释', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 720 })
  await page.goto('/cases/multiway-endpoints/learn')
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  await expect(queue.getByRole('listitem')).toHaveCount(7)
  await setReadingFont(page, 20)
  const stable = [page.getByRole('region', { name: '几何视图' }), page.getByRole('region', { name: '操作解释' }), page.getByRole('button', { name: '下一步', exact: true })]
  const before = await Promise.all(stable.map(bounds))
  const scrollBefore = await page.evaluate(() => window.scrollY)
  const overflow = await queue.getByRole('listitem').last().evaluate(element => {
    let panel = element.parentElement
    while (panel && !['auto', 'scroll'].includes(getComputedStyle(panel).overflowY)) panel = panel.parentElement
    if (!panel) throw new Error('队列缺少独立滚动区域')
    const distance = panel.scrollHeight - panel.clientHeight
    panel.scrollTop = panel.scrollHeight
    return { distance, scrollTop: panel.scrollTop }
  })
  expect(overflow.distance).toBeGreaterThan(0)
  expect(overflow.scrollTop).toBeGreaterThan(0)
  await expect(queue.getByRole('listitem').last()).toBeInViewport()
  await queue.getByRole('listitem').last().hover()
  await page.mouse.wheel(0, 600)
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
  expect(await Promise.all(stable.map(bounds))).toEqual(before)
})

for (const viewport of [{ width: 390, height: 844 }, { width: 1360, height: 600 }]) {
  test(`学习工作区：${viewport.width}×${viewport.height} 自然滚动仍可阅读和完成`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/cases/crossing/learn')
    const slider = page.getByRole('slider', { name: '教学步骤' })
    await slider.focus()
    await slider.press('End')
    const result = page.getByRole('region', { name: '学习结果' })
    await expect(result).toContainText('I0 (2, 2)：S0 × S1')
    await result.scrollIntoViewIfNeeded()
    await expect(result).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(slider).toHaveAttribute('aria-valuenow', '0')
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
  })
}
