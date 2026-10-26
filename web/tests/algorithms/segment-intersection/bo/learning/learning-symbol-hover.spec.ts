import { closePreview, expect, test } from '../support/learning-test'
import type { SweepTrace } from '../../../../../src/algorithms/segment-intersection/bo/learning/trace'
import { readResponse, readTrace, seekStep, waitForTraceCompletion } from '../support/trace-navigation'
import { variableValue } from '../../../../../src/algorithms/segment-intersection/bo/learning/executionSymbols'
import { formatExecutionValue } from '../../../../../src/algorithms/segment-intersection/bo/learning/executionValue'
import { codeSymbols } from '../../../../../src/algorithms/segment-intersection/bo/learning/executionAccess'
import { chinese } from '../../../../support/language'
const translate = chinese._.bind(chinese)

test('访问识别区分字段名、字段值和路径，嵌套索引保留所属关系', () => {
  const symbols = codeSymbols('Point { x: p.x - shear * p.y, y: p.y }; Geometry::Point(p); // p.y')
  expect(symbols.filter(symbol => symbol.name === 'p')).toHaveLength(4)
  expect(symbols.filter(symbol => symbol.kind === 'access').map(symbol => symbol.access?.expression)).toEqual(['p.x', 'p.y', 'p.y'])
  const slope = codeSymbols('segments[neighbors[0]].slope').find(symbol => symbol.name === 'slope')!
  expect(slope.access?.parent?.expression).toBe('segments[neighbors[0]]')
  expect(slope.access?.parent?.parent?.expression).toBe('segments')
})

test('覆盖字段 hover 使用当前真实预处理结果，前进回退不改变字段值', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.execution.module === 'driver' && step.execution.boundary === 1)
  expect(index).toBeGreaterThan(0)
  await page.goto(`/bo/cases/crossing/learn?step=${index}`)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const field = panel.locator('[data-symbol="covers"]')
  const preview = page.getByRole('dialog', { name: /^访问 groups.covers / })
  const covers = trace.steps[index].execution.context.locals.find(v => v.name === 'covers')!
  for (const action of [null, '下一步', '上一步'] as const) {
    if (action) await page.getByRole('button', { name: action, exact: true }).click()
    await field.hover()
    await expect(preview).toContainText('类型：Vec<Cover>')
    await expect(preview).toContainText(formatExecutionValue(trace.values[covers.value!]))
    await closePreview(page, preview)
  }
})

