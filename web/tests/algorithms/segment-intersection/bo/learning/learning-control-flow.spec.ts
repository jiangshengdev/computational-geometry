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

for (const [module, line, statement] of [
  ['prepare', 3, 'return groups;'],
  ['members', 2, 'return members;'],
  ['certificate', 3, 'return candidate;'],
] as const) {
  test(`${module} 的真实 return 前后边界、hover 与回退`, async ({ page }) => {
    const trace = await readTrace(page, 'crossing')
    const index = stepIndex(trace, step => step.execution.module === module && step.execution.boundary === 3)
    const panel = await openStep(page, 'crossing', index)
    await expectNextStatement(panel, statement)
    await hoverControl(page, panel, 'return', line, '即将执行；结果尚未产生')
    const current = page.getByRole('region', { name: '当前执行上下文' })
    await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(panel).toContainText('返回值已产生 · 尚未恢复调用方')
    await hoverControl(page, panel, 'return', line, '已执行 return，函数已返回')
    await expect(current.getByTestId('variable-return_value')).not.toContainText('未赋值')
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(current).toContainText('当前函数：sweep')
    await expect(current.getByTestId('variable-return_value')).toHaveCount(0)
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(current.getByTestId('variable-return_value')).not.toContainText('未赋值')
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await hoverControl(page, panel, 'return', line, '即将执行；结果尚未产生')
    await expectNextStatement(panel, statement)
  })
}

test('不同调用的局部候选与返回值不泄露，None 仍有真实返回边界', async ({ page }) => {
  const trace = await readTrace(page, 'disjoint')
  const index = stepIndex(trace, step => step.execution.module === 'certificate' && step.execution.boundary === 3
    && step.execution.context.locals.some(v => v.name === 'candidate' && v.value !== null && trace.values[v.value] === 'None'))
  const panel = await openStep(page, 'disjoint', index)
  await expectNextStatement(panel, 'return candidate;')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await hoverControl(page, panel, 'return', 3, ['已执行 return，函数已返回', '返回值：None'])
  const entry = trace.steps.findLastIndex((step, position) => position < index && step.execution.module === 'certificate' && step.execution.entry)
  await openStep(page, 'disjoint', entry)
  await expect(page.getByRole('region', { name: '当前执行上下文' }).getByTestId('variable-return_value')).toContainText('未赋值')
  await panel.locator('[data-symbol="candidate"]').first().hover()
  await expect(page.getByRole('dialog', { name: /^变量 candidate / })).not.toContainText('当前值：None')
})

test('空队列的匹配前停步与退出可回退，不制造未来事件', async ({ page }) => {
  const trace = await readTrace(page, 'empty')
  const index = stepIndex(trace, step => step.action === 'take-pop')
  const panel = await openStep(page, 'empty', index)
  await expectNextStatement(panel, 'let Some((point, event)) = next else { break; };')
  const next = page.getByRole('button', { name: '下一步', exact: true })
  await expect(next).toBeEnabled()
  await expect(page.getByTestId('variable-next')).toContainText('None')
  await next.click()
  await expect(next).toBeDisabled()
  await expect(panel).toContainText('return result;')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expectNextStatement(panel, 'let Some((point, event)) = next else { break; };')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(page.getByTestId('variable-next')).toContainText('未赋值')
  await expect(page.locator('.current-point')).toHaveCount(0)
})
