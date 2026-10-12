import { closePreview, expect, test, type Locator, type Page } from './learning-test'
import { readTrace, stepIndex, waitForTraceCompletion } from './trace-navigation'

async function openStep(page: Page, preset: string, index: number) {
  await page.goto(`/cases/${preset}/learn?step=${index}`)
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

test('分类真假分支在块外汇合，if hover保留本次判断且回退恢复', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const trace = await readTrace(page, 'crossing')
  for (const state of ['true', 'false']) {
    const index = stepIndex(trace, step => step.execution.module === 'classify' && step.execution.boundary === 12 && step.execution.controls.some(control => control.line === 11 && control.keyword === 'if' && control.state === state))
    const panel = await openStep(page, 'crossing', index)
    await expectNextStatement(panel, 'if segments[id].left != point && segments[id].right != point {')
    await hoverControl(page, panel, 'if', 11, state === 'true' ? '本次条件为真，进入分支' : '本次条件为假，跳过分支')
    await hoverControl(page, panel, 'if', 13, '本次尚未执行')
    const before = await page.getByRole('region', { name: '核心变量', exact: true }).locator('dd').allTextContents()
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expectNextStatement(panel, 'if segments[id].left != point && segments[id].right != point {')
    await expect(panel.getByRole('img', { name: /执行边界/ })).toBeInViewport()
    await hoverControl(page, panel, 'if', 11, state === 'true' ? '本次条件为真' : '本次条件为假')
    expect(await page.getByRole('region', { name: '核心变量', exact: true }).locator('dd').allTextContents()).toEqual(before)
  }
  await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('已进入的分支在结束括号前后停步，未进入分支不制造块尾状态', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = stepIndex(trace, step => step.execution.module === 'geometry' && step.execution.blocks?.some(block => block.line === 5 && block.phase === 'before'))
  const panel = await openStep(page, 'crossing', index)
  await expectNextStatement(panel, '}')
  await expect(page.getByRole('region', { name: '当前执行上下文' }).getByTestId('variable-return_value')).toContainText('未赋值')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expectNextStatement(panel, 'return Some(point);')
  await hoverControl(page, panel, 'return', 8, '即将执行；结果尚未产生')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expectNextStatement(panel, '}')
  for (const step of trace.steps) {
    for (const block of step.execution.blocks ?? []) {
      const control = step.execution.controls.find(control => control.line === block.line && ['if', 'else', 'for'].includes(control.keyword))
      expect(control?.state).toMatch(/^(true|entered)$/)
    }
  }
})

test('条件表达式离开分支后保留局部变量身份，面板与hover均不可用', async ({ page }) => {
  const trace = await readTrace(page, 'partial-overlap')
  const before = stepIndex(trace, step => step.execution.module === 'record' && step.execution.blocks?.some(block => block.line === 4 && block.phase === 'before'))
  const after = stepIndex(trace, (step, index) => index > before && step.execution.module === 'record' && step.execution.blocks?.some(block => block.line === 4 && block.phase === 'after'))
  const variables = (index: number) => trace.steps[index].execution.context.locals
  for (const name of ['start', 'end']) {
    expect(variables(before).find(variable => variable.name === name)).toMatchObject({ availability: 'available', scope: 'record.overlap' })
    expect(variables(after).find(variable => variable.name === name)).toMatchObject({ availability: 'unavailable', value: null, scope: 'record.overlap' })
  }
  expect(variables(before).find(variable => variable.name === 'geometry')?.availability).toBe('unassigned')
  const panel = await openStep(page, 'partial-overlap', after)
  for (const name of ['start', 'end']) {
    await expect(page.getByRole('region', { name: '核心变量', exact: true }).getByTestId(`variable-${name}`)).toContainText('不可用')
    await panel.locator(`[data-symbol="${name}"]`).first().hover()
    const dialog = page.getByRole('dialog', { name: new RegExp(`^变量 ${name} `) })
    await expect(dialog).toContainText('不可用')
    await closePreview(page, dialog)
  }
})

test('末次缺失邻居先停continue前，再直接退出for且清除本轮判断与返回值', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const index = stepIndex(trace, step => step.execution.module === 'neighbors' && step.execution.boundary === 7)
  const panel = await openStep(page, 'crossing', index)
  await expectNextStatement(panel, 'continue;')
  await hoverControl(page, panel, 'else', 4, '本次进入 else 分支')
  await hoverControl(page, panel, 'continue', 4, '即将执行；结果尚未产生')
  await panel.locator('[data-symbol="get"]').hover()
  await expect(page.getByRole('dialog', { name: /^函数 get / })).toContainText('返回值：None')
  await closePreview(page, page.getByRole('dialog', { name: /^函数 get / }))
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await hoverControl(page, panel, 'continue', 4, '已执行 continue，跳往下一次迭代')
  await hoverControl(page, panel, 'for', 3, '本次没有下一个元素，循环已结束')
  await hoverControl(page, panel, 'else', 4, '本次尚未执行')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await hoverControl(page, panel, 'else', 4, '本次进入 else 分支')
  await expectNextStatement(panel, 'continue;')
})

