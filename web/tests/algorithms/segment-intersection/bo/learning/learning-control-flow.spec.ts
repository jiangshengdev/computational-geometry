import { closePreview, expect, test, type Locator, type Page } from '../support/learning-test'
import { readTrace, stepIndex, waitForTraceCompletion } from '../support/trace-navigation'

async function openStep(page: Page, preset: string, index: number) {
  await page.goto(`/bo/cases/${preset}/learn?step=${index}`)
  await waitForTraceCompletion(page)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  await expect(panel.locator('.code-line').first()).toBeAttached()
  return panel
}

async function hoverControl(page: Page, panel: Locator, keyword: string, line: number, expected: string | string[]) {
  const target = panel.locator(`[data-symbol="${keyword}"][data-line="${line}"]`)
  await target.hover()
  await expect(target).toHaveAttribute('aria-describedby', /\S+/)
  const tooltipId = await target.getAttribute('aria-describedby')
  const tooltip = page.locator(`[role="dialog"][id="${tooltipId}"]`)
  for (const text of [expected].flat()) await expect(tooltip).toContainText(text)
  await closePreview(page, tooltip)
}

async function expectNextStatement(panel: Locator, statement: string) {
  const offset = await panel.evaluate((element, statement) => {
    const line = [...element.querySelectorAll('.code-line')].find(line => line.textContent?.trim() === statement)
    if (!line) throw new Error(`Missing statement: ${statement}`)
    return element.querySelector('.execution-boundary')!.getBoundingClientRect().top - line.getBoundingClientRect().top
  }, statement)
  expect(Math.abs(offset)).toBeLessThanOrEqual(1)
}

test('预约覆盖分支的真假判断来自当前调用并可回退', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  for (const state of ['true', 'false']) {
    const index = stepIndex(trace, step => step.execution.module === 'schedule' && step.execution.controls.some(c => c.line === 3 && c.keyword === 'if' && c.state === state))
    const panel = await openStep(page, 'crossing', index)
    await hoverControl(page, panel, 'if', 3, state === 'true' ? '条件为真' : '条件为假')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await hoverControl(page, panel, 'if', 3, state === 'true' ? '条件为真' : '条件为假')
  }
})

test('封装后的每次真实输入配对均可观察，同线 other 可读取真实值', async ({ page }) => {
  for (const [preset, line, count] of [['partial-overlap', 6, 1], ['crossing', 7, 1], ['point-inputs', 8, 1], ['pure-points', 9, 1]] as const) {
    const trace = await readTrace(page, preset)
    const index = stepIndex(trace, step => step.execution.module === 'members' && step.execution.boundary === line && !step.execution.resuming)
    const panel = await openStep(page, preset, index)
    const loops = panel.locator(`[data-symbol="for"][data-line="${line}"]`)
    await expect(loops).toHaveCount(count)
    for (const loop of await loops.all()) {
      await loop.hover()
      const tooltip = page.getByRole('dialog', { name: /^控制流 for / })
      await expect(tooltip).toContainText('进入循环体')
      await closePreview(page, tooltip)
    }
    if (line === 6) {
      const other = trace.steps[index].execution.context.locals.find(v => v.name === 'other')!
      await panel.locator('[data-symbol="other"][data-line="6"]').last().hover()
      await expect(page.getByRole('dialog', { name: /^变量 other / })).toContainText(`当前值：${trace.values[other.value!]}`)
    }
  }
})

test('真实成员分支保留块结束前后；未进入分支不制造结束状态', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const before = stepIndex(trace, step => step.execution.module === 'members' && step.execution.blocks.some(b => b.line === 4 && b.phase === 'before'))
  const id = trace.steps[before].execution.context.id
  const after = stepIndex(trace, step => step.execution.context.id === id && step.execution.blocks.some(b => b.line === 4 && b.phase === 'after'))
  expect(after).toBeGreaterThan(before)
  for (const index of [before, after]) {
    await openStep(page, 'crossing', index)
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(index))
    await expect(page.getByRole('region', { name: '核心代码回放' })).toContainText(index === before ? '块结束前' : '块结束后')
  }
  const skipped = trace.steps.find(step => step.execution.module === 'members' && step.execution.controls.some(c => c.line === 4 && c.state === 'false'))!
  expect(skipped).toBeDefined()
  expect(trace.steps.filter(step => step.execution.context.id === skipped.execution.context.id).flatMap(step => step.execution.blocks).filter(b => b.line === 4)).toEqual([])
})

