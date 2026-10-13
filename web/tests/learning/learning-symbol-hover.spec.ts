import { closePreview, expect, test } from '../support/learning-test'
import type { SweepTrace } from '../../src/learning/trace'
import { readResponse, readTrace, waitForTraceCompletion } from '../support/trace-navigation'
import { variableValue } from '../../src/learning/executionSymbols'
import { formatExecutionValue } from '../../src/learning/executionValue'
import { codeSymbols } from '../../src/learning/executionAccess'

test('访问识别区分字段名、字段值和路径，嵌套索引保留所属关系', () => {
  const symbols = codeSymbols('Point { x: p.x - shear * p.y, y: p.y }; Geometry::Point(p); // p.y')
  expect(symbols.filter(symbol => symbol.name === 'p')).toHaveLength(4)
  expect(symbols.filter(symbol => symbol.kind === 'access').map(symbol => symbol.access?.expression)).toEqual(['p.x', 'p.y', 'p.y'])
  const slope = codeSymbols('segments[neighbors[0]].slope').find(symbol => symbol.name === 'slope')!
  expect(slope.access?.parent?.expression).toBe('segments[neighbors[0]]')
  expect(slope.access?.parent?.parent?.expression).toBe('segments')
})

test('字段 hover 读取真实闭包参数，声明中的三个 p 均可查看且不泄露调用值', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.execution.module === 'original' && !step.execution.returning)
  expect(index).toBeGreaterThan(0)
  await page.goto(`/cases/crossing/learn?step=${index}`)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const references = panel.locator('[data-symbol="p"][data-line="2"]')
  await expect(references).toHaveCount(3)
  const parameter = trace.steps[index].execution.context.parameters.find(variable => variable.name === 'p')!
  for (const reference of await references.all()) {
    await reference.hover()
    await expect(page.getByRole('dialog', { name: /^变量 p / })).toContainText(`当前值：${trace.values[parameter.value!]}`)
    // The preview can overlap the code heading; leave through the page navigation.
    await page.getByRole('link', { name: '返回列表', exact: true }).hover()
    await expect(page.getByRole('dialog', { name: /^变量 p / })).toHaveCount(0)
  }
  const y = panel.locator('[data-symbol="y"]').last()
  await y.hover()
  await expect(page.getByRole('dialog', { name: /^访问 p.y / })).toContainText('类型：Rational')
  await expect(page.getByRole('dialog', { name: /^访问 p.y / })).toContainText('当前值：2')
  await closePreview(page, page.getByRole('dialog', { name: /^访问 p.y / }))
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await panel.locator('[data-symbol="y"]').last().hover()
  await expect(page.getByRole('dialog', { name: /^访问 p.y / })).toContainText('不可用')
  await closePreview(page, page.getByRole('dialog', { name: /^访问 p.y / }))
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await panel.locator('[data-symbol="y"]').last().hover()
  await expect(page.getByRole('dialog', { name: /^访问 p.y / })).toContainText('当前值：2')
})

test('字段与索引 hover 使用当前线段编号并随跳转变化', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.execution.module === 'record' && step.execution.boundary === 3 && step.execution.context.locals.some(variable => variable.name === 'b' && variable.availability === 'available'))
  await page.goto(`/cases/crossing/learn?step=${index}`)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  await panel.locator('[data-symbol="slope"]').first().hover()
  await expect(page.getByRole('dialog', { name: /^访问 segments\[a\].slope / })).toContainText('当前值：Some(1)')
  await panel.locator('[data-symbol="slope"]').nth(1).hover()
  await expect(page.getByRole('dialog', { name: /^访问 segments\[b\].slope / })).toContainText('当前值：Some(-1)')
  await panel.locator('[data-symbol="segments[a]"]').first().hover()
  await expect(page.getByRole('dialog', { name: /^访问 segments\[a\] / })).toContainText('SweepSegment { left: (0, 0), right: (4, 4), slope: Some(1), intercept: 0 }')
  const unavailable = trace.steps.findIndex(step => step.execution.module === 'record' && step.execution.boundary === 0)
  await page.goto(`/cases/crossing/learn?step=${unavailable}`)
  await panel.locator('[data-symbol="slope"]').first().hover()
  await expect(page.getByRole('dialog', { name: /^访问 segments\[a\].slope / })).toContainText('不可用（索引未赋值或不可用）')
})

