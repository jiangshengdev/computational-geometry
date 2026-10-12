import { expect, test, type Page } from './learning-test'
import { readTrace, seekStep, stepIndex } from './trace-navigation'

async function startLearning(page: Page) {
  await page.goto('/cases/crossing/learn')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
  return readTrace(page, 'crossing')
}

test('状态动画：换序块暂离与重插可反向恢复', async ({ page }) => {
  const trace = await startLearning(page)
  const reorder = stepIndex(trace, step => step.action === 'reorder')
  const removal = stepIndex(trace, step => step.execution.module === 'activity' && step.execution.boundary === 2 && step.current?.x.numerator === '2')
  await jumpTo(page, removal - 1)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('空')
  await jumpTo(page, reorder - 1)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('S1S0')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('空')
  await jumpTo(page, removal)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('S0S1')
})

async function jumpTo(page: Page, step: number) {
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await seekStep(page, step)
  await expect(slider).toHaveValue(String(step))
  await slider.blur()
}

test('状态动画：取出队首与绑定当前事件可逐步恢复', async ({ page }) => {
  await startLearning(page)
  const text = 'S0 起点 (0, 0)'
  const current = page.getByRole('region', { name: '当前事件' })
  const pending = page.getByRole('region', { name: '待处理事件队列' })
  await jumpTo(page, 1)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current).toContainText('尚未处理事件')
  await expect(pending).not.toContainText(text)
  await expect(page.getByTestId('variable-next')).toContainText('Some')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(current).toContainText(text)
  await expect(pending).not.toContainText(text)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(current).toContainText('尚未处理事件')
  await expect(pending).not.toContainText(text)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(pending).toContainText(text)
  await expect(page.getByTestId('variable-next')).toContainText('未赋值')
})

test('状态动画：活动线段进入、退出与反向插入', async ({ page }) => {
  const trace = await startLearning(page)
  await jumpTo(page, stepIndex(trace, step => step.action === 'insert') - 1)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('S0')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('空')
  await jumpTo(page, stepIndex(trace, step => step.action === 'remove' && step.subjects.includes(1)) - 1)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('S0')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('S1S0')
})

test('状态动画：换序中断与跳转隔离', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 })
  const trace = await startLearning(page)
  const reorder = stepIndex(trace, step => step.action === 'reorder')
  await jumpTo(page, reorder - 1)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(reorder))
  const order = page.getByTestId('active-order')
  await expect(order).toHaveText('S1S0')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(order).toHaveText('空')
  await page.keyboard.press('ArrowRight')
  await order.getByText('S0', { exact: true }).hover()
  await expect(page.getByRole('img', { name: '输入 S0', exact: true })).toHaveAttribute('data-highlighted', 'true')
  await jumpTo(page, 0)
  await expect(order).toHaveText('空')
  await expect(page.locator('aside li')).toHaveCount(4)
})
