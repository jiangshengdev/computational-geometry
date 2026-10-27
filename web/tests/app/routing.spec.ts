import { expect, test } from '@playwright/test'
import { presets } from '../../src/algorithms/segment-intersection/cases/presets'
import { chinese } from '../support/language'

test('预览快捷键：右方向键进入教程，长按不跳过初始步骤', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto('/bo/cases/crossing')
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
  for (const modifier of ['Control', 'Meta', 'Alt', 'Shift']) {
    await page.keyboard.press(`${modifier}+ArrowRight`)
    await expect(page).toHaveURL(/\/bo\/cases\/crossing$/)
  }
  await page.getByRole('button', { name: '案例说明', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/\/bo\/cases\/crossing$/)
  await page.getByRole('button', { name: '关闭帮助' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.down('ArrowRight')
  await expect(page).toHaveURL(/\/bo\/cases\/crossing\/learn(?:\?step=0)?$/)
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toHaveValue('0')
  await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  await expect(slider).toHaveValue('0')
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  await page.goBack()
  await expect(page).toHaveURL(/\/bo\/cases\/crossing$/)
  expect(errors).toEqual([])
})

for (const path of ['/bo/cases/not-a-case', '/bo/cases/crossing/extra', '/bo']) {
  test(`预览快捷键：${path} 没有可进入的教程时保持原页`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveTitle(/ · BO 结果查看器$/)
    const consumed = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      document.body.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(consumed).toBe(false)
    await page.keyboard.press('ArrowRight')
    expect(new URL(page.url()).pathname).toBe(path)
  })
}

test('三页路由：列表能力和直接学习', async ({ page }) => {
  const errors: string[] = []
  const requests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  page.on('request', request => { if (request.url().endsWith('/api/bo/intersections')) requests.push(request.url()) })
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.goto('/bo')
  await expect(page).toHaveTitle('案例列表 · BO 结果查看器')
  await expect(page.getByRole('article')).toHaveCount(presets.length)
  await expect(page.getByRole('region', { name: '原始输入' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: '逐步学习' })).toHaveCount(0)
  for (const preset of presets) {
    const name = chinese._(preset.name)
    const card = page.getByRole('article', { name, exact: true })
    await expect(card).toContainText(chinese._(preset.description))
    const thumbnail = card.getByRole('img', { name: `${name}：输入线段预览`, exact: true })
    await expect(thumbnail).toBeVisible()
    await expect(card.getByRole('link', { name: `查看${name}详情`, exact: true })).toHaveAttribute('href', `/bo/cases/${preset.id}`)
    await expect(thumbnail.locator('.input')).toHaveCount(preset.segments.length)
    await expect(thumbnail.locator('.intersection')).toHaveCount(0)
    expect(await thumbnail.evaluate(svg => Array.from(svg.querySelectorAll('line, path')).every(shape => {
      const box = (shape as SVGGraphicsElement).getBBox()
      return [box.x, box.y, box.width, box.height].every(Number.isFinite)
        && box.x >= 0 && box.y >= 0 && box.x + box.width <= 160 && box.y + box.height <= 120
        && (box.width > 0 || box.height > 0)
    }))).toBe(true)
    if (preset.segments.length === 0) await expect(thumbnail).toContainText('无输入线段')
    await expect(card.getByRole('link', { name: '查看详情', exact: true })).toHaveAttribute('href', `/bo/cases/${preset.id}`)
    await expect(card.getByText('支持教学', { exact: true })).toHaveCount(0)
    const learn = card.getByRole('link', { name: '开始学习', exact: true })
    if (preset.learning) await expect(learn).toHaveAttribute('href', `/bo/cases/${preset.id}/learn`)
    else await expect(learn).toHaveCount(0)
  }
  expect(requests).toEqual([])
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('img', { name: '普通交叉：输入线段预览', exact: true }).click()
  await expect(page).toHaveURL(/\/bo\/cases\/crossing$/)
  await expect(page.getByRole('region', { name: '原始输入' })).toBeVisible()
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await page.getByRole('article', { name: '普通交叉', exact: true }).getByRole('link', { name: '开始学习', exact: true }).click()
  await expect(page).toHaveURL(/\/bo\/cases\/crossing\/learn(?:\?step=0)?$/)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await page.getByRole('link', { name: '返回结果查看器', exact: true }).click()
  await expect(page).toHaveURL(/\/bo\/cases\/crossing$/)
  await expect(page.getByRole('region', { name: '原始输入' })).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await expect(page).toHaveURL('/bo')
  expect(errors).toEqual([])
})

test('三页路由：详情与教学直达刷新并可返回列表', async ({ page }) => {
  await page.goto('/bo/cases/disjoint')
  await expect(page.getByRole('heading', { name: '无交点', exact: true })).toBeVisible()
  await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/\/bo\/cases\/disjoint$/)
  await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()

  await page.goto('/bo/cases/neighbor-removal/learn')
  await expect(page.getByRole('heading', { name: '退出后成为邻居', exact: true })).toBeVisible()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
  await page.reload()
  await expect(page).toHaveURL(/\/bo\/cases\/neighbor-removal\/learn(?:\?step=0)?$/)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()
})

