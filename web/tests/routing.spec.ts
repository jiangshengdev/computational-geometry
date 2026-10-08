import { expect, test } from '@playwright/test'
import { presets } from '../src/presets'

test('三页路由：列表进入详情再进入教学', async ({ page }) => {
  await page.goto('/')
  const crossing = page.getByRole('article').filter({ has: page.getByRole('heading', { name: '普通交叉', exact: true }) })
  await expect(crossing).toBeVisible()
  await crossing.getByRole('link', { name: '查看详情', exact: true }).click()
  await expect(page).toHaveURL(/\/cases\/crossing$/)
  await expect(page.getByRole('region', { name: '原始输入' })).toBeVisible()
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
  await expect(page).toHaveURL(/\/cases\/crossing\/learn(?:\?step=0)?$/)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
})

for (const width of [1360, 390]) {
  test(`三页路由：列表能力和直接学习 ${width}px`, async ({ page }) => {
    const errors: string[] = []
    const requests: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    page.on('request', request => { if (request.url().endsWith('/api/intersections')) requests.push(request.url()) })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page).toHaveTitle('BO 结果查看器')
    await expect(page.getByRole('article')).toHaveCount(presets.length)
    await expect(page.getByRole('region', { name: '原始输入' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: '逐步学习' })).toHaveCount(0)
    for (const preset of presets) {
      const card = page.getByRole('article', { name: preset.name, exact: true })
      await expect(card).toContainText(preset.description)
      await expect(card.getByRole('link', { name: '查看详情', exact: true })).toHaveAttribute('href', `/cases/${preset.id}`)
      await expect(card.getByText('支持教学', { exact: true })).toHaveCount(preset.learning ? 1 : 0)
      const learn = card.getByRole('link', { name: '开始学习', exact: true })
      if (preset.learning) await expect(learn).toHaveAttribute('href', `/cases/${preset.id}/learn`)
      else await expect(learn).toHaveCount(0)
    }
    expect(requests).toEqual([])
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `/tmp/geometry-routing-${width === 1360 ? 'desktop' : 'mobile'}.png`, fullPage: true })
    await page.getByRole('article', { name: '普通交叉', exact: true }).getByRole('link', { name: '开始学习', exact: true }).click()
    await expect(page).toHaveURL(/\/cases\/crossing\/learn(?:\?step=0)?$/)
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '0')
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await page.getByRole('link', { name: '返回结果查看器', exact: true }).click()
    await expect(page).toHaveURL(/\/cases\/crossing$/)
    await expect(page.getByRole('region', { name: '原始输入' })).toBeVisible()
    await expect(page.getByRole('combobox')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('link', { name: '返回列表', exact: true }).click()
    await expect(page).toHaveURL('http://127.0.0.1:4173/')
    expect(errors).toEqual([])
  })
}

test('三页路由：详情与教学直达刷新并可返回列表', async ({ page }) => {
  await page.goto('/cases/disjoint')
  await expect(page.getByRole('heading', { name: '无交点', exact: true })).toBeVisible()
  await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/\/cases\/disjoint$/)
  await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()

  await page.goto('/cases/neighbor-removal/learn')
  await expect(page.getByRole('heading', { name: '退出后成为邻居', exact: true })).toBeVisible()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '0')
  await page.reload()
  await expect(page).toHaveURL(/\/cases\/neighbor-removal\/learn(?:\?step=0)?$/)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '0')
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()
})

test('三页路由：浏览器历史回到实际来源页面', async ({ page }) => {
  await page.goto('/')
  const card = page.getByRole('article', { name: '普通交叉', exact: true })
  await card.getByRole('link', { name: '查看详情', exact: true }).click()
  await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/cases\/crossing$/)
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('http://127.0.0.1:4173/')
  await card.getByRole('link', { name: '开始学习', exact: true }).click()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('http://127.0.0.1:4173/')
  await page.goForward()
  await expect(page).toHaveURL(/\/cases\/crossing\/learn(?:\?step=0)?$/)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
})

test('三页路由：外部直达不伪造来源历史', async ({ page }) => {
  await page.goto('about:blank')
  await page.goto('/cases/crossing/learn')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('about:blank')
})

for (const invalid of [
  { path: '/missing', message: '未知页面路径。' },
  { path: '/cases/not-a-case', message: '未知案例：not-a-case' },
  { path: '/cases/not-a-case/learn', message: '未知案例：not-a-case' },
  { path: '/cases/empty/learn', message: '此案例不支持教学。', id: 'empty' },
  { path: '/cases/crossing/extra', message: '未知页面路径。', id: 'crossing', learn: true },
]) {
  test(`三页路由：非法链接 ${invalid.path} 保留地址并提供恢复入口`, async ({ page }) => {
    await page.goto(invalid.path)
    await expect(page.getByRole('alert')).toContainText(invalid.message)
    expect(new URL(page.url()).pathname).toBe(invalid.path)
    await page.reload()
    await expect(page.getByRole('alert')).toContainText(invalid.message)
    expect(new URL(page.url()).pathname).toBe(invalid.path)
    await expect(page.getByRole('region', { name: '逐步学习' })).toHaveCount(0)
    const recovery = page.getByRole('navigation', { name: '恢复导航' })
    await expect(recovery.getByRole('link', { name: '返回列表', exact: true })).toHaveAttribute('href', '/')
    await expect(recovery.getByRole('link', { name: '查看详情', exact: true })).toHaveCount(invalid.id ? 1 : 0)
    await expect(recovery.getByRole('link', { name: '从头学习', exact: true })).toHaveCount(invalid.learn ? 1 : 0)
    if (invalid.learn) {
      await recovery.getByRole('link', { name: '从头学习', exact: true }).click()
      await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('aria-valuenow', '0')
    } else if (invalid.id) {
      await recovery.getByRole('link', { name: '查看详情', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/cases/${invalid.id}$`))
      await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
    } else {
      await recovery.getByRole('link', { name: '返回列表', exact: true }).click()
      await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()
    }
  })
}