test('长变量值可滚动访问', async ({ page }) => {
  const trace = await readTrace(page, 'mixed-vertical')
  const index = trace.steps.findIndex(step => step.action === 'take-entry')
  await page.goto(`/cases/mixed-vertical/learn?step=${index}`)
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  const input = variables.getByTestId('variable-segments').filter({ hasText: 'segments: &[Segment]' })
  await expect(input).toContainText('已遮蔽')
  await input.getByRole('button').click()
  const scroll = await input.locator('.execution-variable-value').evaluate(element => {
    element.scrollTop = element.scrollHeight
    return element.scrollTop
  })
  expect(scroll).toBeGreaterThan(0)
})

test('parent 深度保留详情，按钮与快捷键等效，切换重置并可滚动读取完整集合', async ({ page }) => {
  const trace = await readTrace(page, 'mixed-vertical')
  const index = trace.steps.findIndex(step => step.execution.module === 'record' && step.execution.boundary === 3 && step.execution.context.locals.some(variable => variable.name === 'b' && variable.availability === 'available'))
  expect(index).toBeGreaterThan(0)
  await page.goto(`/cases/mixed-vertical/learn?step=${index}`)
  await waitForTraceCompletion(page)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const slope = panel.locator('[data-symbol="slope"]').first()
  const preview = page.getByRole('dialog', { name: /^访问 segments\[a\].slope / })
  const increase = preview.getByRole('button', { name: '增加 parent 深度' })
  const decrease = preview.getByRole('button', { name: '减少 parent 深度' })
  await slope.hover()
  await expect(preview.locator('[data-parent]')).toHaveCount(0)
  await expect(decrease).toBeDisabled()
  const detail = await preview.locator('[data-value-phase="current"]').innerText()
  // Keyboard works for a pointer-opened preview without stealing focus.
  await page.keyboard.press('+')
  await expect(preview.locator('[data-parent]')).toHaveCount(1)
  await expect(preview.locator('[data-parent]').first()).toHaveAttribute('data-parent', 'segments[a]')
  await expect(preview.locator('[data-value-phase="current"]')).toHaveText(detail)
  await increase.hover()
  await increase.click()
  await expect(preview.locator('[data-parent]')).toHaveCount(2)
  await expect(increase).toBeDisabled()
  const root = preview.locator('[data-parent="segments"]')
  const segments = trace.steps[index].execution.context.locals.find(variable => variable.name === 'segments')!
  await expect(root.locator('code').last()).toHaveText(formatExecutionValue(trace.values[segments.value!]))
  await expect(preview.locator('[data-parent]')).not.toContainText(['作用域：', '类型：'])
  const last = root.locator('code').last()
  await preview.evaluate(element => { element.scrollTop = element.scrollHeight })
  expect(await preview.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  await expect(last).toContainText(formatExecutionValue(trace.values[segments.value!]).slice(-35))
  await page.keyboard.press('-')
  await expect(preview.locator('[data-parent]')).toHaveCount(1)
  await decrease.click()
  await expect(preview.locator('[data-parent]')).toHaveCount(0)
  await page.keyboard.press('-')
  await expect(preview.locator('[data-parent]')).toHaveCount(0)
  await increase.click()
  await closePreview(page, preview)
  await panel.locator('[data-symbol="slope"]').nth(1).hover()
  const other = page.getByRole('dialog', { name: /^访问 segments\[b\].slope / })
  await expect(other.locator('[data-parent]')).toHaveCount(0)
  await closePreview(page, other)
  await page.keyboard.press('+')
  await slope.hover()
  await expect(preview.locator('[data-parent]')).toHaveCount(0)
})

test('p.y 的 parent 跟随真实闭包前进回退，键盘进入浮层并关闭', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.execution.module === 'original' && !step.execution.returning)
  await page.goto(`/cases/crossing/learn?step=${index}`)
  await waitForTraceCompletion(page)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const y = panel.locator('[data-symbol="y"]').last()
  await y.hover()
  await y.focus()
  const preview = page.getByRole('dialog', { name: /^访问 p.y / })
  await expect(preview).toBeVisible()
  await page.keyboard.press('+')
  await expect(preview.locator('[data-parent="p"]')).toHaveText('p：(2, 2)')
  await page.keyboard.press('Tab')
  await expect(preview.getByRole('button', { name: '减少 parent 深度' })).toBeFocused()
  await closePreview(page, preview)
  // Replay may scroll the source to its boundary. PreviewTrigger deliberately
  // dismisses on anchor scrolling; reopen to inspect the new execution state.
  for (const [button, target, value] of [
    ['下一步', index + 1, '(2, 2)'], ['上一步', index, '(2, 2)'],
    ['上一步', index - 1, '不可用'], ['下一步', index, '(2, 2)'],
  ] as const) {
    await page.getByRole('button', { name: button, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`step=${target}$`))
    await y.hover()
    await expect(preview).toBeVisible()
    await preview.getByRole('button', { name: '增加 parent 深度' }).click()
    await expect(preview.locator('[data-parent="p"]')).toContainText(value)
    await closePreview(page, preview)
  }
})

