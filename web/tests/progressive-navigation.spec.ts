import { expect, test } from './learning-test'

test('尚未生成的步骤链接允许取消，并保留已生成步骤操作', async ({ page }) => {
  await page.goto('/cases/carbon-nanotube/learn?step=9999999')
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(page.getByRole('status', { name: '步骤等待' })).toContainText('9999999')
  await expect(slider).toHaveValue('0')
  await page.getByRole('button', { name: '取消跳转等待' }).click()
  await expect(page.getByRole('status', { name: '步骤等待' })).toHaveCount(0)
  await expect(page).toHaveURL(/step=0$/)
  await expect.poll(async () => Number(await slider.getAttribute('max'))).toBeGreaterThan(1)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(slider).toHaveValue('1')
  await page.reload()
  await expect(slider).toHaveValue('1')
  await page.getByRole('link', { name: '返回结果查看器' }).click()
})

test('远处步骤生成后准确定位，返回与刷新保持一致', async ({ page }) => {
  await page.goto('/cases/carbon-nanotube/learn?step=2000')
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(page.getByRole('status', { name: '步骤等待' })).toBeVisible()
  // A remote target may take time to generate. Check navigation convergence
  // after that target exists, within the unchanged overall test deadline.
  await page.waitForFunction(() => Number(document.querySelector<HTMLInputElement>('input[aria-label="教学步骤"]')?.max ?? -1) >= 2000)
  await expect(slider).toHaveValue('2000')
  const context = page.getByRole('region', { name: '当前执行上下文' })
  const state = await context.innerText()
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(slider).toHaveValue('1999')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(slider).toHaveValue('2000')
  expect(await context.innerText()).toBe(state)
  await page.reload()
  await page.waitForFunction(() => Number(document.querySelector<HTMLInputElement>('input[aria-label="教学步骤"]')?.max ?? -1) >= 2000)
  await expect(slider).toHaveValue('2000')
  expect(await context.innerText()).toBe(state)
  await page.getByRole('link', { name: '返回结果查看器' }).click()
})
