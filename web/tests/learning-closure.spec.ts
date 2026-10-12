import { expect, test } from './learning-test'
import { captureIntersections, seekStep, waitForTraceCompletion } from './trace-navigation'

test('si 进入真实 retain 调用，显示作用域、独立返回值并逐步回退', async ({ page }) => {
  const capture = await captureIntersections(page)
  await page.goto('/cases/crossing/learn')
  const { trace } = await capture.result
  await waitForTraceCompletion(page)
  const entry = trace.steps.findIndex(step => step.execution.context.function === 'retain closure' && !step.execution.returning)
  expect(entry).toBeGreaterThan(0)
  await seekStep(page, entry - 1, 'jump')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
  const outer = page.getByRole('region', { name: '外层执行上下文 sweep', exact: true })
  await expect(current).toContainText('retain closure')
  await expect(current.getByTestId('variable-id')).toContainText('usize = 0')
  await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
  await expect(current).toContainText('捕获变量')
  await expect(outer).toBeVisible()
  const code = page.getByRole('region', { name: '核心代码回放', exact: true })
  await expect(code).toContainText('segments[id].right != point')
  await expect(code).not.toContainText('nop!')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current.getByTestId('variable-return_value')).toContainText('true')
  await expect(code).toContainText('返回值已产生')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current).toContainText('sweep')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(current).toContainText('retain closure')
  await expect(current.getByTestId('variable-return_value')).toContainText('true')
})

test('其余闭包沿用真实参数、返回停点和外层作用域', async ({ page }) => {
  const capture = await captureIntersections(page)
  await page.goto('/cases/crossing/learn')
  const { trace } = await capture.result
  await waitForTraceCompletion(page)
  const current = page.getByRole('region', { name: '当前执行上下文', exact: true })
  for (const name of ['sort_by closure', 'partition_point closure', 'then closure', 'original closure']) {
    const entry = trace.steps.findIndex(step => step.execution.context.function === name && !step.execution.returning)
    expect(entry, name).toBeGreaterThan(0)
    await seekStep(page, entry, 'jump')
    await expect(current).toContainText(name)
    await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
    await expect(page.getByRole('region', { name: '外层执行上下文 sweep', exact: true })).toBeVisible()
    for (const parameter of trace.steps[entry].execution.context.parameters) {
      await expect(current.getByTestId(`variable-${parameter.name}`)).toContainText(trace.values[parameter.value!])
    }
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    const returned = trace.steps[entry + 1].execution.context.locals.find(variable => variable.name === 'return_value')!
    await expect(current.getByTestId('variable-return_value')).toContainText(trace.values[returned.value!])
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(current.getByTestId('variable-return_value')).toContainText('未赋值')
  }
})
