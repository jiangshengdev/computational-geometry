import { expect, test } from '../support/learning-test'
import { readResponse, readTrace, seekStep, stepIndex } from '../support/trace-navigation'

test('普通交叉保留步骤与精确位置，取出向左、记录隐藏、处理中换序向右', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const take = stepIndex(trace, step => step.action === 'take' && step.current?.x.numerator === '2' && step.current.y.numerator === '2')
  const record = stepIndex(trace, (step, index) => index > take && step.action === 'record' && step.current?.x.numerator === '2' && step.current.y.numerator === '2')
  const reorder = stepIndex(trace, (step, index) => index > record && step.action === 'reorder' && step.current?.x.numerator === '2' && step.current.y.numerator === '2')
  await page.goto(`/bo/cases/crossing/learn?step=${take}`)
  const side = page.getByRole('img', { name: /事件侧向状态/ })
  const next = page.getByRole('button', { name: '下一步', exact: true })
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('从队首取出')
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件左侧（Δ）')
  await expect(side).toContainText('Δ')
  const scan = page.getByRole('img', { name: '扫描线 x = 2', exact: true })
  const x = await scan.getAttribute('x1')
  for (let index = take; index < record; index++) await next.click()
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('记录 I0')
  await expect(side).toHaveCount(0)
  await expect(page.locator('.current-point')).toBeVisible()
  await expect(scan).toHaveAttribute('x1', x!)
  for (let index = record; index < reorder; index++) await next.click()
  await expect(page.getByTestId('active-order')).toHaveText('S1S0')
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('事件处理中')
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件右侧（Δ）')
  await expect(scan).toHaveAttribute('x1', x!)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('max', String(trace.steps.length - 1))
  await seekStep(page, trace.steps.length - 1)
  await expect(page.getByRole('region', { name: '学习结果' })).toContainText('I0 (2, 2)')
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
  const response = page.waitForResponse(r => r.url().endsWith('/api/bo/intersections'))
  await page.goto(`/bo/cases/${example.id}/learn`)
  const { trace } = await readResponse(await response)
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
      await page.goto(`/bo/cases/${example.id}/learn?step=${step.index}`)
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
  const trace = await readTrace(page, 'crossing')
  const take = stepIndex(trace, step => step.action === 'take')
  const insert = stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(0))
  await page.goto('/bo/cases/crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const side = page.getByRole('img', { name: /事件侧向状态/ })
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toHaveValue('0')
  await expect(side).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(side).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(side).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件左侧（Δ）')
  for (let index = take; index < insert; index++) await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件右侧（Δ）')
  for (let index = insert; index > take; index--) await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件左侧（Δ）')
  await slider.focus()
  for (let index = take; index < insert; index++) await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue(String(insert))
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件右侧（Δ）')
  await page.reload()
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件右侧（Δ）')
  await page.goBack()
  await expect(page).toHaveURL(/\/bo\/cases\/crossing$/)
  await page.goForward()
  await expect(side).toHaveAccessibleName('事件侧向状态：当前事件右侧（Δ）')
  await page.goto('/bo/cases/disjoint/learn')
  await expect(side).toHaveCount(0)
})

test('加入后的检查与发现保持当前事件右侧状态', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const insert = stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(1) && step.current?.x.numerator === '0' && step.current.y.numerator === '4')
  const check = stepIndex(trace, (step, index) => index > insert && step.action === 'check' && step.subjects.includes(0) && step.subjects.includes(1) && step.current?.x.numerator === '0' && step.current.y.numerator === '4')
  const discover = stepIndex(trace, (step, index) => index > check && step.action === 'discover' && step.subjects.includes(0) && step.subjects.includes(1) && step.current?.x.numerator === '0' && step.current.y.numerator === '4')
  for (const step of [insert, check, discover]) {
    await page.goto(`/bo/cases/crossing/learn?step=${step}`)
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(step))
    await expect(page.getByRole('img', { name: /事件侧向状态/ })).toHaveAccessibleName('事件侧向状态：当前事件右侧（Δ）')
    await expect(page.getByTestId('active-order')).toHaveText('S0S1')
  }
})

test('Δ 提示在缩放和平移后仍跟随扫描线', async ({ page }) => {
  const reorder = stepIndex(await readTrace(page, 'crossing'), step => step.action === 'reorder' && step.current?.x.numerator === '2' && step.current.y.numerator === '2')
  await page.setViewportSize({ width: 1360, height: 1000 })
  await page.goto(`/bo/cases/crossing/learn?step=${reorder}`)
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
    expect(scanX).toBeGreaterThanOrEqual(marker.x)
    expect(scanX).toBeLessThanOrEqual(marker.x + marker.width)
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
  expect(await verify()).toBeLessThan(startX)
  await page.getByRole('button', { name: '重置视图', exact: true }).click()
  expect(await verify()).toBeCloseTo(startX, 1)
})
