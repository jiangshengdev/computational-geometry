import { expect, test } from './learning-test'
import type { SweepTrace } from '../src/geometry'
import { readResponse, readTrace } from './trace-navigation'
import { variableValue } from '../src/executionSymbols'

test('遮蔽状态对入参与局部变量使用一致文案，其他不可用状态保持独立', () => {
  for (const name of ['segments', 'local']) {
    expect(variableValue({ name, type: 'usize', availability: 'shadowed', value: 0 }, ['7']))
      .toBe('7（已遮蔽，遮蔽前的最后值）')
  }
  expect(variableValue({ name: 'point', type: 'Point', availability: 'unavailable', value: null }, []))
    .toBe('不可用（当前作用域未提供）')
})

test('被遮蔽的入参保留原坐标最后值，前进回退不混入扫描线段', async ({ page }) => {
  const trace = await readTrace(page, 'vertical-overlap')
  const expected = '[Segment { start: (1/2, -1/3), end: (1/2, 5/3) }, Segment { start: (1/2, 1/3), end: (1/2, 7/3) }]'
  for (const step of trace.steps.filter(step => step.execution.context.function === 'sweep')) {
    const input = step.execution.context.parameters.find(variable => variable.name === 'segments')!
    expect(input.availability).toBe('shadowed')
    expect(trace.values[input.value!]).toBe(expected)
  }
  const index = trace.steps.findIndex(step => step.action === 'take-entry')
  await page.goto(`/cases/vertical-overlap/learn?step=${index}`)
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  const segments = variables.getByTestId('variable-segments')
  await expect(segments).toHaveCount(2)
  const input = segments.filter({ hasText: 'segments: &[Segment]' }).locator('dd')
  const local = segments.filter({ hasText: 'segments: Vec<SweepSegment>' }).locator('dd')
  await expect(input).toHaveText(`${expected}（已遮蔽，遮蔽前的最后值）`)
  await expect(local).toContainText('SweepSegment')
  await expect(local).not.toContainText('已遮蔽')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(input).toHaveText(`${expected}（已遮蔽，遮蔽前的最后值）`)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(input).toHaveText(`${expected}（已遮蔽，遮蔽前的最后值）`)
})

for (const id of ['crossing', 'partial-overlap', 'multiway-interior']) {
  test(`交集实参与核心变量使用一致的简写：${id}`, async ({ page }) => {
    const trace = await readTrace(page, id)
    const index = trace.steps.findLastIndex(step => step.execution.module === 'record' && step.execution.boundary === 14)
    expect(index).toBeGreaterThan(0)
    const step = trace.steps[index]
    const call = step.execution.calls.find(call => call.function === 'push')!
    const argument = call.arguments.find(argument => argument.name === 'value')!
    const receiver = call.arguments.find(argument => argument.name === 'self')!
    const result = step.execution.context.locals.find(variable => variable.name === 'result')!
    const previousResult = trace.steps[index - 1].execution.context.locals.find(variable => variable.name === 'result')!
    const value = trace.values[argument.value!]
    expect(value).toMatch(/^S\d+ × S\d+: \(/)
    expect(trace.values[receiver.value!]).toBe(trace.values[previousResult.value!])
    expect(trace.values[result.value!]).toContain(value)
    if (id === 'partial-overlap') expect(value).toContain(' → ')
    if (id === 'multiway-interior') expect(trace.values[receiver.value!]).not.toBe('[]')
    await page.goto(`/cases/${id}/learn?step=${index}`)
    const variables = page.getByRole('region', { name: '核心变量', exact: true })
    const panel = page.getByRole('region', { name: '核心代码回放' })
    await expect(variables.getByTestId('variable-result').locator('dd')).toHaveText(trace.values[result.value!])
    await expect(panel.getByRole('img', { name: /执行边界/ })).toBeInViewport()
    await panel.locator('[data-symbol="push"]').hover()
    const tooltip = page.getByRole('tooltip', { name: /^函数 push / })
    await expect(tooltip).toContainText(`实参 value：${value}`)
    await expect(tooltip).toContainText(`实参 self：${trace.values[previousResult.value!]}`)
    const argumentsText = tooltip.locator('p').filter({ hasText: /^实参 / })
    await expect(argumentsText).toHaveText([
      `实参 self：${trace.values[previousResult.value!]}`,
      `实参 value：${value}`,
    ])
    await variables.getByRole('heading', { name: '核心变量', exact: true }).hover()
    await expect(tooltip).toBeHidden()
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(variables.getByTestId('variable-result').locator('dd')).toHaveText(trace.values[previousResult.value!])
    await panel.locator('[data-symbol="push"]').hover()
    await expect(tooltip).toContainText('实参 value：未赋值')
    await expect(tooltip).toContainText(`实参 self：${trace.values[previousResult.value!]}`)
  })
}

test('真实取事件代码 hover 随前进和回退更新且不改变布局', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/intersections'))
  await page.goto('/cases/crossing/learn')
  const { trace }: { trace: SweepTrace } = await readResponse(await response)
  await page.getByRole('button', { name: '下一个大步', exact: true }).click()
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const lines = panel.locator('.code-line')
  await expect(lines).toHaveCount(2)
  const layout = () => lines.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }))
  const before = await layout()
  const next = panel.locator('[data-symbol="next"]').first()
  const queue = panel.locator('[data-symbol="queue"]')
  const pop = panel.locator('[data-symbol="pop_first"]')
  const variableTooltip = page.getByRole('tooltip', { name: /^变量 next / })
  const popTooltip = page.getByRole('tooltip', { name: /^函数 pop_first / })
  await next.hover()
  await expect(variableTooltip).toContainText('未赋值')
  expect(await layout()).toEqual(before)
  await pop.hover()
  await expect(popTooltip).toContainText('返回值：未赋值')
  await queue.hover()
  const entry = trace.steps.find(step => step.action === 'take-entry')!
  const queueValue = entry.execution.context.locals.find(variable => variable.name === 'queue')!
  await expect(page.getByRole('tooltip', { name: /^变量 queue / })).toContainText(trace.values[queueValue.value!])
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await next.hover()
  await expect(variableTooltip).toContainText('(0, 0)')
  await expect(variableTooltip).toContainText('本步变化')
  await pop.hover()
  await expect(popTooltip).toContainText('Some')
  await expect(popTooltip).not.toContainText('尚未调用')
  expect(await layout()).toEqual(before)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await next.hover()
  await expect(variableTooltip).toContainText('未赋值')
  await pop.hover()
  await expect(popTooltip).toContainText('返回值：未赋值')
  await page.getByRole('button', { name: '下一个大步', exact: true }).click()
  await expect(panel).toContainText('参与线段分类')
  await expect(panel.locator('[data-symbol="pop_first"]')).toHaveCount(0)
  await panel.locator('[data-symbol="incident"]').first().hover()
  await expect(page.getByRole('tooltip', { name: /^变量 incident / })).toContainText('未赋值')
})