test('同线点交与区间分支只观察实际进入的块结束', async ({ page }) => {
  for (const [preset, condition, closing] of [['collinear-contact', 'true', '} else {'], ['partial-overlap', 'false', '};']] as const) {
    const trace = await readTrace(page, preset)
    const entry = stepIndex(trace, step => step.execution.module === 'members' && step.execution.controls.some(control => control.line === 6 && control.keyword === 'if' && control.state === condition))
    const end = trace.steps.findIndex((step, index) => index > entry && step.execution.blocks.some(block => block.line === 6 && block.phase === 'before'))
    expect(end).toBeGreaterThan(entry)
    const panel = await openStep(page, preset, entry)
    await hoverControl(page, panel, 'if', 6, condition === 'true' ? '条件为真' : '条件为假')
    for (let index = entry; index < end; index++) await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expectNextStatement(panel, closing)
    await expect(panel).toContainText('块结束前')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(panel).toContainText('块结束后')
    await expect(page.getByRole('region', { name: '当前执行上下文', exact: true }).getByTestId('variable-scan_geometry')).toContainText(condition === 'true' ? '(2, 2)' : '(2, 0) → (4, 0)')
  }
})

test('成员循环退出后变量保持名称并不可用，回退恢复真实值', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const joined = stepIndex(trace, step => step.action === 'join')
  const id = trace.steps[joined].execution.context.id
  const exited = stepIndex(trace, step => step.execution.context.id === id && step.execution.blocks.some(block => block.line === 1 && block.phase === 'after'))
  await openStep(page, 'crossing', exited)
  const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
  await expect(current.getByTestId('variable-id')).toContainText('不可用')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(current.getByTestId('variable-id')).toContainText('usize = 0')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current.getByTestId('variable-id')).toContainText('不可用')
})

test('空邻接循环与末次循环均显示结束且不保留上一轮配对', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = stepIndex(trace, step => step.execution.module === 'neighbors' && step.execution.controls.some(c => c.line === 1 && c.state === 'exhausted'))
  const panel = await openStep(page, 'crossing', index)
  await hoverControl(page, panel, 'for', 1, '循环已结束')
  await expect(page.getByRole('region', { name: '当前执行上下文' }).getByTestId('variable-pair')).toContainText('不可用')
})

test('平行组提前返回保持真实返回位置，产生返回值后才恢复调用方', async ({ page }) => {
  const trace = await readTrace(page, 'disjoint')
  const index = stepIndex(trace, step => step.execution.module === 'schedule' && step.execution.boundary === 1 && !step.execution.returning)
  const panel = await openStep(page, 'disjoint', index)
  await expectNextStatement(panel, 'return ();')
  await hoverControl(page, panel, 'return', 1, '即将执行')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await hoverControl(page, panel, 'return', 1, '函数已返回')
  await expect(page.getByRole('region', { name: '当前执行上下文' }).getByTestId('variable-return_value')).toContainText('()')
})

test('空队列break前可停步，退出后hover说明完成，回退不会保留未来状态', async ({ page }) => {
  const trace = await readTrace(page, 'empty')
  const index = stepIndex(trace, step => step.execution.module === 'take' && step.execution.boundary === 3)
  const panel = await openStep(page, 'empty', index)
  await expectNextStatement(panel, 'break;')
  await hoverControl(page, panel, 'else', 2, '本次进入 else 分支')
  await hoverControl(page, panel, 'break', 2, '即将执行；结果尚未产生')
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeEnabled()
  await hoverControl(page, panel, 'break', 2, '已执行 break，退出循环')
  await hoverControl(page, panel, 'return', 3, '即将执行')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
  await hoverControl(page, panel, 'return', 3, '函数已返回')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await hoverControl(page, panel, 'break', 2, '即将执行；结果尚未产生')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await hoverControl(page, panel, 'else', 2, '本次尚未执行')
})
