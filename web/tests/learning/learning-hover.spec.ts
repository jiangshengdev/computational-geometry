import { expect, test, type Locator, type Page } from '../support/learning-test'
import { selectPreset } from '../support/cases'
import { readTrace, seekStep, stepIndex } from '../support/trace-navigation'

async function center(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded()
  const box = (await target.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
}

async function endpoint(page: Page, line: Locator, end: 'start' | 'end') {
  await line.scrollIntoViewIfNeeded()
  const point = await line.evaluate((element, end) => {
    const line = element as SVGLineElement
    const point = new DOMPoint(end === 'start' ? line.x1.baseVal.value : line.x2.baseVal.value,
      end === 'start' ? line.y1.baseVal.value : line.y2.baseVal.value).matrixTransform(line.getScreenCTM()!)
    return { x: point.x, y: point.y }
  }, end)
  await page.mouse.move(point.x, point.y)
}

test('教学 hover：操作解释中的事件点和独立线段双向联动', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 })
  await page.goto('/bo/cases/crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const explanation = page.getByRole('region', { name: '操作解释' })
  const diagram = page.getByRole('region', { name: '几何视图' })
  const current = page.getByRole('region', { name: '当前事件' })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const active = page.getByTestId('active-order')
  const trace = await readTrace(page, 'crossing')
  const discovery = stepIndex(trace, step => step.action === 'discover')
  const cases = [
    { step: stepIndex(trace, step => step.action === 'take'), point: 'S0 起点 (0, 0)', lines: [] },
    { step: stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(0)), lines: ['S0'] },
    { step: stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(1)), lines: ['S1'] },
    { step: stepIndex(trace, step => step.action === 'check'), lines: ['S0', 'S1'], separator: '×' },
    { step: discovery, point: 'I0 (2, 2)', lines: ['S0', 'S1'], separator: '×' },
    { step: stepIndex(trace, step => step.action === 'take' && step.current?.x.numerator === '2' && step.current.y.numerator === '2'), point: 'I0 (2, 2)', lines: [] },
    { step: stepIndex(trace, step => step.action === 'record'), point: 'I0 (2, 2)', lines: ['S0', 'S1'], separator: '×' },
    { step: stepIndex(trace, step => step.action === 'reorder'), lines: ['S1', 'S0'], separator: '→' },
    { step: stepIndex(trace, step => step.action === 'remove' && step.subjects.includes(1)), lines: ['S1'] },
  ]
  let index = 0
  for (const scenario of cases) {
    while (index < scenario.step) { await next.click(); index++ }
    if (scenario.point) {
      const token = explanation.getByText(scenario.point, { exact: true })
      const entry = (index === discovery ? queue : current).getByText(scenario.point, { exact: true })
      await entry.hover()
      await expect(token).toHaveAttribute('data-highlighted', 'true')
      await token.hover()
      await expect(entry).toHaveAttribute('data-highlighted', 'true')
      await expect(diagram.locator('.hover-event')).toHaveCount(1)
      await expect(diagram.locator('.input[data-highlighted="true"]')).toHaveCount(0)
      const coordinates = scenario.point.slice(scenario.point.indexOf('('))
      const label = diagram.locator(`.teaching-labels [data-event-point="${coordinates}"]`)
      await expect(diagram.getByRole('status', { name: '画布对象详情' })).toContainText(scenario.point)
      await expect(label).toHaveText(coordinates)
      await label.hover()
      await expect(token).toHaveAttribute('data-highlighted', 'true')
    }
    for (const name of scenario.lines) {
      const token = explanation.getByText(name, { exact: true })
      const input = page.getByRole('img', { name: `输入 ${name}`, exact: true })
      await token.hover()
      await expect(input).toHaveAttribute('data-highlighted', 'true')
      await expect(diagram.locator('.input[data-highlighted="true"]')).toHaveCount(1)
      await expect(explanation.locator('[data-highlighted="true"]')).toHaveText(name)
      await expect(diagram.locator('.hover-event')).toHaveCount(0)
      // Exiting rows no longer belong to the current active set.
      const entry = active.getByRole('listitem').filter({ hasText: new RegExp(`^${name}$`) })
      if (await entry.count()) {
        await expect(entry).toHaveAttribute('data-highlighted', 'true')
        await entry.hover()
        await expect(token).toHaveAttribute('data-highlighted', 'true')
      }
      const line = input.locator('line')
      // Stay away from the crossing and endpoints so this hits the segment body.
      await line.scrollIntoViewIfNeeded()
      const box = (await line.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * (name === 'S0' ? 0.75 : 0.25))
      await expect(token).toHaveAttribute('data-highlighted', 'true')
    }
    if (scenario.separator) {
      await explanation.getByText(scenario.separator, { exact: true }).hover()
      await expect(explanation.locator('[data-highlighted="true"]')).toHaveCount(0)
      await expect(diagram.locator('.input[data-highlighted="true"]')).toHaveCount(0)
    }
    await next.focus()
    await explanation.locator('.learning-hover-item').first().hover()
    await page.keyboard.press('Enter')
    index++
    await expect(page.locator('.learning-hover-item[data-highlighted="true"]')).toHaveCount(0)
    await expect(diagram.locator('.hover-event')).toHaveCount(0)
  }
})

