import { expect, test } from '@playwright/test'
import type { SweepTrace } from '../src/geometry'

test('普通交叉保留步骤与精确位置，取出向左、记录隐藏、处理中换序向右', async ({ page }) => {
  await page.goto('/cases/crossing/learn?step=9')
  const side = page.getByRole('img', { name: /事件侧向状态/ })
  const next = page.getByRole('button', { name: '下一步', exact: true })
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('从队首取出')
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件左侧（Δ）')
  await expect(side).toContainText('Δ')
  const scan = page.getByRole('img', { name: '扫描线 x = 2', exact: true })
  const x = await scan.getAttribute('x1')
  await next.click()
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('记录 I0')
  await expect(side).toHaveCount(0)
  await expect(page.locator('.current-point')).toBeVisible()
  await expect(scan).toHaveAttribute('x1', x!)
  await next.click()
  await expect(page.getByTestId('active-order')).toHaveText('S1S0')
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('事件处理中')
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件右侧（Δ）')
  await expect(scan).toHaveAttribute('x1', x!)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('max', '18')
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(side).toHaveCount(0)
})

// Worked examples: each row names the event and its actual geometric order.
// HTTP supplies only the existing step addresses, never the expected side.
for (const example of [
  { id: 'endpoint', x: '2', y: '0', before: 'S0', after: 'S1', update: 'insert', partial: true },
  { id: 'multiway-endpoints', x: '0', y: '0', before: 'S2S0S1', after: 'S1S3S0', update: 'insert', partial: true },
  { id: 'multiway-interior', x: '0', y: '0', before: 'S0S2S1', after: 'S1S2S0', update: 'reorder' },
  { id: 'vertical', x: '0', y: '-1', before: 'S0S1S2', after: 'S1S0S2', update: 'reorder' },
  { id: 'vertical', x: '0', y: '1', before: 'S1S0S2', after: 'S1S2S0', update: 'reorder' },
  { id: 'vertical', x: '0', y: '3', before: 'S1S2S0', after: 'S1S2S3', update: 'insert', partial: true },
  { id: 'same-x', x: '0', y: '-1', before: 'S0S1S2S3', after: 'S1S0S2S3', update: 'reorder' },
  { id: 'same-x', x: '0', y: '3', before: 'S1S0S2S3', after: 'S1S0S3S2', update: 'reorder' },
  { id: 'partial-overlap', x: '2', y: '0', before: 'S0', after: 'S1S0', update: 'insert' },
  { id: 'partial-overlap', x: '4', y: '0', before: 'S1S0', after: 'S1', update: 'remove' },
]) test(`事件侧向状态：${example.id} (${example.x}, ${example.y})`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const response = page.waitForResponse(r => r.url().endsWith('/api/intersections'))
  await page.goto(`/cases/${example.id}/learn`)
  const { trace }: { trace: SweepTrace } = await (await response).json()
  const event = trace.steps.map((step, index) => ({ ...step, index })).filter(step =>
    step.current?.x.numerator === example.x && step.current?.y.numerator === example.y)
  expect(event.length).toBeGreaterThan(2)
  const side = page.getByRole('img', { name: /事件侧向状态/ })
  for (const check of [
    { action: 'take', side: '左', order: example.before },
    { action: 'record', side: null },
    ...(example.partial ? [{ action: 'remove', side: null }] : []),
    { action: example.update, side: '右', order: example.after },
    { action: 'complete', side: '右', order: example.after },
  ]) {
    const steps = event.filter(step => step.action === check.action)
    if (check.action !== 'record') expect(steps.length).toBeGreaterThan(0)
    for (const step of steps) {
      await page.goto(`/cases/${example.id}/learn?step=${step.index}`)
      await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(step.index))
      if (check.side) await expect(side).toHaveAccessibleName(`事件侧向状态：当前事件${check.side}侧（Δ）`)
      else await expect(side).toHaveCount(0)
      if (check.order) await expect(page.getByTestId('active-order')).toHaveText(check.order)
      await expect(page.locator('.current-point')).toBeVisible()
      const scan = page.getByRole('img', { name: `扫描线 x = ${example.x}`, exact: true })
      await expect(scan).toHaveAttribute('x1', await scan.getAttribute('x2') as string)
    }
  }
})

test('侧向提示随按钮、快捷键、滑块、浏览器导航恢复且切换无残留', async ({ page }) => {
  await page.goto('/cases/crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const side = page.getByRole('img', { name: /事件侧向状态/ })
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toHaveValue('0')
  await expect(side).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(side).toContainText('←')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(side).toContainText('→')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(side).toContainText('←')
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('2')
  await expect(side).toContainText('→')
  await page.reload()
  await expect(side).toContainText('→')
  await page.goBack()
  await expect(page).toHaveURL(/\/cases\/crossing$/)
  await page.goForward()
  await expect(side).toContainText('→')
  await page.goto('/cases/disjoint/learn')
  await expect(side).toHaveCount(0)
})

test('加入后的检查与发现保持当前事件右侧状态', async ({ page }) => {
  for (const step of [5, 6, 7]) {
    await page.goto(`/cases/crossing/learn?step=${step}`)
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(step))
    await expect(page.getByRole('img', { name: /事件侧向状态/ })).toContainText('→')
    await expect(page.getByTestId('active-order')).toHaveText('S0S1')
  }
})

for (const width of [1360, 390]) test(`Δ 箭头在缩放、平移与边缘保持可读且悬浮于画布顶部 ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 })
  await page.goto('/cases/crossing/learn?step=11')
  const side = page.getByRole('img', { name: /事件侧向状态/ })
  const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
  const verify = async () => {
    await expect(side).toBeVisible()
    const marker = (await side.boundingBox())!
    const surface = (await page.locator('.drawing-surface').boundingBox())!
    const scanX = await page.locator('.sweep-line').evaluate(element => {
      const line = element as SVGLineElement
      return new DOMPoint(line.x1.baseVal.value, line.y1.baseVal.value).matrixTransform(line.getScreenCTM()!).x
    })
    expect(marker.x).toBeGreaterThanOrEqual(surface.x)
    expect(marker.x + marker.width).toBeLessThanOrEqual(surface.x + surface.width)
    expect(scanX).toBeGreaterThanOrEqual(marker.x - 2)
    expect(scanX).toBeLessThanOrEqual(marker.x + marker.width + 2)
    const viewport = (await svg.boundingBox())!
    expect(viewport.y).toBe(surface.y)
    expect(viewport.height).toBe(surface.height)
    expect(marker.y).toBe(viewport.y - 22)
    expect(marker.y + marker.height).toBeLessThanOrEqual(viewport.y + 14)
    const glyph = await side.locator('.sweep-side-arrow').boundingBox()
    expect(glyph!.width).toBeGreaterThan(12)
    expect(glyph!.height).toBeGreaterThanOrEqual(20)
    await expect(side).toContainText('Δ')
    return scanX
  }
  await svg.scrollIntoViewIfNeeded()
  await verify()
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await verify()
  await page.getByRole('button', { name: '缩小', exact: true }).click()
  const startX = await verify()
  const box = (await svg.boundingBox())!
  await page.mouse.move(startX, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 8, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  expect(await verify()).toBeLessThan(startX - 20)
  await page.getByRole('button', { name: '重置视图', exact: true }).click()
  expect(await verify()).toBeCloseTo(startX, 1)
})