test('长变量值可滚动访问', async ({ page }) => {
  const trace = await readTrace(page, 'mixed-vertical')
  const index = trace.steps.findIndex(step => step.action === 'take-entry')
  await page.goto(`/bo/cases/mixed-vertical/learn?step=${index}`)
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

test('覆盖字段 parent 深度保留完整集合，按钮、键盘与关闭重开一致', async ({ page }) => {
  const trace = await readTrace(page, 'mixed-vertical')
  const index = trace.steps.findIndex(step => step.execution.module === 'driver' && step.execution.boundary === 1)
  await page.goto(`/bo/cases/mixed-vertical/learn?step=${index}`)
  await waitForTraceCompletion(page)
  const field = page.getByRole('region', { name: '核心代码回放' }).locator('[data-symbol="covers"]')
  const preview = page.getByRole('dialog', { name: /^访问 groups.covers / })
  const increase = preview.getByRole('button', { name: '增加 parent 深度' })
  const decrease = preview.getByRole('button', { name: '减少 parent 深度' })
  await field.hover()
  await expect(preview.locator('[data-parent]')).toHaveCount(0)
  await expect(decrease).toBeDisabled()
  const detail = await preview.locator('[data-value-phase="current"]').innerText()
  await page.keyboard.press('+')
  await expect(preview.locator('[data-parent]')).toHaveCount(1)
  await expect(increase).toBeDisabled()
  const groups = trace.steps[index].execution.context.locals.find(v => v.name === 'groups')!
  await expect(preview.locator('[data-parent="groups"] code').last()).toHaveText(formatExecutionValue(trace.values[groups.value!]))
  await expect(preview.locator('[data-value-phase="current"]')).toHaveText(detail, { useInnerText: true })
  await page.keyboard.press('-')
  await expect(preview.locator('[data-parent]')).toHaveCount(0)
  await increase.click()
  await expect(preview.locator('[data-parent]')).toHaveCount(1)
  await decrease.click()
  await expect(preview.locator('[data-parent]')).toHaveCount(0)
  await closePreview(page, preview)
  await page.mouse.move(0, 0)
  await page.keyboard.press('Tab')
  await field.focus()
  await expect(field).toBeFocused()
  await expect(preview).toBeVisible()
  await expect(preview.locator('[data-parent]')).toHaveCount(0)
  await page.keyboard.press('+')
  await page.keyboard.press('Tab')
  await expect(decrease).toBeFocused()
  await expect(preview.locator('[data-parent]')).toHaveCount(1)
  await closePreview(page, preview)
})

test('遮蔽状态对入参与局部变量使用一致文案，其他不可用状态保持独立', () => {
  for (const name of ['segments', 'local']) {
    expect(variableValue({ name, type: 'usize', availability: 'shadowed', value: 0, scope: null }, ['7'], translate))
      .toBe('7（已遮蔽，遮蔽前的最后值）')
  }
  expect(variableValue({ name: 'point', type: 'Point', availability: 'unavailable', value: null, scope: null }, [], translate))
    .toBe('不可用（当前作用域未提供）')
})

test('事件映射在面板和悬浮提示中保留相同值', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.action === 'take-entry')
  await page.goto(`/bo/cases/crossing/learn?step=${index}`)
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  const value = variables.getByTestId('variable-queue').locator('dd')
  await variables.getByTestId('variable-queue').getByRole('button').click()
  await expect(value).toContainText('Event')
  const text = await value.textContent()
  const queue = trace.steps[index].execution.context.locals.find(v => v.name === 'queue')!
  await expect(value).toHaveText(formatExecutionValue(trace.values[queue.value!]))
  await closePreview(page, page.getByRole('dialog', { name: '变量 queue · queue: BTreeMap<Point, Event>', exact: true }))
  await page.getByRole('region', { name: '核心代码回放' }).locator('[data-symbol="queue"]').focus()
  await page.getByRole('region', { name: '核心代码回放' }).locator('[data-symbol="queue"]').hover()
  const preview = page.getByRole('dialog', { name: '变量 queue · take 模块', exact: true })
  const code = preview.locator('p').filter({ hasText: /^当前值：/ }).locator('code')
  await expect(code).toHaveText(text!)
  await closePreview(page, preview)
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
  await page.goto(`/bo/cases/vertical-overlap/learn?step=${index}`)
  const variables = page.getByRole('region', { name: '核心变量', exact: true })
  const segments = variables.getByTestId('variable-segments')
  await expect(segments).toHaveCount(2)
  await segments.filter({ hasText: 'segments: &[Segment]' }).getByRole('button').click()
  await segments.filter({ hasText: 'segments: Vec<SweepSegment>' }).getByRole('button').click()
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
    const index = trace.steps.findLastIndex(step => step.action === 'record')
    expect(index).toBeGreaterThan(0)
    const step = trace.steps[index]
    const call = step.execution.calls.find(call => call.function === 'push')!
    const argument = call.arguments.find(argument => argument.name === 'value')!
    const receiver = call.arguments.find(argument => argument.name === 'self')!
    const result = [...step.execution.context.locals, ...step.execution.context.parameters].find(variable => variable.name === 'result')!
    const previousResult = [...trace.steps[index - 1].execution.context.locals, ...trace.steps[index - 1].execution.context.parameters].find(variable => variable.name === 'result')!
    const value = trace.values[argument.value!]
    expect(value).toMatch(/^S\d+ × S\d+: \(/)
    expect(trace.values[receiver.value!]).toBe(trace.values[previousResult.value!])
    expect(trace.values[result.value!]).toContain(value)
    if (id === 'partial-overlap') expect(value).toContain(' → ')
    if (id === 'multiway-interior') expect(trace.values[receiver.value!]).not.toBe('[]')
    await page.goto(`/bo/cases/${id}/learn?step=${index}`)
    const variables = page.getByRole('region', { name: '当前执行上下文', exact: true })
    const panel = page.getByRole('region', { name: '核心代码回放' })
    await variables.getByTestId('variable-result').getByRole('button').click()
    await expect(variables.getByTestId('variable-result').locator('dd')).toHaveText(formatExecutionValue(trace.values[result.value!]))
    await expect(panel.getByRole('img', { name: /执行边界/ })).toBeInViewport()
    await panel.locator('[data-symbol="push"]').focus()
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
    await expect(tooltip).toContainText(`实参 value：${value}`)
    await expect(tooltip).toContainText('返回值：未赋值')
    await expect(tooltip).toContainText(`实参 self：${formatExecutionValue(trace.values[previousResult.value!])}`)
  })
}

