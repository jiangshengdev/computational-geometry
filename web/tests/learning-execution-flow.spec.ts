import { expect, test } from './learning-test'
import { readTrace } from './trace-navigation'
import { presets } from '../src/presets'
import { formatExecutionValue } from '../src/executionValue'
import { shadowedValueNote } from '../src/executionSymbols'

test('核心变量保留真实值并随前进回退更新', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.execution.module === 'classify' && step.execution.boundary === 8)
  expect(index).toBeGreaterThan(0)
  await page.goto(`/cases/crossing/learn?step=${index}`)
  const panel = page.getByRole('region', { name: '核心变量', exact: true })
  for (const stepIndex of [index, index + 1, index]) {
    for (const kind of ['parameters', 'locals'] as const) {
      const rows = panel.getByRole('region', { name: '当前执行上下文' }).locator('dl').nth(kind === 'parameters' ? 0 : 1)
      for (const variable of trace.steps[stepIndex].execution.context[kind]) {
        const row = rows.getByTestId(`variable-${variable.name}`)
        const disclosure = row.getByRole('button')
        if (await disclosure.count() && await disclosure.getAttribute('aria-expanded') === 'false') await disclosure.click()
        await expect(row.locator('dt')).toContainText(`${variable.name}: ${variable.type} =`)
        if ((variable.availability === 'available' || variable.availability === 'shadowed') && variable.value !== null) {
          await expect(row.locator('dd')).toHaveText(formatExecutionValue(trace.values[variable.value]) + (variable.availability === 'shadowed' ? shadowedValueNote : ''))
        }
      }
    }
    if (stepIndex === index + 1) await page.getByRole('button', { name: '上一步', exact: true }).click()
    else if (stepIndex === index) await page.getByRole('button', { name: '下一步', exact: true }).click()
  }
  const result = panel.getByTestId('variable-result')
  await expect(result.locator('dd')).toHaveText('[]')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const id of ['crossing', 'endpoint', 'multiway-interior', 'partial-overlap', 'vertical', 'disjoint', 'empty']) {
  test(`完整轨迹的入口、终态与普通计算一致：${id}`, async ({ page }) => {
    const trace = await readTrace(page, id)
    const response = await page.request.post('/api/intersections', { data: { segments: presets.find(preset => preset.id === id)!.segments } })
    const { intersections } = await response.json()
    expect(trace.steps.at(-1)!.results).toEqual(intersections)
    const entries = trace.steps.filter(step => step.execution.entry)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.every(step => step.execution.boundary === 0)).toBe(true)
    const modules = new Set<string>()
    for (const [index, step] of trace.steps.entries()) {
      if (!step.execution.entry || modules.has(step.execution.module)) continue
      modules.add(step.execution.module)
      await page.goto(`/cases/${id}/learn?step=${index}`)
      const panel = page.getByRole('region', { name: '核心代码回放' })
      const variables = page.getByRole('region', { name: '核心变量', exact: true })
      await expect(panel).toContainText('第一条核心语句之前')
      await expect(panel.getByRole('img', { name: /执行边界/ })).toBeVisible()
      const before = await variables.locator('dd').allTextContents()
      expect(before.length).toBeGreaterThan(0)
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      await page.getByRole('button', { name: '上一步', exact: true }).click()
      expect(await variables.locator('dd').allTextContents()).toEqual(before)
    }
    await page.getByRole('slider', { name: '教学步骤' }).press('End')
    await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
    await expect(page.getByRole('region', { name: '核心代码回放' })).toContainText('队列为空，退出循环')
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
  })
}

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  for (const width of [1440, 390]) test.extend({ browserName })(`长代码执行边界与变量浮层可达且滚动独立 ${browserName} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const trace = await readTrace(page, 'multiway-interior')
    const index = trace.steps.findIndex(step => step.execution.module === 'classify' && step.execution.boundary === 8)
    expect(index).toBeGreaterThan(0)
    await page.goto(`/cases/multiway-interior/learn?step=${index}`)
    const panel = page.getByRole('region', { name: '核心代码回放' })
    const code = panel.getByRole('region', { name: '参与线段分类教学代码' })
    const boundary = panel.getByRole('img', { name: /执行边界/ })
    await code.scrollIntoViewIfNeeded()
    await expect(boundary).toBeInViewport()
    const variables = page.getByRole('region', { name: '核心变量', exact: true })
    for (const trigger of await variables.locator('.execution-variable').getByRole('button').all()) await trigger.click()
    const context = variables.locator('.execution-context')
    const codeScroll = await code.evaluate(element => element.scrollTop)
    const variableScroll = await context.evaluate(element => {
      element.scrollTop = element.scrollHeight
      return element.scrollTop
    })
    if (width === 1440) expect(variableScroll).toBeGreaterThan(0)
    expect(await code.evaluate(element => element.scrollTop)).toBe(codeScroll)
    const symbol = panel.locator('[data-symbol="id"][data-line="8"]')
    await symbol.hover()
    await expect(page.getByRole('tooltip', { name: /^变量 id / })).toContainText('当前值')
    const offset = () => boundary.evaluate(element => element.getBoundingClientRect().top - element.parentElement!.querySelectorAll('.code-line')[8].getBoundingClientRect().top)
    const alignment = await offset()
    await code.evaluate(element => { element.scrollTop = 0; element.scrollLeft = element.scrollWidth })
    expect(await context.evaluate(element => element.scrollTop)).toBe(variableScroll)
    expect(await offset()).toBe(alignment)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