test('遮蔽状态对入参与局部变量使用一致文案，其他不可用状态保持独立', () => {
  for (const name of ['segments', 'local']) {
    expect(variableValue({ name, type: 'usize', availability: 'shadowed', value: 0, scope: null }, ['7']))
      .toBe('7（已遮蔽，遮蔽前的最后值）')
  }
  expect(variableValue({ name: 'point', type: 'Point', availability: 'unavailable', value: null, scope: null }, []))
    .toBe('不可用（当前作用域未提供）')
})

test('事件映射在面板和悬浮提示中保留相同值', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.action === 'take-entry')
  await page.goto(`/cases/crossing/learn?step=${index}`)
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  const value = variables.getByTestId('variable-queue').locator('dd')
  await expect(value).toContainText('Event')
  const text = await value.textContent()
  await expect(value).toHaveText('{ (0, 0): Event { starts: [0] }, (0, 4): Event { starts: [1] }, (4, 0): Event { starts: [] }, (4, 4): Event { starts: [] } }')
  await page.getByRole('region', { name: '核心代码回放' }).locator('[data-symbol="queue"]').hover()
  const code = page.getByRole('dialog', { name: /^变量 queue / }).locator('p').filter({ hasText: /^当前值：/ }).locator('code')
  await expect(code).toHaveText(text!)
  await closePreview(page, page.getByRole('dialog', { name: /^变量 queue / }))
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(value).not.toContainText('(0, 0):')
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
  const displayed = formatExecutionValue(expected)
  await page.goto(`/cases/vertical-overlap/learn?step=${index}`)
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  const segments = variables.getByTestId('variable-segments')
  await expect(segments).toHaveCount(2)
  const input = segments.filter({ hasText: 'segments: &[Segment]' }).locator('dd')
  const local = segments.filter({ hasText: 'segments: Vec<SweepSegment>' }).locator('dd')
  await expect(input).toHaveText(`${displayed}（已遮蔽，遮蔽前的最后值）`)
  await expect(local).toContainText('SweepSegment')
  await expect(local).not.toContainText('已遮蔽')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(input).toHaveText(`${displayed}（已遮蔽，遮蔽前的最后值）`)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(input).toHaveText(`${displayed}（已遮蔽，遮蔽前的最后值）`)
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
    await expect(variables.getByTestId('variable-result').locator('dd')).toHaveText(formatExecutionValue(trace.values[result.value!]))
    await expect(panel.getByRole('img', { name: /执行边界/ })).toBeInViewport()
    await panel.locator('[data-symbol="push"]').hover()
    const tooltip = page.getByRole('dialog', { name: /^函数 push / })
    await expect(tooltip).toContainText(`实参 value：${value}`)
    await expect(tooltip).toContainText(`实参 self：${formatExecutionValue(trace.values[previousResult.value!])}`)
    const argumentsText = tooltip.locator('p').filter({ hasText: /^实参 / })
    await expect(argumentsText).toHaveText([
      `实参 self：${formatExecutionValue(trace.values[previousResult.value!])}`,
      `实参 value：${value}`,
    ])
    await closePreview(page, tooltip)
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(variables.getByTestId('variable-result').locator('dd')).toHaveText(formatExecutionValue(trace.values[previousResult.value!]))
    await panel.locator('[data-symbol="push"]').hover()
    await expect(tooltip).toContainText('实参 value：未赋值')
    await expect(tooltip).toContainText(`实参 self：${formatExecutionValue(trace.values[previousResult.value!])}`)
  })
}

