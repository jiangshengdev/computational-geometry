import { expect, test, type Locator } from '../support/learning-test'
import { readResponse, readTrace, seekStep, stepIndex, waitForTraceCompletion } from '../support/trace-navigation'

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

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`教学标签：编号跨步骤可访问且悬停显示详情 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1000 })
    const trace = await readTrace(page, 'crossing')
    await page.goto('/bo/cases/crossing/learn')
    const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
    const slider = page.getByRole('slider', { name: '教学步骤' })
    await expect(slider).toHaveValue('0')
    await waitForTraceCompletion(page)
    const visited = new Set<string>()
    let hoveredIds = ''
    let previousState = ''
    for (const [index, step] of trace.steps.entries()) {
      const state = JSON.stringify([step.current, step.active, step.starts, step.ends, step.passes,
        step.action === 'check' || step.action === 'discover' ? step.subjects : []])
      if (state === previousState) continue
      previousState = state
      await seekStep(page, index, 'jump')
      const ids = await svg.locator('.teaching-labels text[data-input]:visible').evaluateAll(nodes =>
        nodes.map(node => (node as SVGTextElement).dataset.input!))
      const idsKey = JSON.stringify(ids)
      if (idsKey === hoveredIds) continue
      hoveredIds = idsKey
      await svg.scrollIntoViewIfNeeded()
      for (const id of ids) {
        visited.add(id)
        const label = svg.locator(`.teaching-labels text[data-input="${id}"]`)
        // WebKit's protocol box omits SVG text x/y; use the rendered DOM box
        // and a real pointer move, then verify the resulting hover state.
        const center = await label.evaluate(node => {
          const box = node.getBoundingClientRect()
          return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
        })
        await page.mouse.move(center.x, center.y)
        await expect(page.getByRole('status', { name: '画布对象详情' })).toContainText(`S${id} · 起点`)
        await page.getByRole('link', { name: '返回列表', exact: true }).hover()
      }
    }
    expect([...visited].sort()).toEqual(['0', '1'])
    const intersection = stepIndex(trace, step => step.action === 'take' && step.current?.x.numerator === '2' && step.current.y.numerator === '2')
    await page.goto(`/bo/cases/crossing/learn?step=${intersection}`)
    await expect(svg.locator('.teaching-labels text[data-input]:visible')).toHaveCount(2)
  })

  browserTest(`教学标签：蜘蛛网按步骤显示且可读 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1000 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    const trace = await readTrace(page, 'spider-web')
    await page.goto('/bo/cases/spider-web/learn')
    const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
    await expect(page).toHaveTitle('蜘蛛网 · 逐步学习 · BO 结果查看器')
    await expect(svg.locator('.input')).toHaveCount(32)
    await expect(svg.locator('text:not(.tick):visible')).toHaveCount(0)
    const center = trace.steps.findIndex(step => step.action === 'take' && step.current?.x.numerator === '0' && step.current.y.numerator === '0')
    expect(center).toBeGreaterThan(0)
    await page.goto(`/bo/cases/spider-web/learn?step=${center}`)
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
    const inspectedId = participants[0]
    await page.getByRole('region', { name: '同点参与线段' }).getByText(`S${inspectedId}`, { exact: true }).hover()
    await expect(page.getByRole('status', { name: '画布对象详情' })).toContainText(`S${inspectedId} · 起点`)
    await expect(svg.locator(`.input[data-highlighted="true"][aria-label="输入 S${inspectedId}"]`)).toHaveCount(1)
    await expect(svg.locator(`.teaching-labels text[data-input="${inspectedId}"]`)).toBeVisible()
    await page.getByRole('link', { name: '返回列表', exact: true }).hover()
    await page.getByRole('button', { name: '放大', exact: true }).click()
    await expect(svg.locator(`.teaching-labels text[data-input="${inspectedId}"]`)).toBeVisible()
    await page.getByRole('button', { name: '缩小', exact: true }).click()
    await expect(svg.locator(`.teaching-labels text[data-input="${inspectedId}"]`)).toBeVisible()
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

}

test('教学标签：重叠默认高亮不弹详情，点击临时标签固定正确对象', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/bo/intersections') && response.ok())
  await page.goto('/bo/cases/partial-overlap/learn')
  const { trace } = await readResponse(await response)
  const record = trace.steps.findIndex(step => step.action === 'record' && step.results.at(-1)?.geometry.type === 'overlap')
  expect(record).toBeGreaterThan(0)
  await page.goto(`/bo/cases/partial-overlap/learn?step=${record}`)
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
  await page.goto('/bo/cases/crossing/learn')
  const transient = await linePosition(page.getByRole('img', { name: '输入 S1', exact: true }).locator('line'))
  await page.mouse.move(transient.x, transient.y)
  await page.locator('.teaching-labels text[data-input="1"]').click()
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(detail).toHaveAttribute('data-pinned', 'true')
  await expect(detail).toContainText('S1 · 起点 (0, 4)')
})
