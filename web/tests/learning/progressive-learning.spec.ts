import { expect, test } from '../support/learning-test'

test('真实大案例在轨迹完成前显示可浏览步骤', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/cases/carbon-nanotube/learn')
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toBeVisible()
  await expect(page.getByRole('region', { name: '回放控制' })).toContainText('已生成')
  await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  const initialQueue = await page.getByRole('region', { name: '待处理事件队列' }).getByRole('list').textContent()
  await expect.poll(async () => Number(await slider.getAttribute('max'))).toBeGreaterThan(1)
  expect(await page.getByRole('region', { name: '待处理事件队列' }).getByRole('list').textContent()).toBe(initialQueue)
  await expect(page.getByRole('img', { name: /^已发现 / })).toHaveCount(0)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(slider).toHaveValue('1')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(slider).toHaveValue('0')
  await page.getByRole('link', { name: '返回结果查看器' }).click()
  await expect(page.getByRole('region', { name: '回放控制' })).toHaveCount(0)
  expect(errors).toEqual([])
})