test('真实取事件代码 hover 随前进和回退更新', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/intersections'))
  await page.goto('/cases/crossing/learn')
  const { trace }: { trace: SweepTrace } = await readResponse(await response)
  await page.getByRole('button', { name: '下一个大步', exact: true }).click()
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const next = panel.locator('[data-symbol="next"]').first()
  const queue = panel.locator('[data-symbol="queue"]')
  const pop = panel.locator('[data-symbol="pop_first"]')
  const variableTooltip = page.getByRole('dialog', { name: /^变量 next / })
  const popTooltip = page.getByRole('dialog', { name: /^函数 pop_first / })
  await next.hover()
  await expect(variableTooltip).toContainText('未赋值')
  await pop.hover()
  await expect(popTooltip).toContainText('返回值：未赋值')
  await queue.hover()
  const entry = trace.steps.find(step => step.action === 'take-entry')!
  const queueValue = entry.execution.context.locals.find(variable => variable.name === 'queue')!
  await expect(page.getByRole('dialog', { name: /^变量 queue / })).toContainText(formatExecutionValue(trace.values[queueValue.value!]))
  await closePreview(page, page.getByRole('dialog', { name: /^变量 queue / }))
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await next.hover()
  await expect(variableTooltip).toContainText('(0, 0)')
  await expect(variableTooltip).toContainText('本步变化')
  await pop.hover()
  await expect(popTooltip).toContainText('Some')
  await expect(popTooltip).not.toContainText('尚未调用')
  await closePreview(page, popTooltip)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await next.hover()
  await expect(variableTooltip).toContainText('未赋值')
  await pop.hover()
  await expect(popTooltip).toContainText('返回值：未赋值')
  await closePreview(page, popTooltip)
  await page.getByRole('button', { name: '下一个大步', exact: true }).click()
  await expect(panel).toContainText('参与线段分类')
  await expect(panel.locator('[data-symbol="pop_first"]')).toHaveCount(0)
  await panel.locator('[data-symbol="incident"]').first().hover()
  await expect(page.getByRole('dialog', { name: /^变量 incident / })).toContainText('未赋值')
})

test('分类同名 id 按词法循环隔离，真实调用按行和函数展示返回值', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/intersections'))
  await page.goto('/cases/crossing/learn')
  const { trace }: { trace: SweepTrace } = await readResponse(await response)
  const secondLoop = trace.steps.findIndex(step => step.execution.module === 'classify' && step.execution.boundary === 8 && step.execution.context.locals.some(variable => variable.name === 'id' && variable.availability === 'available'))
  expect(secondLoop).toBeGreaterThan(0)
  await page.goto(`/cases/crossing/learn?step=${secondLoop}`)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const firstTooltip = page.getByRole('dialog', { name: /^变量 id · 活动线段循环/ })
  const secondTooltip = page.getByRole('dialog', { name: /^变量 id · 参与线段循环/ })
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
    const callTooltip = page.getByRole('dialog', { name: new RegExp(`^函数 ${name} `) })
    await expect(callTooltip).toContainText(`返回值：${trace.values[call.result.value!]}`)
    for (const argument of call.arguments) {
      expect(argument.availability).toBe('available')
      await expect(callTooltip).toContainText(`实参 ${argument.name}：${trace.values[argument.value!]}`)
    }
    await closePreview(page, callTooltip)
  }
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  const before = trace.steps[calculated - 1].execution.calls.find(call => call.line === 3 && call.function === 'y_at')
  expect(before).toBeDefined()
  expect(before!.result.availability).toBe('unassigned')
  expect(before!.result.value).toBeNull()
  expect(before!.arguments.some(argument => argument.availability === 'available')).toBe(true)
  await panel.locator('[data-symbol="y_at"][data-line="3"]').hover()
  const beforeTooltip = page.getByRole('dialog', { name: /^函数 y_at / })
  await expect(beforeTooltip).toContainText('返回值：未赋值')
  for (const argument of before!.arguments.filter(argument => argument.availability === 'available')) {
    await expect(beforeTooltip).toContainText(`实参 ${argument.name}：${trace.values[argument.value!]}`)
  }
})

