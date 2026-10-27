import { expect, test } from '../support/learning-test'
import { readTrace } from '../support/trace-navigation'
import { formatExecutionValue } from '../../../../../src/algorithms/segment-intersection/bo/learning/executionValue'

for (const browserName of ['chromium', 'webkit'] as const) {
  test.extend({ browserName })(`连续下一步贯穿真实事件，变量与紧邻回退同步 ${browserName}`, async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const trace = await readTrace(page, 'crossing')
    await page.goto('/bo/cases/crossing/learn')
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    const modules = new Set<string>()
    for (let i = 1; i < trace.steps.length; i++) {
      // Exercise deliberate single stepping, below WebKit's history-write
      // quota; held-key/drag URL throttling has its own interaction tests.
      await next.click({ delay: 150 })
      await expect(slider).toHaveValue(String(i))
      const step = trace.steps[i]
      modules.add(step.execution.module)
      await expect(current.getByRole('heading', { name: `当前函数：${step.execution.context.function}`, exact: true })).toBeVisible()
      for (const variable of step.execution.context.locals.filter(v => ['id', 'group', 'other', 'a', 'b', 'candidate', 'geometry', 'inserted'].includes(v.name))) {
        const row = current.getByTestId(`variable-${variable.name}`)
        if (variable.availability === 'available' && variable.value !== null) {
          await expect(row.locator('dd')).toContainText(formatExecutionValue(trace.values[variable.value]))
        } else {
          await expect(row).toContainText(variable.availability === 'unassigned' ? '未赋值' : '不可用')
        }
      }
      if (step.execution.blocks.some(block => block.phase === 'after') || step.action === 'record' || step.action === 'discover') {
        const values = await current.locator('dd').allTextContents()
        await previous.click({ delay: 150 })
        await expect(slider).toHaveValue(String(i - 1))
        await next.click({ delay: 150 })
        await expect(slider).toHaveValue(String(i))
        expect(await current.locator('dd').allTextContents()).toEqual(values)
      }
    }
    expect(modules).toEqual(new Set(['take', 'sweep', 'locate', 'members', 'activity', 'neighbors', 'schedule', 'output', 'original']))
    await expect(next).toBeDisabled()
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('核心变量保留真实值并随前进回退更新', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.execution.module === 'members' && step.execution.boundary === 1)
  expect(index).toBeGreaterThan(0)
  await page.goto(`/bo/cases/crossing/learn?step=${index}`)
  const panel = page.getByRole('region', { name: '核心变量', exact: true })
  for (const stepIndex of [index, index + 1, index]) {
    for (const kind of ['parameters', 'locals'] as const) {
      const rows = panel.getByRole('region', { name: '当前执行上下文' }).locator('dl').nth(kind === 'parameters' ? 0 : 1)
      for (const variable of trace.steps[stepIndex].execution.context[kind]) {
        const row = rows.getByTestId(`variable-${variable.name}`)
        await expect(row.locator('dt')).toContainText(`${variable.name}: ${variable.type} =`)
        const disclosure = row.getByRole('button', { name: `${variable.name}: ${variable.type}`, exact: true })
        if (await disclosure.count() && await disclosure.getAttribute('aria-expanded') === 'false') {
          await disclosure.click()
          await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
        }
        if ((variable.availability === 'available' || variable.availability === 'shadowed') && variable.value !== null) {
          await expect(row.locator('dd')).toHaveText(formatExecutionValue(trace.values[variable.value]) + (variable.availability === 'shadowed' ? '（已遮蔽，遮蔽前的最后值）' : ''))
        }
      }
    }
    if (stepIndex === index + 1) await page.getByRole('button', { name: '上一步', exact: true }).click()
    else if (stepIndex === index) await page.getByRole('button', { name: '下一步', exact: true }).click()
  }
  const result = panel.getByRole('region', { name: '当前执行上下文' }).getByTestId('variable-result')
  await expect(result.locator('dd')).toHaveText('[]')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('各代码模块入口可前进并恢复上下文', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const modules = new Set<string>()
  for (const [index, step] of trace.steps.entries()) {
    if (!step.execution.entry || modules.has(step.execution.module)) continue
    modules.add(step.execution.module)
    await page.goto(`/bo/cases/crossing/learn?step=${index}`)
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
})

for (const browserName of ['chromium', 'webkit'] as const) {
  test.extend({ browserName })(`长代码执行边界与变量浮层可达且滚动独立 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const trace = await readTrace(page, 'multiway-interior')
    const index = trace.steps.findIndex(step => step.execution.module === 'members' && step.execution.boundary === 1)
    expect(index).toBeGreaterThan(0)
    await page.goto(`/bo/cases/multiway-interior/learn?step=${index}`)
    const panel = page.getByRole('region', { name: '核心代码回放' })
    const code = panel.getByRole('region', { name: '记录成员交集教学代码' })
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
    expect(variableScroll).toBeGreaterThan(0)
    expect(await code.evaluate(element => element.scrollTop)).toBe(codeScroll)
    const symbol = panel.locator('[data-symbol="id"][data-line="1"]').first()
    await symbol.hover()
    await expect(page.getByRole('dialog', { name: /^变量 id / })).toContainText('当前值')
    const offset = () => boundary.evaluate(element => element.getBoundingClientRect().top - element.parentElement!.querySelectorAll('.code-line')[8].getBoundingClientRect().top)
    const alignment = await offset()
    await code.evaluate(element => { element.scrollTop = 0; element.scrollLeft = element.scrollWidth })
    expect(await context.evaluate(element => element.scrollTop)).toBe(variableScroll)
    expect(await offset()).toBe(alignment)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
