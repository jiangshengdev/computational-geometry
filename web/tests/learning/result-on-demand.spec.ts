import { expect, test } from '../support/learning-test'

test('普通结果独立计算，进入学习后才请求轨迹', async ({ page }) => {
  const requests: { trace?: boolean }[] = []
  page.on('request', request => {
    if (request.url().endsWith('/api/bo/intersections')) requests.push(request.postDataJSON())
  })
  await page.goto('/cases/crossing')
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  expect(requests.length).toBeGreaterThan(0)
  expect(requests.every(request => !request.trace)).toBe(true)
  await page.reload()
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  expect(requests.every(request => !request.trace)).toBe(true)
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
  expect(requests.some(request => request.trace)).toBe(true)
})
