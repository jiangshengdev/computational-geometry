import { expect, test } from '../support/learning-test'
import { installCase, scrollingCase } from '../../support/scrolling-cases'
import { waitForTraceCompletion } from '../support/trace-navigation'

for (const viewport of [{ width: 1360, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`学习工作区：${viewport.width} 核心内容与回放控件可达`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/bo/cases/multiway-endpoints/learn')
    const regions = ['当前事件', '同点参与线段', '几何视图', '待处理事件队列', '活动线段顺序', '操作解释']
    for (const name of regions) {
      const region = page.getByRole('region', { name, exact: true })
      await region.scrollIntoViewIfNeeded()
      await expect(region).toBeInViewport()
    }
    await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
    for (const control of [page.getByRole('button', { name: '下一步', exact: true }), page.getByRole('group', { name: '教学步骤', exact: true })]) {
      await control.scrollIntoViewIfNeeded()
      await expect(control).toBeInViewport()
    }
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('其他尚未发现的内部交点不预先加入')
  })
}

test('学习工作区：真实溢出队列内部滚动不带动页面', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 720 })
  await installCase(page, scrollingCase)
  await page.goto(`/bo/cases/${scrollingCase.id}/learn`)
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  await expect(queue.getByRole('listitem')).toHaveCount(30)
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
})

test('学习工作区：1360×600 自然滚动仍可阅读和完成', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 600 })
  await page.goto('/bo/cases/crossing/learn')
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await waitForTraceCompletion(page)
  await slider.focus()
  await slider.press('End')
  const result = page.getByRole('region', { name: '学习结果' })
  await expect(result).toContainText('I0 (2, 2)：S0 × S1')
  await result.scrollIntoViewIfNeeded()
  await expect(result).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(slider).toHaveValue('0')
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
})
