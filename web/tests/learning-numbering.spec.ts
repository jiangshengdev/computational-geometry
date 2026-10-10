import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { selectPreset } from './cases'

for (const width of [1360, 390]) {
  test(`标题序号：列表对应、真实锚点与标签恢复 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/cases/crossing')
    await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
    await selectPreset(page, 'neighbor-crossing')
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    const next = page.getByRole('button', { name: '下一步', exact: true })
    for (let i = 0; i < 10; i++) await next.click()
    const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
    const labels = svg.locator('.teaching-labels text[data-event-point]')
    const markers = svg.locator('.order-marker')
    const activeTitle = page.getByRole('heading', { name: '活动线段顺序', exact: true })
    const pendingTitle = page.getByRole('heading', { name: '待处理事件队列', exact: true })
    await expect(page.getByTestId('active-order').getByRole('listitem')).toHaveText(['S0', 'S1', 'S2'])
    await activeTitle.hover()
    await expect(svg.locator('.order-number')).toHaveText(['1', '2', '3'])
    await expect(svg.locator('.input[data-highlighted="true"]')).toHaveCount(3)
    await expect(labels.first()).toBeHidden()
    const scanX = Number(await svg.locator('.sweep-line').getAttribute('x1'))
    // At x = 2, the independent equations give heights 2, 3, 6.
    const s0 = svg.locator('.input').nth(0).locator('line')
    const y0 = Number(await s0.getAttribute('y1'))
    const y10 = Number(await s0.getAttribute('y2'))
    for (const [index, height] of [2, 3, 6].entries()) {
      const marker = markers.nth(index)
      await expect(marker).toHaveAttribute('aria-label', `活动线段 ${index + 1}：S${index}`)
      expect(Number(await marker.locator('circle').getAttribute('cx'))).toBeCloseTo(scanX)
      expect(Number(await marker.locator('circle').getAttribute('cy'))).toBeCloseTo(y0 + (y10 - y0) * height / 10)
      // Horizontal SVG lines have a zero-height bounding box despite a visible stroke.
      const line = svg.locator('.input').nth(index).locator('line')
      await expect(line).toHaveCSS('visibility', 'visible')
      await expect(line).not.toHaveCSS('stroke', 'none')
      await expect(line).not.toHaveCSS('stroke-width', '0px')
      await expect(line).toHaveCSS('stroke', 'rgb(7, 133, 116)')
    }
    await page.getByRole('region', { name: '几何视图' }).screenshot({ path: join(tmpdir(), `bo-order-active-${width}.png`) })
    await pendingTitle.hover()
    await expect(svg.locator('.input[data-highlighted="true"]')).toHaveCount(0)
    await expect(svg.locator('.order-number')).toHaveText(['1', '2', '3', '4'])
    const expected = ['I0 (3, 3)', 'S1 终点 (8, 3)', 'S2 终点 (9, 6)', 'S0 终点 (10, 10)']
    for (const [index, name] of expected.entries()) {
      await expect(markers.nth(index)).toHaveAttribute('aria-label', `待处理事件 ${index + 1}：${name}`)
      const anchor = index === 0 ? svg.locator('.scheduled-point') : svg.locator('.input').nth([0, 1, 2, 0][index]).locator('line')
      expect(Number(await markers.nth(index).locator('circle').getAttribute('cx'))).toBeCloseTo(Number(await anchor.getAttribute(index === 0 ? 'cx' : 'x2')))
      expect(Number(await markers.nth(index).locator('circle').getAttribute('cy'))).toBeCloseTo(Number(await anchor.getAttribute(index === 0 ? 'cy' : 'y2')))
    }
    await page.getByRole('region', { name: '几何视图' }).screenshot({ path: join(tmpdir(), `bo-order-pending-${width}.png`) })
    // Hovering the body of the same card is outside the title trigger.
    await page.getByRole('region', { name: '待处理事件队列' }).getByText(expected[0], { exact: true }).hover()
    await expect(markers).toHaveCount(0)
    await expect(labels.filter({ hasText: '(3, 3)' })).toBeVisible()
    await next.focus()
    await activeTitle.hover()
    await page.keyboard.press('Enter')
    await expect(markers).toHaveCount(0)
    await expect(labels).toHaveCount(0)
    await expect(svg.locator('.current-point')).toBeVisible()
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('标题序号：同点错位、换序、缩放平移与空列表', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 })
  await page.goto('/cases/crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const activeTitle = page.getByRole('heading', { name: '活动线段顺序', exact: true })
  const pendingTitle = page.getByRole('heading', { name: '待处理事件队列', exact: true })
  const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
  const markers = svg.locator('.order-marker')
  await activeTitle.hover()
  await expect(markers).toHaveCount(0)
  for (let i = 0; i < 11; i++) await page.getByRole('button', { name: '下一步', exact: true }).click()
  await page.getByRole('button', { name: '放大', exact: true }).click()
  const bounds = (await svg.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 150)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 20, bounds.y + 170)
  await page.mouse.up()
  await activeTitle.hover()
  await expect(markers.nth(0)).toHaveAttribute('aria-label', '活动线段 1：S1')
  await expect(markers.nth(1)).toHaveAttribute('aria-label', '活动线段 2：S0')
  const current = svg.locator('.current-point')
  for (const marker of await markers.all()) {
    for (const [circleAttr, lineAttr] of [['cx', 'x1'], ['cy', 'y1']]) {
      const coordinate = Number(await current.getAttribute(circleAttr))
      expect(Number(await marker.locator('circle').getAttribute(circleAttr))).toBeCloseTo(coordinate)
      expect(Number(await marker.locator('line').getAttribute(lineAttr))).toBeCloseTo(coordinate)
    }
  }
  const [first, second] = await markers.locator('text').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect()
    return { y: box.y, height: box.height }
  }))
  expect(first.height).toBeGreaterThan(0)
  expect(second.height).toBeGreaterThan(0)
  expect(second.y + second.height).toBeLessThan(first.y)
  await page.getByRole('region', { name: '几何视图' }).screenshot({ path: join(tmpdir(), 'bo-order-coincident.png') })
  await page.getByRole('slider', { name: '教学步骤' }).focus()
  await page.keyboard.press('End')
  await pendingTitle.hover()
  await expect(markers).toHaveCount(0)
  await activeTitle.hover()
  await expect(markers).toHaveCount(0)
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(svg.locator('.teaching-labels text:visible')).toHaveCount(0)
  await page.getByRole('region', { name: '待处理事件队列' }).getByRole('listitem').first().hover()
  await expect(svg.locator('.teaching-labels text[data-event-point]')).toBeVisible()
})
