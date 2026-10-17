import { expect, test } from '@playwright/test'

test('算法首页可进入 BO 与凸包占位，凸包不发起计算', async ({ page }) => {
  const errors: string[] = []
  const requests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()) })
  await page.goto('/')
  await expect(page).toHaveTitle('算法选择 · 计算几何')
  await page.getByRole('link', { name: 'Bentley–Ottmann', exact: true }).click()
  await expect(page).toHaveURL('/bo')
  await expect(page.getByRole('region', { name: '案例列表', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '算法首页', exact: true }).click()
  await page.getByRole('link', { name: '凸包', exact: true }).click()
  await expect(page).toHaveURL('/convex-hull')
  await expect(page.getByRole('heading', { name: '凸包', exact: true })).toBeVisible()
  await expect(page.getByText('尚未实现', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page).toHaveTitle('凸包 · 计算几何')
  await expect(page.getByText('尚未实现', { exact: true })).toBeVisible()
  expect(requests).toEqual([])
  await page.getByRole('button', { name: 'Language / 语言' }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  await expect(page.getByText('Not implemented yet', { exact: true })).toBeVisible()
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const path of ['/cases/crossing', '/cases/crossing/learn?step=2']) {
  test(`旧 BO 页面停用且不重定向：${path}`, async ({ page }) => {
    const computations: string[] = []
    page.on('request', request => { if (request.url().includes('/api/')) computations.push(request.url()) })
    await page.goto(path)
    await expect(page.getByRole('alert')).toContainText('未知页面路径。')
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(path)
    await expect(page.getByRole('region', { name: '原始输入', exact: true })).toHaveCount(0)
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveCount(0)
    expect(computations).toEqual([])
    await page.getByRole('link', { name: '算法首页', exact: true }).click()
    await expect(page).toHaveURL('/')
    await expect(page).toHaveTitle('算法选择 · 计算几何')
  })
}