test('教学 hover：队列端点与点标签精确双向对应', async ({ page }) => {
  await page.goto('/bo/cases/crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const diagram = page.getByRole('region', { name: '几何视图' })
  const input = page.getByRole('img', { name: '输入 S1', exact: true })
  const entry = queue.getByText('S1 起点 (0, 4)', { exact: true })
  const label = diagram.locator('.teaching-labels [data-event-point="(0, 4)"]')
  await entry.hover()
  await expect(label).toBeVisible()
  const ring = diagram.locator('.hover-event')
  await expect(ring).toHaveAttribute('cx', await input.locator('line').getAttribute('x1') as string)
  await expect(ring).toHaveAttribute('cy', await input.locator('line').getAttribute('y1') as string)
  await expect(diagram.locator('.input[data-highlighted="true"]')).toHaveCount(0)
  await expect(queue.locator('[data-highlighted="true"]')).toHaveText('S1 起点 (0, 4)')
  await label.hover()
  await expect(entry).toHaveAttribute('data-highlighted', 'true')
  await endpoint(page, input.locator('line'), 'end')
  await expect(queue.locator('[data-highlighted="true"]')).toHaveText('S1 终点 (4, 0)')
  await expect(diagram.getByRole('status', { name: '画布对象详情' })).toContainText('S1 终点 (4, 0)')
  await diagram.locator('.teaching-labels [data-event-point="(4, 0)"]').hover()
  await expect(queue.locator('[data-highlighted="true"]')).toHaveText('S1 终点 (4, 0)')
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(ring).toHaveCount(0)
  await expect(label).toHaveCount(0)
  await expect(queue.locator('[data-highlighted="true"]')).toHaveCount(0)
})

test('教学 hover：当前交点与待处理交点均按悬停显示坐标标签', async ({ page }) => {
  await page.goto('/bo/cases/crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const trace = await readTrace(page, 'crossing')
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const current = page.getByRole('region', { name: '当前事件' })
  const diagram = page.getByRole('region', { name: '几何视图' })
  await seekStep(page, stepIndex(trace, step => step.action === 'discover'))
  const pending = page.getByRole('img', { name: '已发现 I0 (2, 2)' })
  const dashed = pending.locator('circle')
  await queue.getByText('I0 (2, 2)', { exact: true }).hover()
  const pointLabel = diagram.locator('.teaching-labels [data-event-point="(2, 2)"]')
  await expect(pointLabel).toBeVisible()
  await expect(diagram.locator('.hover-event')).toHaveAttribute('cx', await dashed.getAttribute('cx') as string)
  await center(page, dashed)
  await expect(queue.locator('[data-highlighted="true"]')).toHaveText('I0 (2, 2)')
  await pointLabel.hover()
  await expect(queue.locator('[data-highlighted="true"]')).toHaveText('I0 (2, 2)')
  await expect(diagram.locator('.input[data-highlighted="true"]')).toHaveCount(0)
  await expect(page.getByTestId('active-order').locator('[data-highlighted="true"]')).toHaveCount(0)
  // Bind the intersection before recording it, through the actual intervening steps.
  await seekStep(page, stepIndex(trace, step => step.action === 'take' && step.current?.x.numerator === '2' && step.current.y.numerator === '2'))
  await expect(queue).not.toContainText('I0')
  await expect(diagram.locator('.hover-event')).toHaveCount(0)
  const marker = diagram.locator('.current-point')
  const lineStyle = await diagram.locator('.sweep-line').getAttribute('x1')
  await expect(pointLabel).toHaveCount(0)
  await current.getByText('I0 (2, 2)', { exact: true }).hover()
  await expect(pointLabel).toHaveText('(2, 2)')
  await expect(pointLabel).toBeVisible()
  await expect(diagram.locator('.hover-event')).toHaveCount(1)
  await expect(diagram.locator('.sweep-line')).toHaveAttribute('x1', lineStyle as string)
  await center(page, marker)
  await expect(current.locator('[data-highlighted="true"]')).toHaveText('I0 (2, 2)')
  await expect(pointLabel).toHaveText('(2, 2)')
  await pointLabel.hover()
  await expect(current.locator('[data-highlighted="true"]')).toHaveText('I0 (2, 2)')
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(pointLabel).toHaveCount(0)
  await seekStep(page, stepIndex(trace, step => step.action === 'record')) // Recording keeps the label hidden until the next hover.
  await expect(pointLabel).toHaveCount(0)
  await center(page, marker)
  await expect(pointLabel).toHaveText('(2, 2)')
  await expect(pointLabel).toBeVisible()
  await expect(current.locator('[data-highlighted="true"]')).toHaveText('I0 (2, 2)')
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(pointLabel).toHaveCount(0)
})

for (const preset of ['crossing', 'disjoint']) {
  test(`教学 hover：${preset} 导航清理与可见对象隔离`, async ({ page }) => {
    await page.goto('/bo/cases/crossing')
    await selectPreset(page, preset)
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    const queue = page.getByRole('region', { name: '待处理事件队列' })
    const current = page.getByRole('region', { name: '当前事件' })
    const diagram = page.getByRole('region', { name: '几何视图' })
    const ring = diagram.locator('.hover-event')
    const emptyHover = async () => {
      await expect(ring).toHaveCount(0)
      await expect(page.locator('.learning-hover-item[data-highlighted="true"]')).toHaveCount(0)
    }
    // Keyboard activation leaves the pointer on the event, proving navigation itself clears it.
    await next.focus()
    await queue.getByText('S0 起点 (0, 0)', { exact: true }).hover()
    await expect(ring).toHaveCount(1)
    await page.keyboard.press('Enter')
    await emptyHover()
    await next.click()
    await next.click()
    await previous.focus()
    await current.getByText('S0 起点 (0, 0)', { exact: true }).hover()
    await page.keyboard.press('Enter')
    await emptyHover()
    await previous.click()
    await slider.focus()
    await queue.getByText('S0 起点 (0, 0)', { exact: true }).hover()
    await page.keyboard.press('End')
    await emptyHover()
    await expect(queue).toContainText('空')
    await expect(page.getByTestId('active-order')).toHaveText('空')
    await endpoint(page, page.getByRole('img', { name: '输入 S0', exact: true }).locator('line'), 'start')
    await expect(ring).toHaveCount(1)
    await expect(page.locator('.learning-hover-item[data-highlighted="true"]')).toHaveCount(0)
    await page.keyboard.press('Home')
    await emptyHover()
    await expect(queue).not.toContainText('I0')
    await expect(diagram.locator('.intersection, .scheduled-point')).toHaveCount(0)
    // The not-yet-discovered crossing must not become an event through hit tolerance.
    await center(page, page.getByRole('img', { name: '输入 S0', exact: true }).locator('line'))
    await expect(ring).toHaveCount(0)
    await expect(page.getByRole('region', { name: /^(当前事件|待处理事件队列)$/ }).locator('[data-highlighted="true"]')).toHaveCount(0)
    for (let i = 0; i < 3; i++) await next.click()
    await page.getByRole('button', { name: '重新开始', exact: true }).focus()
    await current.getByText('S0 起点 (0, 0)', { exact: true }).hover()
    await page.keyboard.press('Enter')
    await emptyHover()
    await queue.getByText('S0 起点 (0, 0)', { exact: true }).hover()
    await selectPreset(page, preset === 'crossing' ? 'disjoint' : 'crossing')
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    await emptyHover()
    await expect(slider).toHaveValue('0')
  })
}

test('教学 hover：缩放平移后的点、标签与线段命中', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto('/bo/cases/crossing')
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const trace = await readTrace(page, 'crossing')
  await seekStep(page, stepIndex(trace, step => step.action === 'discover'))
  await page.setViewportSize({ width: 1360, height: 1000 })
  await page.getByRole('button', { name: '重置视图' }).click()
  await page.getByRole('button', { name: '放大', exact: true }).click()
  const svg = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
  await svg.scrollIntoViewIfNeeded()
  const box = (await svg.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 200)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + 215)
  await page.mouse.up()
  const pending = page.getByRole('img', { name: '已发现 I0 (2, 2)' })
  await center(page, pending.locator('circle'))
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  await expect(queue.locator('[data-highlighted="true"]')).toHaveText('I0 (2, 2)')
  const pointLabel = svg.locator('.teaching-labels [data-event-point="(2, 2)"]')
  await expect(pointLabel).toBeVisible()
  await pointLabel.hover()
  await expect(queue.locator('[data-highlighted="true"]')).toHaveText('I0 (2, 2)')
  const line = (await page.getByRole('img', { name: '输入 S1', exact: true }).locator('line').boundingBox())!
  await page.mouse.move(line.x + line.width * 0.35, line.y + line.height * 0.35)
  await expect(page.getByTestId('active-order').locator('[data-highlighted="true"]')).toHaveText('S1')
  await expect(svg.locator('.hover-event')).toHaveCount(0)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('教学 hover：活动顺序的单个标识与线段独立联动', async ({ page }) => {
  await page.goto('/bo/cases/crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const order = page.getByTestId('active-order')
  while (await order.getByRole('listitem').count() < 2) await next.click()
  await expect(order.getByRole('listitem')).toHaveText(['S0', 'S1'])
  const segment = page.getByRole('img', { name: '输入 S1', exact: true })
  const line = segment.locator('line')
  const panels = page.locator('.learning-panel')
  const content = await panels.allInnerTexts()
  await order.getByText('S1', { exact: true }).hover()
  await expect(segment).toHaveAttribute('data-highlighted', 'true')
  await expect(segment).toHaveAttribute('data-active', 'true')
  await expect(page.locator('.drawing .hover-event')).toHaveCount(0)
  await expect(page.getByRole('region', { name: /^(当前事件|待处理事件队列)$/ }).locator('[data-highlighted="true"]')).toHaveCount(0)
  await expect(page.locator('.drawing text[data-event-point][data-highlighted="true"]')).toHaveCount(0)
  await expect(panels).toHaveText(content, { useInnerText: true })
  const point = await line.evaluate(element => {
    const segment = element as SVGLineElement
    for (const fraction of [0.25, 0.75, 0.4, 0.6]) {
      const point = new DOMPoint(
        segment.x1.baseVal.value + (segment.x2.baseVal.value - segment.x1.baseVal.value) * fraction,
        segment.y1.baseVal.value + (segment.y2.baseVal.value - segment.y1.baseVal.value) * fraction,
      ).matrixTransform(segment.getScreenCTM()!)
      if (document.elementFromPoint(point.x, point.y) === segment) return { x: point.x, y: point.y }
    }
    throw new Error('线段没有可直接悬停的位置')
  })
  await page.mouse.move(point.x, point.y)
  await expect(order.locator('[data-highlighted="true"]')).toHaveText('S1')
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(order.locator('[data-highlighted="true"]')).toHaveCount(0)
})