test('真实取事件代码 hover 随前进和回退更新', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/bo/intersections'))
  await page.goto('/bo/cases/crossing/learn')
  const { trace }: { trace: SweepTrace } = await readResponse(await response)
  const entryIndex = trace.steps.findIndex(step => step.action === 'take-entry')
  await seekStep(page, entryIndex, 'jump')
  const panel = page.getByRole('region', { name: '核心代码回放' })
  const next = panel.locator('[data-symbol="next"]').first()
  const queue = panel.locator('[data-symbol="queue"]')
  const pop = panel.locator('[data-symbol="pop"]')
  const variableTooltip = page.getByRole('dialog', { name: /^变量 next / })
  const popTooltip = page.getByRole('dialog', { name: /^函数 pop / })
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
  await expect(panel.locator('[data-symbol="pop"]')).toHaveCount(0)
  await panel.locator('[data-symbol="incident"]').first().hover()
  await expect(page.getByRole('dialog', { name: /^变量 incident / })).toContainText('不可用')
})

test('真实调用悬浮显示当前入参，返回后不混入下一次调用', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  for (const name of ['prepare', 'recover_members', 'schedule']) {
    const index = trace.steps.findIndex(step => step.execution.calls.some(call => call.function === name && call.result.availability === 'available'))
    expect(index).toBeGreaterThan(0)
    await page.goto(`/bo/cases/crossing/learn?step=${index}`)
    const call = trace.steps[index].execution.calls.find(call => call.function === name)!
    await page.getByRole('region', { name: '核心代码回放' }).locator(`[data-symbol="${name}"]`).hover()
    const preview = page.getByRole('dialog', { name: new RegExp(`^函数 ${name} `) })
    await expect(preview).toContainText(`返回值：${formatExecutionValue(trace.values[call.result.value!])}`)
    for (const argument of call.arguments) {
      await expect(preview).toContainText(`实参 ${argument.name}：${formatExecutionValue(trace.values[argument.value!])}`)
    }
    await closePreview(page, preview)
  }
})

test('右侧顶层变量浮层与代码一致，支持键盘和前进回退', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.action === 'take-entry')
  expect(index).toBeGreaterThanOrEqual(0)
  await page.goto(`/bo/cases/crossing/learn?step=${index}`)
  await waitForTraceCompletion(page)
  await expect(page).toHaveURL(new RegExp(`/bo/cases/crossing/learn\\?step=${index}$`))
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
  await expect(tooltip).toContainText(`当前值：${variableValue(variable, trace.values, translate)}`)
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
  await page.goto(`/bo/cases/vertical-overlap/learn?step=${index}`)
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
  await expect(tooltip).toContainText(`当前值：${variableValue(parameter, trace.values, translate)}`)
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
  await expect(tooltip).toContainText(`当前值：${variableValue(variable, trace.values, translate)}`)
  await expect(tooltip).not.toContainText('原始输入线段')
})