test('右侧顶层变量浮层与代码一致，支持键盘和前进回退', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.action === 'take-entry')
  expect(index).toBeGreaterThanOrEqual(0)
  await page.goto(`/cases/crossing/learn?step=${index}`)
  await waitForTraceCompletion(page)
  await expect(page).toHaveURL(new RegExp(`/cases/crossing/learn\\?step=${index}$`))
  await expect(page).toHaveTitle(/BO 结果查看器/)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  const panel = page.getByRole('region', { name: '核心变量', exact: true })
  const next = panel.getByRole('button', { name: '变量 next · 局部变量', exact: true })
  const tooltip = page.getByRole('dialog', { name: /^变量 next / })
  const codeNext = page.getByRole('region', { name: '核心代码回放' }).locator('[data-symbol="next"]').first()
  await codeNext.hover()
  await expect(tooltip).toContainText('当前值：未赋值')
  const codeDescription = await tooltip.innerText()
  await panel.getByRole('heading', { name: '核心变量', exact: true }).hover()
  await expect(tooltip).toBeHidden()
  await next.hover()
  await expect(tooltip).toHaveText(codeDescription, { useInnerText: true })
  await closePreview(page, tooltip)
  await panel.getByRole('heading', { name: '核心变量', exact: true }).hover()
  await next.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(next).toBeFocused()
  await expect(tooltip).toContainText('本次弹出的队首事件，可为空')
  await closePreview(page, tooltip)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await next.hover()
  const variable = trace.steps[index + 1].execution.context.locals.find(variable => variable.name === 'next')!
  await expect(tooltip).toContainText(`当前值：${variableValue(variable, trace.values)}`)
  await expect(tooltip).toContainText('本步变化；之前值：未赋值')
  await closePreview(page, tooltip)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await next.hover()
  await expect(tooltip).toContainText('当前值：未赋值')
  expect(errors).toEqual([])
})

test('右侧同名参数和局部变量浮层隔离，变量名点击可折叠集合', async ({ page }) => {
  const trace = await readTrace(page, 'vertical-overlap')
  const index = trace.steps.findIndex(step => step.action === 'take-entry')
  await page.goto(`/cases/vertical-overlap/learn?step=${index}`)
  await waitForTraceCompletion(page)
  const panel = page.getByRole('region', { name: '核心变量', exact: true })
  const input = panel.getByRole('button', { name: 'segments: &[Segment]', exact: true })
  const local = panel.getByRole('button', { name: 'segments: Vec<SweepSegment>', exact: true })
  const tooltip = page.getByRole('dialog', { name: /^变量 segments / })
  const parameter = trace.steps[index].execution.context.parameters.find(variable => variable.name === 'segments')!
  const variable = trace.steps[index].execution.context.locals.find(variable => variable.name === 'segments')!
  await input.hover()
  await expect(tooltip).toContainText('原始输入线段，使用原坐标')
  await expect(tooltip).toContainText('作用域：sweep 参数')
  await expect(tooltip).toContainText(`当前值：${variableValue(parameter, trace.values)}`)
  await expect(tooltip).not.toContainText('SweepSegment')
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  await input.locator('code').first().click()
  await expect(input).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.getByTestId('variable-segments').filter({ hasText: 'segments: &[Segment]' }).locator('dd')).toBeVisible()
  await input.locator('code').first().click()
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  await panel.getByRole('heading', { name: '核心变量', exact: true }).hover()
  await expect(tooltip).toBeHidden()
  await local.hover()
  await expect(tooltip).toContainText(`当前值：${variableValue(variable, trace.values)}`)
  await expect(tooltip).not.toContainText('原始输入线段')
})
