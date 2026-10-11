import { expect, test, type Locator } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readTrace } from './trace-navigation'

async function box(locator: Locator) {
  await expect(locator).toBeVisible()
  return (await locator.boundingBox())!
}

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  for (const width of [1440, 390]) browserTest(`辅助栏长内容与控制隔离 ${browserName} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.goto('/cases/spider-web/learn?step=1')
    const trace = await readTrace(page, 'spider-web')
    await expect(page).toHaveTitle('蜘蛛网 · 逐步学习 · BO 结果查看器')
    const canvas = page.getByRole('region', { name: '几何视图', exact: true })
    const debug = page.getByRole('region', { name: '核心代码回放', exact: true })
    const variables = page.getByRole('region', { name: '核心变量', exact: true })
    const original = [await box(canvas), await box(debug), await box(variables)]
    await page.getByRole('button', { name: '待处理事件队列', exact: true }).click()
    const queue = page.getByRole('region', { name: '待处理事件队列', exact: true })
    await expect(queue.getByRole('listitem')).toHaveCount(trace.steps[1].pending.length)
    const last = queue.getByRole('listitem').last()
    const scroll = await last.evaluate(element => {
      let panel = element.parentElement
      while (panel && !['auto', 'scroll'].includes(getComputedStyle(panel).overflowY)) panel = panel.parentElement
      if (!panel) throw new Error('缺少队列滚动区域')
      panel.scrollTop = panel.scrollHeight
      return panel.scrollTop
    })
    expect(scroll).toBeGreaterThan(0)
    await expect(last).toBeInViewport()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: '待处理事件队列', exact: true })).toBeFocused()
    await page.getByRole('button', { name: '待处理事件队列', exact: true }).click()
    await expect(last).toBeInViewport()
    // Keyboard events in a temporary panel must never advance the trace.
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(/step=1$/)
    await page.keyboard.press('Escape')
    await expect(queue).toBeHidden()
    await expect(page.getByRole('button', { name: '待处理事件队列', exact: true })).toBeFocused()
    expect([await box(canvas), await box(debug), await box(variables)].map(({ width, height }) => ({ width, height })))
      .toEqual(original.map(({ width, height }) => ({ width, height })))
    const next = page.getByRole('button', { name: '下一步', exact: true })
    if (width === 1440) {
      const nextBox = await box(next)
      await page.getByRole('button', { name: '操作解释', exact: true }).click()
      await page.mouse.click(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2)
      await expect(page.getByRole('region', { name: '操作解释', exact: true })).toBeHidden()
      await expect(page).toHaveURL(/step=1$/)
    }
    await next.click()
    await expect(variables.getByTestId('variable-next')).not.toContainText('未赋值')
    await page.getByRole('button', { name: '操作解释', exact: true }).click()
    await expect(page.getByRole('region', { name: '操作解释', exact: true })).toContainText('queue.pop_first()')
    await page.getByRole('button', { name: '相邻性说明', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '说明与帮助', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '说明与帮助', exact: true })).toBeHidden()
    await expect(page.getByRole('button', { name: '相邻性说明', exact: true })).toBeFocused()
    await expect(page.getByRole('region', { name: '操作解释', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('region', { name: '操作解释', exact: true })).toBeHidden()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    await slider.focus()
    await slider.press('End')
    await page.getByRole('button', { name: '操作解释', exact: true }).click()
    const result = page.getByRole('region', { name: '学习结果' })
    await expect(result).toContainText('学习完成')
    await result.locator('p').last().scrollIntoViewIfNeeded()
    await expect(result.locator('p').last()).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
    await page.screenshot({ path: join(tmpdir(), `bo-dock-${browserName}-${width}.png`) })
  })

  browserTest(`侧栏与比例组合记忆及最小宽度 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/cases/crossing/learn?step=1')
    const canvas = page.getByRole('region', { name: '几何视图', exact: true })
    const debug = page.getByRole('region', { name: '核心变量', exact: true })
    const splitter = page.getByRole('separator', { name: '画布与代码区和变量区宽度' })
    await splitter.focus()
    await splitter.press('ArrowRight')
    await splitter.press('ArrowRight')
    await expect(page).toHaveURL(/step=1$/)
    const ratio = async () => { const a = await box(canvas), b = await box(debug); return a.width / (a.width + b.width) }
    const preferred = await ratio()
    expect(preferred).toBeGreaterThan(0.52)
    for (const side of ['左', '右']) await page.getByRole('button', { name: `展开${side}侧辅助栏`, exact: true }).click()
    await expect.poll(async () => Math.abs(await ratio() - preferred)).toBeLessThan(0.003)
    await page.reload()
    for (const side of ['左', '右']) await expect(page.getByRole('button', { name: `收起${side}侧辅助栏`, exact: true })).toBeVisible()
    await expect.poll(async () => Math.abs(await ratio() - preferred)).toBeLessThan(0.003)
    await page.getByRole('link', { name: '返回列表', exact: true }).click()
    await page.locator('a[href="/cases/multiway-endpoints/learn"]').click()
    for (const side of ['左', '右']) await expect(page.getByRole('button', { name: `收起${side}侧辅助栏`, exact: true })).toBeVisible()
    await expect.poll(async () => Math.abs(await ratio() - preferred)).toBeLessThan(0.003)
    for (const edge of [0, 1440]) {
      const handle = await box(splitter)
      await page.mouse.move(handle.x + handle.width / 2, handle.y + 80)
      await page.mouse.down()
      await page.mouse.move(edge, handle.y + 80, { steps: 8 })
      await page.mouse.up()
      expect((await box(canvas)).width).toBeGreaterThanOrEqual(280)
      expect((await box(debug)).width).toBeGreaterThanOrEqual(280)
      await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeInViewport()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await splitter.dblclick()
    await page.screenshot({ path: join(tmpdir(), `bo-layout-${browserName}.png`) })
  })
}
