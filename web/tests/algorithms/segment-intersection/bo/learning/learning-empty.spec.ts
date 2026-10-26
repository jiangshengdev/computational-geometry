import { expect, test } from '../support/learning-test'
import { readTrace } from '../support/trace-navigation'

test('空集合快捷键进入教学，观察 None 退出后刷新保留完成状态', async ({ page }) => {
  await page.goto('/bo/cases/empty')
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/bo\/cases\/empty\/learn$/)
  await expect(page).toHaveTitle('空集合 · 逐步学习 · BO 结果查看器')
  await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toHaveValue('0')
  const trace = await readTrace(page, 'empty')
  const popped = trace.steps.findIndex(step => step.action === 'take-pop')
  for (let step = 1; step <= popped; step++) {
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveValue(String(step))
  }
  await expect(page.getByRole('img', { name: /执行边界/ })).toBeVisible()
  await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue(String(popped + 1))
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('next 为 None')
  await expect(page.getByRole('region', { name: '学习结果' })).toBeVisible()
  await page.reload()
  await expect(page).toHaveTitle('空集合 · 逐步学习 · BO 结果查看器')
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
})