test('三页路由：浏览器历史回到实际来源页面', async ({ page }) => {
  await page.goto('/bo')
  const card = page.getByRole('article', { name: '普通交叉', exact: true })
  await card.getByRole('link', { name: '查看详情', exact: true }).click()
  await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/bo\/cases\/crossing$/)
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('/bo')
  await card.getByRole('link', { name: '开始学习', exact: true }).click()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('/bo')
  await page.goForward()
  await expect(page).toHaveURL(/\/bo\/cases\/crossing\/learn(?:\?step=0)?$/)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
})

test('三页路由：外部直达不伪造来源历史', async ({ page }) => {
  await page.goto('about:blank')
  await page.goto('/bo/cases/crossing/learn')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('about:blank')
})

for (const invalid of [
  { path: '/missing', message: '未知页面路径。' },
  { path: '/bo/cases/not-a-case', message: '未知案例：not-a-case' },
  { path: '/bo/cases/not-a-case/learn', message: '未知案例：not-a-case' },
  { path: '/bo/cases/empty/learn?step=6', message: '教学步骤超出范围：此案例的有效步骤为 0–5。', id: 'empty', learn: true },
  { path: '/bo/cases/crossing/extra', message: '未知页面路径。', id: 'crossing', learn: true },
]) {
  test(`三页路由：非法链接 ${invalid.path} 保留地址并提供恢复入口`, async ({ page }) => {
    await page.goto(invalid.path)
    await expect(page.getByRole('alert')).toContainText(invalid.message)
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(invalid.path)
    await page.reload()
    await expect(page.getByRole('alert')).toContainText(invalid.message)
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(invalid.path)
    await expect(page.getByRole('region', { name: '逐步学习' })).toHaveCount(0)
    if (invalid.path === '/missing') {
      await page.getByRole('link', { name: '计算几何', exact: true }).click()
      await expect(page).toHaveTitle('问题选择 · 计算几何')
      return
    }
    const recovery = page.getByRole('navigation', { name: '恢复导航' })
    await expect(page.getByRole('link', { name: '返回列表', exact: true })).toHaveAttribute('href', '/bo')
    await expect(recovery.getByRole('link', { name: '查看详情', exact: true })).toHaveCount(invalid.id ? 1 : 0)
    await expect(recovery.getByRole('link', { name: '从头学习', exact: true })).toHaveCount(invalid.learn ? 1 : 0)
    if (invalid.learn) {
      await recovery.getByRole('link', { name: '从头学习', exact: true }).click()
      await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
    } else if (invalid.id) {
      await recovery.getByRole('link', { name: '查看详情', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/bo/cases/${invalid.id}$`))
      await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
    } else {
      await recovery.getByRole('link', { name: '返回列表', exact: true }).click()
      await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()
    }
  })
}
