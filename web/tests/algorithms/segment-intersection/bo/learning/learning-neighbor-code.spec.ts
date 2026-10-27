import { expect, test } from '../support/learning-test'
import { readTrace, stepIndex, seekStep } from '../support/trace-navigation'

test('真实预约调用先产生返回值，再恢复调用方；回退恢复同一调用', async ({ page }) => {
  const trace = await readTrace(page, 'crossing')
  const entry = stepIndex(trace, step => step.execution.module === 'schedule' && step.execution.entry)
  const id = trace.steps[entry].execution.context.id
  const returned = stepIndex(trace, step => step.execution.context.id === id && step.execution.returning)
  const resumed = returned + 1
  expect(trace.steps[resumed].execution.resuming).toBe(true)
  expect(trace.steps[resumed].execution.context.function).toBe('check')
  await page.goto(`/bo/cases/crossing/learn?step=${entry}`)
  const context = page.getByRole('region', { name: '当前执行上下文', exact: true })
  await expect(context.getByTestId('variable-return_value')).toContainText('未赋值')
  await seekStep(page, returned, 'jump')
  await expect(context.getByTestId('variable-return_value')).toContainText('()')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(context.getByRole('heading', { name: '当前函数：check' })).toBeVisible()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(context.getByRole('heading', { name: '当前函数：schedule' })).toBeVisible()
  await expect(context.getByTestId('variable-return_value')).toContainText('()')
})
