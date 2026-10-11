import { expect, test, expandedPanels, type Locator, type Page } from './learning-test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readResponse, readTrace, stepIndex, waitForTraceCompletion } from './trace-navigation'

async function linePosition(line: Locator, fraction = 0.25) {
  await line.scrollIntoViewIfNeeded()
  return line.evaluate((element, fraction) => {
    const line = element as SVGLineElement
    const point = new DOMPoint(
      line.x1.baseVal.value + (line.x2.baseVal.value - line.x1.baseVal.value) * fraction,
      line.y1.baseVal.value + (line.y2.baseVal.value - line.y1.baseVal.value) * fraction,
    ).matrixTransform(line.getScreenCTM()!)
    return { x: point.x, y: point.y }
  }, fraction)
}

async function readableLabels(page: Page) {
  await expect.poll(() => page.locator('.teaching-labels text').evaluateAll(nodes => {
    const visible = nodes.filter(node => getComputedStyle(node).visibility === 'visible')
    const viewport = document.querySelector('.drawing-surface > svg')!.getBoundingClientRect()
    const boxes = visible.map(node => node.getBoundingClientRect())
    return boxes.every((a, i) => a.width > 0 && a.left >= viewport.left && a.right <= viewport.right &&
      a.top >= viewport.top && a.bottom <= viewport.bottom && !boxes.slice(i + 1).some(b =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top))
  })).toBe(true)
}

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  for (const width of [1920, 390]) browserTest(`教学标签：编号跨步骤和悬停保持固定位置 ${browserName} ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/cases/crossing/learn')
    const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
    const slider = page.getByRole('slider', { name: '教学步骤' })
    await expect(slider).toHaveValue('0')
    await waitForTraceCompletion(page)
    const last = Number(await slider.getAttribute('max'))
    expect(last).toBeGreaterThan(0)
    const positions = () => svg.locator('.teaching-labels text[data-input]:visible').evaluateAll(nodes => nodes.map(node => {
      const text = node as SVGTextElement
      const point = new DOMPoint(text.x.baseVal[0].value, text.y.baseVal[0].value).matrixTransform(text.getCTM()!)
      return { id: text.dataset.input!, x: point.x, y: point.y }
    }))
    const anchors = new Map<string, { id: string; x: number; y: number }>()
    let hoveredPositions = ''
    for (let step = 1; step <= last; step++) {
      await slider.focus()
      await page.keyboard.down('ArrowRight')
      await expect(slider).toHaveValue(String(step))
      const before = await positions()
      for (const position of before) {
        if (anchors.has(position.id)) expect(position, `S${position.id} moved at step ${step}`).toEqual(anchors.get(position.id))
        else anchors.set(position.id, position)
      }
      const positionKey = JSON.stringify(before)
      if (positionKey === hoveredPositions) continue
      hoveredPositions = positionKey
      await svg.scrollIntoViewIfNeeded()
      for (const position of before) {
        const label = svg.locator(`.teaching-labels text[data-input="${position.id}"]`)
        // WebKit's protocol box omits SVG text x/y; use the rendered DOM box
        // and a real pointer move, then verify the resulting hover state.
        const center = await label.evaluate(node => {
          const box = node.getBoundingClientRect()
          return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
        })
        await page.mouse.move(center.x, center.y)
        await expect(page.getByRole('status', { name: '画布对象详情' })).toContainText(`S${position.id} · 起点`)
        expect(await positions(), `hover moved labels at step ${step}`).toEqual(before)
        await page.getByRole('link', { name: '返回列表', exact: true }).hover()
        expect(await positions(), `leaving moved labels at step ${step}`).toEqual(before)
      }
    }
    await page.keyboard.up('ArrowRight')
    expect([...anchors.keys()].sort()).toEqual(['0', '1'])
    expect(anchors.get('0')!.y).not.toBe(anchors.get('1')!.y)
    await slider.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(slider).toHaveValue(String(last - 1))
    for (const position of await positions()) expect(position).toEqual(anchors.get(position.id))
    const trace = await readTrace(page, 'crossing')
    const intersection = stepIndex(trace, step => step.action === 'take' && step.current?.x.numerator === '2' && step.current.y.numerator === '2')
    await page.goto(`/cases/crossing/learn?step=${intersection}`)
    await expect(svg.locator('.teaching-labels text[data-input]:visible')).toHaveCount(2)
    for (const position of await positions()) expect(position).toEqual(anchors.get(position.id))
    if (browserName === 'chromium') await page.getByRole('region', { name: '几何视图' }).screenshot({ path: join(tmpdir(), `bo-labels-stable-${width}.png`) })
  })

  for (const width of [1920, 390]) browserTest(`教学标签：蜘蛛网按步骤显示且可读 ${browserName} ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    const trace = await readTrace(page, 'spider-web')
    await page.goto('/cases/spider-web/learn')
    const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
    await expect(page).toHaveTitle('蜘蛛网 · 逐步学习 · BO 结果查看器')
    await expect(svg.locator('.input')).toHaveCount(32)
    await expect(svg.locator('text:not(.tick):visible')).toHaveCount(0)
    if (browserName === 'chromium') await page.screenshot({ path: join(tmpdir(), `bo-labels-initial-${width}.png`), fullPage: true })
    const center = trace.steps.findIndex(step => step.action === 'take' && step.current?.x.numerator === '0' && step.current.y.numerator === '0')
    expect(center).toBeGreaterThan(0)
    await page.getByRole('button', { name: '下一个大步', exact: true }).click()
    await expect(page.locator('.code-line')).toHaveCount(2)
    await page.goto(`/cases/spider-web/learn?step=${center}`)
    await expect(svg.locator('.current-label')).toHaveCount(0)
    await expect(svg.locator('.current-point')).toBeVisible()
    await expect(svg).not.toContainText('当前事件')
    const participants = [...trace.steps[center].starts, ...trace.steps[center].ends, ...trace.steps[center].passes]
    await expect(svg.locator('.input[data-participant="true"]')).toHaveCount(participants.length)
    const related = [...new Set([...trace.steps[center].active, ...participants])]
    await expect(svg.locator('.teaching-labels text[data-related="true"]')).toHaveText(related.sort((a, b) => a - b).map(id => `S${id}`))
    for (const id of trace.steps[center].active) {
      await expect(svg.locator(`.teaching-labels text[data-input="${id}"]`)).toBeVisible()
    }
    await expect(svg).not.toContainText(/起点|终点|重叠区间/)
    await readableLabels(page)
    if (browserName === 'chromium') await page.screenshot({ path: join(tmpdir(), `bo-labels-current-${width}.png`), fullPage: true })
    // Inspecting a participant keeps every input label in its reserved slot.
    const inspectedId = participants[0]
    const placements = () => svg.locator('.teaching-labels text[data-input]').evaluateAll(nodes => nodes.map(node =>
      [node.getAttribute('transform'), node.getAttribute('visibility')]))
    const beforeHover = await placements()
    await page.getByRole('region', { name: '同点参与线段' }).getByText(`S${inspectedId}`, { exact: true }).hover()
    await expect(page.getByRole('status', { name: '画布对象详情' })).toContainText(`S${inspectedId} · 起点`)
    await expect(svg.locator(`.input[data-highlighted="true"][aria-label="输入 S${inspectedId}"]`)).toHaveCount(1)
    expect(await placements()).toEqual(beforeHover)
    await expect(svg.locator(`.teaching-labels text[data-input="${inspectedId}"]`)).toBeVisible()
    await page.getByRole('link', { name: '返回列表', exact: true }).hover()
    const label = svg.locator('.teaching-labels text[data-input]').first()
    const fontSize = await label.evaluate(node => getComputedStyle(node).fontSize)
    await page.getByRole('button', { name: '放大', exact: true }).click()
    await expect(label).toHaveCSS('font-size', fontSize)
    await readableLabels(page)
    await page.getByRole('button', { name: '缩小', exact: true }).click()
    await readableLabels(page)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  browserTest(`教学标签：触屏固定详情、拖动隔离和换步清理 ${browserName}`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width: 390, height: 1000 }, hasTouch: true })
    await expandedPanels(page.context())
    try {
      await page.goto('/cases/crossing/learn?step=5')
      const line = page.getByRole('img', { name: '输入 S0', exact: true }).locator('line')
      const point = await linePosition(line)
      await page.touchscreen.tap(point.x, point.y)
      const detail = page.getByRole('status', { name: '画布对象详情' })
      await expect(detail).toHaveAttribute('data-pinned', 'true')
      await expect(detail).toHaveText('S0 · 起点 (0, 0) · 终点 (4, 4)')
      await page.getByRole('link', { name: '返回列表', exact: true }).hover()
      await expect(detail).toBeVisible()
      const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
      await svg.scrollIntoViewIfNeeded()
      let bounds = (await svg.boundingBox())!
      await page.touchscreen.tap(bounds.x + bounds.width - 12, bounds.y + 12)
      await expect(detail).toHaveCount(0)
      const start = await linePosition(line)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 30, start.y + 20, { steps: 4 })
      await page.mouse.up()
      await page.getByRole('link', { name: '返回列表', exact: true }).hover()
      await expect(detail).toHaveCount(0)
      const afterPan = await linePosition(line)
      await page.touchscreen.tap(afterPan.x, afterPan.y)
      await expect(detail).toHaveAttribute('data-pinned', 'true')
      await expect(detail).toContainText('S0')
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      await expect(detail).toHaveCount(0)
      bounds = (await svg.boundingBox())!
      await expect(svg.locator('.current-label')).toHaveCount(0)
      await expect(svg.locator('.current-point')).toBeVisible()
      expect(bounds.width).toBeGreaterThan(0)
    } finally { await page.close() }
  })
}

