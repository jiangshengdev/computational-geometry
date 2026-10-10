import { expect, test } from '@playwright/test'

for (const [id, reason] of [
  ['empty', '没有输入'], ['single', '无法组成两个独立输入的配对'],
  ['disjoint', 'y = 0'], ['collinear-disjoint', '间隙'],
]) test(`无交集教学：${id}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/cases/${id}`)
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const explanation = page.getByRole('region', { name: '操作解释' })
  if (id === 'empty') {
    await expect(next).toBeDisabled()
    await expect(explanation).toContainText('没有输入')
    await expect(explanation).not.toContainText('点击下一步')
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('没有事件')
    await expect(page.getByRole('slider')).toBeDisabled()
  }
  while (await next.isEnabled()) await next.click()
  const result = page.getByRole('region', { name: '学习结果' })
  await expect(result).toContainText('相交线段对：0')
  await expect(result).toContainText(reason)
  await expect(result).toContainText('独立数学核对：')
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(0)
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(page.getByTestId('active-order')).toHaveText('空')
  if (id !== 'empty') await expect(result).toHaveCount(0)
})

test('空集合快捷键进入已完成教学，刷新保留正确标题和状态', async ({ page }) => {
  await page.goto('/cases/empty')
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/cases\/empty\/learn$/)
  await expect(page).toHaveTitle('空集合 · 逐步学习 · BO 结果查看器')
  await expect(page.getByRole('region', { name: '学习结果' })).toBeVisible()
  await page.reload()
  await expect(page).toHaveTitle('空集合 · 逐步学习 · BO 结果查看器')
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
})
