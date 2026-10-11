import { expect, test, type Locator } from './learning-test'
import { tabToReachable } from './keyboard'
import { readTrace, waitForTraceCompletion } from './trace-navigation'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

async function expectUnclippedRing(target: Locator) {
  await expect(target).toBeFocused()
  await expect(target).toHaveCSS('box-shadow', /0px 0px 0px 4px/)
  await expect.poll(() => target.evaluate(element => {
    const ring = element.getBoundingClientRect()
    const clearance: number[] = []
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent)
      const box = parent.getBoundingClientRect()
      const left = box.left + parent.clientLeft
      const top = box.top + parent.clientTop
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) clearance.push(ring.left - left, left + parent.clientWidth - ring.right)
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) clearance.push(ring.top - top, top + parent.clientHeight - ring.bottom)
    }
    return Math.min(...clearance)
  })).toBeGreaterThanOrEqual(3.9)
}

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  for (const width of [1360, 390]) browserTest(`教学焦点完整显示并复用组件样式 ${browserName} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    const trace = await readTrace(page, 'crossing')
    const entry = trace.steps.findIndex(step => step.action === 'take-entry')
    expect(entry).toBeGreaterThan(0)
    await page.goto(`/cases/crossing/learn?step=${entry}`)
    await waitForTraceCompletion(page)
    await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
    if (width === 1360) {
      await tabToReachable(page, page.getByRole('switch', { name: '禅模式' }))
      await page.keyboard.press('Space')
    }
    const variables = page.getByRole('region', { name: '核心变量', exact: true })
    const parameters = variables.getByRole('button', { name: '核心参数', exact: true })
    await tabToReachable(page, parameters)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await page.screenshot({ path: join(tmpdir(), `bo-learning-focus-${browserName}-${width}.png`) })
    await expectUnclippedRing(parameters)
    await parameters.press('Enter')
    await expect(parameters).toHaveAttribute('aria-expanded', 'false')
    await expectUnclippedRing(parameters)
    const locals = variables.getByRole('button', { name: '核心局部变量', exact: true })
    await tabToReachable(page, locals)
    await expectUnclippedRing(locals)
    const queue = variables.getByTestId('variable-queue').getByRole('button')
    await tabToReachable(page, queue)
    await expectUnclippedRing(queue)
    await queue.press('Enter')
    await expect(queue).toHaveAttribute('aria-expanded', 'true')
    await expectUnclippedRing(queue)
    // A pointer action switches modality back without making ordinary buttons
    // display keyboard focus rings.
    await parameters.click()
    await expect(parameters).not.toHaveAttribute('data-focus-visible', 'true')
    await expect(parameters).toHaveCSS('box-shadow', 'none')
    await page.getByRole('button', { name: '核心变量说明', exact: true }).click()
    await page.keyboard.press('Tab')
    await expect(parameters).toBeFocused()
    await expectUnclippedRing(parameters)
    // Reload resets sequential focus navigation; all targets are reached by Tab.
    await page.reload()
    await expect(page.getByRole('region', { name: '回放控制', includeHidden: true })).not.toContainText('轨迹生成中')
    const info = page.getByRole('button', { name: '图例与操作说明', exact: true })
    await tabToReachable(page, info)
    await expectUnclippedRing(info)
    const canvas = page.locator('svg[data-teaching="true"]')
    await tabToReachable(page, canvas)
    await expectUnclippedRing(canvas)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await page.screenshot({ path: join(tmpdir(), `bo-learning-canvas-focus-${browserName}-${width}.png`) })
    const code = page.locator('.execution-code-scroll')
    await tabToReachable(page, code)
    await expectUnclippedRing(code)
    const symbol = code.locator('.execution-symbol').first()
    await tabToReachable(page, symbol)
    await expectUnclippedRing(symbol)
    await page.locator('html').evaluate(element => element.classList.add('dark'))
    await expectUnclippedRing(symbol)
    await expect(symbol).toHaveCSS('--tw-ring-color', await page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--focus').trim()))
    await page.keyboard.press('Escape')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  browserTest(`长内容滚动边界与教学浮层焦点 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const trace = await readTrace(page, 'spider-web')
    const entry = trace.steps.findIndex(step => step.action === 'take-entry')
    await page.goto(`/cases/spider-web/learn?step=${entry}`)
    await waitForTraceCompletion(page)
    const variables = page.getByRole('region', { name: '核心变量', exact: true })
    const queue = variables.getByTestId('variable-queue')
    await queue.getByRole('button').click()
    const value = queue.locator('.execution-variable-value')
    expect(await value.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
    await page.keyboard.press('Tab')
    // Preserve each browser's native scrollport Tab behavior.
    if (await value.evaluate(element => document.activeElement === element)) await expectUnclippedRing(value)
    const scroll = variables.locator('.learning-panel-content')
    await page.getByRole('button', { name: '核心变量说明', exact: true }).click()
    await scroll.evaluate(element => { element.scrollTop = element.scrollHeight })
    const parameters = variables.getByRole('button', { name: '核心参数', exact: true })
    await tabToReachable(page, parameters)
    await expectUnclippedRing(parameters)
    await page.getByRole('button', { name: '收起右侧辅助栏', exact: true }).click()
    const trigger = page.getByRole('button', { name: '待处理事件队列', exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: '待处理事件队列', exact: true })
    const help = dialog.getByRole('button', { name: '队列说明', exact: true })
    await tabToReachable(page, help)
    await expectUnclippedRing(help)
    await page.keyboard.press('Tab')
    const panel = dialog.locator('.learning-panel-content')
    if (await panel.evaluate(element => document.activeElement === element)) await expectUnclippedRing(panel)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
}
