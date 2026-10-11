import { expect, test } from './learning-test'
import type { SweepTrace } from '../src/geometry'

test('活动集合中间状态和真实插入可以前进回退', async ({ page }) => {
  const response = page.waitForResponse(response => response.url().endsWith('/api/intersections'))
  await page.goto('/cases/crossing/learn')
  const { trace }: { trace: SweepTrace } = await (await response).json()
  const entry = trace.steps.findIndex(step => step.execution.module === 'activity' && step.execution.entry)
  expect(entry).toBeGreaterThan(0)
  await page.goto(`/cases/crossing/learn?step=${entry}`)
  const panel = page.getByRole('region', { name: '核心代码回放' })
  await expect(panel).toContainText('第一条核心语句之前')
  await expect(panel.getByTestId('variable-position')).toContainText('未赋值')
  const insertion = trace.steps.findIndex(step => step.action === 'insert')
  await page.goto(`/cases/crossing/learn?step=${insertion - 1}`)
  await expect(panel.getByTestId('variable-active')).toContainText('[]')
  const before = await panel.locator('dd').allTextContents()
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(panel.getByTestId('variable-active')).toContainText('[0]')
  await expect(page.getByRole('region', { name: '活动线段顺序' })).toContainText('S0')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  expect(await panel.locator('dd').allTextContents()).toEqual(before)
})