test('教学标签：重叠默认高亮不弹详情，点击临时标签固定正确对象', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.ok())
  await page.goto('/cases/partial-overlap/learn')
  const { trace } = await readResponse(await response)
  const record = trace.steps.findIndex(step => step.action === 'record' && step.results.at(-1)?.geometry.type === 'overlap')
  expect(record).toBeGreaterThan(0)
  await page.goto(`/cases/partial-overlap/learn?step=${record}`)
  const detail = page.getByRole('status', { name: '画布对象详情' })
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(page.locator('.drawing .input[data-highlighted="true"]')).toHaveCount(2)
  await expect(detail).toHaveCount(0)
  const segment = page.getByRole('img', { name: '输入 S1', exact: true }).locator('line')
  const point = await linePosition(segment, 0.85)
  await page.mouse.move(point.x, point.y)
  await expect(detail).toContainText('S1 · 起点')
  await page.locator('.teaching-labels text[data-input="1"]').click()
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(detail).toHaveAttribute('data-pinned', 'true')
  await expect(detail).toHaveText('S1 · 起点 (2, 0) · 终点 (6, 0)')
  await page.keyboard.press('Escape')
  await expect(detail).toHaveCount(0)
  await expect(page.locator('.drawing .input[data-highlighted="true"]')).toHaveCount(2)
  await page.goto('/cases/crossing/learn')
  const transient = await linePosition(page.getByRole('img', { name: '输入 S1', exact: true }).locator('line'))
  await page.mouse.move(transient.x, transient.y)
  await page.locator('.teaching-labels text[data-input="1"]').click()
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(detail).toHaveAttribute('data-pinned', 'true')
  await expect(detail).toContainText('S1 · 起点 (0, 4)')
})
