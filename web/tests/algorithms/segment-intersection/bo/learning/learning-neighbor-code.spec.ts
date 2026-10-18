import { expect, test } from '../support/learning-test'
import { readResponse } from '../support/trace-navigation'

test('真实几何调用返回后才显示结果，返回调用方和回退同步', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/bo/intersections'))
  await page.goto('/bo/cases/crossing/learn')
  const { trace } = await readResponse(await response)
  const call = trace.steps.findIndex(step => step.execution.context.function === 'schedule_neighbors')
  expect(call).toBeGreaterThan(0)
  await page.goto(`/bo/cases/crossing/learn?step=${call}`)
  const panel = page.getByRole('region', { name: '核心变量', exact: true })
  await expect(panel.getByTestId('variable-return_value')).toContainText('未赋值')
  const returned = trace.steps.findIndex((step, i) => i > call && step.execution.module === 'neighbors' && step.execution.context.locals.some(v => v.name === 'candidate' && v.availability === 'available'))
  expect(returned).toBeGreaterThan(call)
  await page.goto(`/bo/cases/crossing/learn?step=${returned}`)
  await expect(panel.getByRole('heading', { name: '当前函数：sweep' })).toBeVisible()
  await expect(panel.getByTestId('variable-candidate')).toContainText('Some')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(panel.getByRole('heading', { name: '当前函数：schedule_neighbors' })).toBeVisible()
  await expect(panel.getByTestId('variable-return_value')).toContainText('Some')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(panel.getByTestId('variable-candidate')).toContainText('Some')
  await expect(panel.getByTestId('variable-return_value')).toHaveCount(0)
})
