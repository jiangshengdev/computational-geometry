import { expect, test } from '../support/learning-test'
import { selectPreset } from '../../support/cases'
import { readTrace, seekStep, stepIndex, waitForTraceCompletion } from '../support/trace-navigation'

test('重叠教学：区间边界、事件状态、完整结果与重启', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/bo/cases/crossing')
  await selectPreset(page, 'partial-overlap')
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toBeVisible()
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const active = page.getByTestId('active-order')
  const explanation = page.getByRole('region', { name: '操作解释' })
  const interval = page.getByRole('img', { name: '交集 S0 × S1', exact: true })
  const trace = await readTrace(page, 'partial-overlap')
  await waitForTraceCompletion(page)
  await page.getByRole('button', { name: '说明与帮助', exact: true }).click()
  await page.getByRole('tab', { name: '重叠处理规则', exact: true }).click()
  await expect(page.getByRole('region', { name: '重叠处理规则' })).toContainText('不是上下交换')
  await page.getByRole('button', { name: '关闭帮助', exact: true }).click()
  await expect(queue.locator('li')).toHaveText([
    'S0 起点 (0, 0)', 'S1 起点 (2, 0)', 'S0 终点 (4, 0)', 'S1 终点 (6, 0)',
  ])
  await expect(interval).toHaveCount(0)
  let recorded = false
  let ended = false
  const completed: string[] = []
  for (const [index, step] of trace.steps.entries()) {
    if (!['record', 'remove', 'complete'].includes(step.action)) continue
    await seekStep(page, index, 'jump')
    const event = await current.locator('[data-event-id]:not([aria-hidden="true"])').innerText()
    if ((await explanation.innerText()).includes('记录重叠区间')) {
      recorded = true
      await expect(current).toContainText('(2, 0)')
      await expect(current).toContainText('重叠起界')
      await expect(explanation).toContainText('(2, 0) → (4, 0)')
      await expect(explanation).toContainText('S0 × S1')
      await expect(explanation).toContainText('不是只记录当前端点')
      await expect(active).toHaveText('S0')
      await expect(queue.locator('li')).toHaveText(['S0 终点 (4, 0) · 重叠止界', 'S1 终点 (6, 0)'])
      await expect(interval.locator('circle')).toHaveCount(2)
      // Independent geometry: [0,4] ∩ [2,6] = [2,4]. Its length is half S0.
      const input = page.getByRole('img', { name: '输入 S0', exact: true }).locator('line')
      const x0 = Number(await input.getAttribute('x1'))
      const x4 = Number(await input.getAttribute('x2'))
      const line = interval.locator('line')
      expect(Number(await line.getAttribute('x1'))).toBeCloseTo((x0 + x4) / 2)
      expect(Number(await line.getAttribute('x2'))).toBeCloseTo(x4)
      expect(await line.getAttribute('y1')).toBe(await input.getAttribute('y1'))
      expect(await line.getAttribute('y2')).toBe(await input.getAttribute('y2'))
      for (const id of [0, 1]) await expect(page.getByRole('img', { name: `输入 S${id}`, exact: true })).toHaveAttribute('data-highlighted', 'true')
    }
    if ((await explanation.innerText()).includes('此处是重叠止界')) {
      ended = true
      await expect(current).toContainText('(4, 0)')
      await expect(active).toHaveText('S1')
      await expect(explanation).toContainText('不再把止界重复记成孤立交点')
    }
    if (step.action === 'complete') {
      for (const [point, ids] of [['(0, 0)', ['S0']], ['(2, 0)', ['S0', 'S1']], ['(4, 0)', ['S1']], ['(6, 0)', []]] as const) {
        if (!event.includes(point)) continue
        completed.push(point)
        // Tied list positions are not a geometric above/below ordering.
        await expect.poll(async () => (await active.getByRole('listitem').allTextContents()).sort()).toEqual([...ids])
      }
    }
    await expect(interval).toHaveCount(recorded ? 1 : 0)
  }
  expect(recorded).toBe(true)
  expect(ended).toBe(true)
  expect(completed).toEqual(['(0, 0)', '(2, 0)', '(4, 0)', '(6, 0)'])
  await seekStep(page, trace.steps.length - 1, 'jump')
  const result = page.getByRole('region', { name: '学习结果' })
  await expect(result).toContainText('重叠区间：1')
  await expect(result).toContainText('(2, 0) → (4, 0)：S0 × S1')
  await expect(result).not.toContainText('结果为空')
  await expect(queue).toContainText('空')
  await expect(active).toHaveText('空')
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(current).toContainText('尚未处理事件')
  await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
})

test('重叠教学：边界与并列状态可读', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1360, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto('/bo/cases/crossing')
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await expect(page).toHaveURL('/bo/cases/crossing')
  await selectPreset(page, 'partial-overlap')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const current = page.getByRole('region', { name: '当前事件' })
  const trace = await readTrace(page, 'partial-overlap')
  await waitForTraceCompletion(page)
  await seekStep(page, stepIndex(trace, step => step.action === 'complete' && step.current?.x.numerator === '2'), 'jump')
  await expect(current).toContainText('重叠起界')
  await page.getByRole('button', { name: '说明与帮助', exact: true }).click()
  await page.getByRole('tab', { name: '活动线段顺序', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('region', { name: '活动线段顺序' })).toContainText('不表示它们之间存在上下差别')
  await page.getByRole('button', { name: '关闭帮助', exact: true }).click()
  await expect(page.getByRole('region', { name: '待处理事件队列' }).locator('li')).toHaveText(['S0 终点 (4, 0) · 重叠止界', 'S1 终点 (6, 0)'])
  await page.getByRole('button', { name: '说明与帮助', exact: true }).click()
  await page.getByRole('tab', { name: '重叠处理规则', exact: true }).click()
  await expect(page.getByRole('region', { name: '重叠处理规则' })).toContainText('不是任意重叠输入的生产级实现保证')
  await page.getByRole('tab', { name: '参考资料', exact: true }).click()
  await expect(page.getByRole('region', { name: '学习参考' }).getByRole('link', { name: /CGAL/ })).toHaveCount(2)
  await page.getByRole('button', { name: '关闭帮助', exact: true }).click()
  const drawing = page.getByRole('region', { name: '几何视图' })
  const overlap = drawing.getByRole('img', { name: '交集 S0 × S1', exact: true }).locator('line')
  await overlap.scrollIntoViewIfNeeded()
  const overlapCenter = await overlap.evaluate(element => {
    const line = element as SVGLineElement
    const point = new DOMPoint((line.x1.baseVal.value + line.x2.baseVal.value) / 2,
      (line.y1.baseVal.value + line.y2.baseVal.value) / 2).matrixTransform(line.getScreenCTM()!)
    return { x: point.x, y: point.y }
  })
  await page.mouse.move(overlapCenter.x, overlapCenter.y)
  await expect(drawing.getByRole('status', { name: '画布对象详情' })).toHaveText('重叠区间 S0 × S1 · (2, 0) → (4, 0)')
  await page.getByRole('heading', { name: '活动线段顺序', exact: true }).hover()
  const markers = drawing.getByRole('img', { name: /^活动线段 / })
  await expect(markers).toHaveCount(2)
  const centers = await markers.locator('circle').evaluateAll(elements => elements.map(element => [element.getAttribute('cx'), element.getAttribute('cy')]))
  expect(centers[0]).toEqual(centers[1])
  await page.mouse.move(0, 0)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})