test('空循环与末次迭代完成均显示结束，回退直接恢复末轮状态', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const empty = stepIndex(trace, step => step.execution.module === 'classify' && step.execution.boundary === 6 && step.active.length === 0)
  const panel = await openStep(page, 'crossing', empty)
  await hoverControl(page, panel, 'for', 2, '本次没有下一个元素，循环已结束')
  await hoverControl(page, panel, 'if', 4, '本次尚未执行')
  await expectNextStatement(panel, 'let (mut starts, mut ends, mut passes) = (Vec::new(), Vec::new(), Vec::new());')
  const last = stepIndex(trace, step => step.execution.module === 'classify' && step.execution.boundary === 15)
  await openStep(page, 'crossing', last)
  await hoverControl(page, panel, 'for', 8, '本次没有下一个元素，循环已结束')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await hoverControl(page, panel, 'for', 8, '本次已取得迭代元素，进入循环体')
  await hoverControl(page, panel, 'if', 9, '本次条件为真')
  for (const line of [11, 13]) await hoverControl(page, panel, 'if', line, '本次条件为假')
  await expect(page.getByRole('region', { name: '核心变量', exact: true }).getByTestId('variable-id')).toContainText('usize = 0')
})

test('提前return的前后停点保留实际返回位置，未调用函数不显示上次结果', async ({ page }) => {
  const trace = await readTrace(page, 'disjoint')
  const index = stepIndex(trace, step => step.execution.module === 'geometry' && step.execution.boundary === 10)
  const panel = await openStep(page, 'disjoint', index)
  const returns = panel.locator('.code-line').filter({ hasText: /^\s*return None;\s*$/ })
  await expect(returns).toHaveCount(2)
  const alignment = () => panel.evaluate(element => {
    const target = [...element.querySelectorAll('.code-line')].filter(line => line.textContent?.trim() === 'return None;')[1]
    return element.querySelector('.execution-boundary')!.getBoundingClientRect().top - target.getBoundingClientRect().top
  })
  expect(Math.abs(await alignment())).toBeLessThanOrEqual(1)
  await hoverControl(page, panel, 'else', 4, '本次进入 else 分支')
  await hoverControl(page, panel, 'return', 4, '即将执行；结果尚未产生')
  await hoverControl(page, panel, 'return', 8, '本次尚未执行')
  await panel.locator('[data-symbol="intersection_candidate"]').hover()
  await expect(page.getByRole('dialog', { name: /^函数 intersection_candidate / })).toContainText('返回值：None')
  await closePreview(page, page.getByRole('dialog', { name: /^函数 intersection_candidate / }))
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await hoverControl(page, panel, 'return', 4, ['已执行 return，函数已返回', '返回值：None'])
  const height = await returns.nth(1).evaluate(line => line.getBoundingClientRect().height)
  expect(await alignment()).toBeCloseTo(height, 0)
  await hoverControl(page, panel, 'return', 8, '本次尚未执行')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await hoverControl(page, panel, 'return', 4, '即将执行；结果尚未产生')
  expect(Math.abs(await alignment())).toBeLessThanOrEqual(1)
  const entry = trace.steps.findLastIndex((step, position) => position < index && step.execution.module === 'geometry' && step.execution.entry)
  await openStep(page, 'disjoint', entry)
  await panel.locator('[data-symbol="intersection_candidate"]').hover()
  await expect(page.getByRole('dialog', { name: /^函数 intersection_candidate / })).not.toContainText('返回值：None')
  await closePreview(page, page.getByRole('dialog', { name: /^函数 intersection_candidate / }))
})

test('record的两层else各自解释实际路径，continue跳转后循环局部变量失效', async ({ page }) => {
  for (const [preset, boundary, line, statement] of [
    ['crossing', 11, 12, 'Geometry::Point(original(&point))'],
    ['collinear-contact', 10, 11, 'Geometry::Point(original(start))'],
  ] as const) {
    const trace = await readTrace(page, preset)
    const index = stepIndex(trace, step => step.execution.module === 'record' && step.execution.boundary === boundary)
    const panel = await openStep(page, preset, index)
    await expectNextStatement(panel, statement)
    await hoverControl(page, panel, 'else', line, '本次进入 else 分支')
    await hoverControl(page, panel, 'else', line === 12 ? 11 : 12, line === 12 ? '本次尚未执行' : '本次跳过此分支')
  }
  const trace = await readTrace(page, 'partial-overlap')
  const index = stepIndex(trace, step => step.execution.module === 'record' && step.execution.boundary === 6)
  const panel = await openStep(page, 'partial-overlap', index)
  await expectNextStatement(panel, 'continue;')
  await hoverControl(page, panel, 'continue', 7, '即将执行；结果尚未产生')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await hoverControl(page, panel, 'for', 2, '本次没有下一个元素，循环已结束')
  await hoverControl(page, panel, 'if', 4, '本次尚未执行')
  for (const name of ['b', 'start', 'end', 'geometry']) {
    await expect(page.getByRole('region', { name: '核心变量', exact: true }).getByTestId(`variable-${name}`)).toContainText('不可用')
  }
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
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
  await hoverControl(page, panel, 'break', 2, '已执行 break，退出循环')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await hoverControl(page, panel, 'break', 2, '即将执行；结果尚未产生')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await hoverControl(page, panel, 'else', 2, '本次尚未执行')
})
