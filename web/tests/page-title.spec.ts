import { expect, test } from '@playwright/test'

test('标签页标题随导航更新，教学步骤不改变标题', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto('/')
  await expect(page).toHaveTitle('案例列表 · BO 结果查看器')
  const crossing = page.getByRole('article', { name: '普通交叉', exact: true })
  await expect(crossing).toBeVisible()
  await crossing.getByRole('link', { name: '查看详情', exact: true }).click()
  await expect(page).toHaveURL(/\/cases\/crossing$/)
  await expect(page.getByRole('region', { name: '原始输入' })).toBeVisible()
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
  await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
  await expect(page).toHaveURL(/\/cases\/crossing\/learn(?:\?step=0)?$/)
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toHaveValue('0')
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  await expect(page).toHaveURL(/step=1$/)
  await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
  await page.reload()
  await expect(slider).toHaveValue('1')
  await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
  await page.goBack()
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await page.goBack()
  await expect(page).toHaveTitle('案例列表 · BO 结果查看器')
  await page.goForward()
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await page.goForward()
  await expect(slider).toHaveValue('1')
  await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
  await expect(page.getByRole('heading', { name: 'BO 结果查看器', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '普通交叉', exact: true })).toBeVisible()
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const [path, title] of [
  ['/unknown', '链接无效 · BO 结果查看器'],
  ['/cases/not-a-case', '链接无效 · BO 结果查看器'],
  ['/cases/crossing/extra', '链接无效 · 普通交叉 · BO 结果查看器'],
  ['/cases/empty/learn?step=4', '链接无效 · 空集合 · BO 结果查看器'],
  ['/cases/crossing/learn?step=bad', '链接无效 · 普通交叉 · BO 结果查看器'],
  ['/cases/crossing/learn?step=1&step=2', '链接无效 · 普通交叉 · BO 结果查看器'],
  ['/cases/crossing/learn?step=999999', '链接无效 · 普通交叉 · BO 结果查看器'],
]) {
  test(`无效链接标题与恢复：${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('alert')).toContainText('链接无效')
    await expect(page).toHaveTitle(title)
    await page.reload()
    await expect(page.getByRole('alert')).toContainText('链接无效')
    await expect(page).toHaveTitle(title)
    const restart = page.getByRole('link', { name: '从头学习', exact: true })
    if (path.includes('/crossing')) {
      await restart.click()
      await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
      await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
    } else {
      await page.getByRole('link', { name: '返回列表', exact: true }).click()
      await expect(page).toHaveTitle('案例列表 · BO 结果查看器')
    }
  })
}

test('切换案例后标题使用新案例名称', async ({ page }) => {
  await page.goto('/cases/crossing')
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await page.getByRole('link', { name: '查看重叠、交叉与重合点详情', exact: true }).click()
  await expect(page).toHaveTitle('重叠、交叉与重合点 · 计算结果 · BO 结果查看器')
  await expect(page.getByRole('radio').first()).toBeVisible()
})