test('分类同名 id 按词法循环隔离，真实调用按行和函数展示返回值', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/intersections'))
  await page.goto('/cases/crossing/learn')
  const { trace }: { trace: SweepTrace } = await readResponse(await response)
  const secondLoop = trace.steps.findIndex(step => step.execution.module === 'classify' && step.execution.boundary === 8 && step.execution.context.locals.some(variable => variable.name === 'id' && variable.availability === 'available'))
  expect(secondLoop).toBeGreaterThan(0)
  await page.goto(`/cases/crossing/learn?step=${secondLoop}`)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const firstTooltip = page.getByRole('tooltip', { name: /^变量 id .*作用域：活动线段循环/ })
  const secondTooltip = page.getByRole('tooltip', { name: /^变量 id .*作用域：参与线段循环/ })
  // Highlight loading positions the viewport at boundary 8. Wait for that
  // navigation before scrolling back to the other loop's binding.
  await expect(panel.getByRole('img', { name: '执行边界：参与线段分类 8', exact: true })).toBeInViewport()
  const firstId = panel.locator('[data-symbol="id"][data-line="3"]').first()
  await firstId.scrollIntoViewIfNeeded()
  await firstId.hover()
  await expect(firstTooltip).toContainText('作用域：活动线段循环')
  await expect(firstTooltip).toContainText('当前值：不可用（当前作用域未提供）')
  const secondId = panel.locator('[data-symbol="id"][data-line="8"]')
  await secondId.scrollIntoViewIfNeeded()
  await secondId.hover()
  const id = trace.steps[secondLoop].execution.context.locals.find(variable => variable.name === 'id')!
  await expect(secondTooltip).toContainText('作用域：参与线段循环')
  await expect(secondTooltip).toContainText(`当前值：${trace.values[id.value!]}`)

  const calculated = trace.steps.findIndex(step => step.execution.module === 'classify' && ['y_at', 'cmp'].every(name => step.execution.calls.some(call => call.line === 3 && call.function === name && call.result.availability === 'available')))
  expect(calculated).toBeGreaterThan(0)
  await page.goto(`/cases/crossing/learn?step=${calculated}`)
  for (const name of ['y_at', 'cmp']) {
    const call = trace.steps[calculated].execution.calls.find(call => call.line === 3 && call.function === name)!
    await panel.locator(`[data-symbol="${name}"][data-line="3"]`).hover()
    const callTooltip = page.getByRole('tooltip', { name: new RegExp(`^函数 ${name} `) })
    await expect(callTooltip).toContainText(`返回值：${trace.values[call.result.value!]}`)
    for (const argument of call.arguments) {
      expect(argument.availability).toBe('available')
      await expect(callTooltip).toContainText(`实参 ${argument.name}：${trace.values[argument.value!]}`)
    }
  }
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  const before = trace.steps[calculated - 1].execution.calls.find(call => call.line === 3 && call.function === 'y_at')
  expect(before).toBeDefined()
  expect(before!.result.availability).toBe('unassigned')
  expect(before!.result.value).toBeNull()
  expect(before!.arguments.some(argument => argument.availability === 'available')).toBe(true)
  await panel.locator('[data-symbol="y_at"][data-line="3"]').hover()
  const beforeTooltip = page.getByRole('tooltip', { name: /^函数 y_at / })
  await expect(beforeTooltip).toContainText('返回值：未赋值')
  for (const argument of before!.arguments.filter(argument => argument.availability === 'available')) {
    await expect(beforeTooltip).toContainText(`实参 ${argument.name}：${trace.values[argument.value!]}`)
  }
})
