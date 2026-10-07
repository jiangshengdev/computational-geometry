import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('普通交叉通过真实服务计算，并联动配对与精确详情', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BO 结果查看器' })).toBeVisible()
  await page.getByLabel('预设案例').selectOption('crossing')
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'S0 × S1 · 点' }).click()
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(2, 2)')
  await expect(page.getByRole('img', { name: '输入 S0，已选中' })).toBeVisible()
  await expect(page.getByRole('img', { name: '输入 S1，已选中' })).toBeVisible()
  await expect(page.getByRole('img', { name: '交集 S0 × S1，已选中' })).toBeVisible()
})

test('基础空结果及切换清空旧选择', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'S0 × S1 · 点' }).click()
  for (const id of ['disjoint', 'empty', 'single']) {
    await page.getByLabel('预设案例').selectOption(id)
    await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { pressed: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: '精确详情' })).toContainText('选择一个配对')
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
})

test('缩放平移保持等比例几何及选中精确详情，桌面和手机可用', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.goto('/')
  await expect(page).toHaveTitle('BO 结果查看器')
  await page.getByRole('button', { name: 'S0 × S1 · 点' }).click()
  const input = page.getByRole('img', { name: '输入 S0，已选中' })
  const before = (await input.boundingBox())!
  await page.getByRole('button', { name: '放大', exact: true }).click()
  const after = (await input.boundingBox())!
  expect(after.width / before.width).toBeCloseTo(after.height / before.height, 3)
  expect(after.width).toBeGreaterThan(before.width)
  const drawing = (await page.getByRole('img', { name: '输入与交集坐标图', exact: true }).boundingBox())!
  await page.mouse.move(drawing.x + drawing.width / 2, drawing.y + drawing.height / 2)
  await page.mouse.down()
  await page.mouse.move(drawing.x + drawing.width / 2 + 30, drawing.y + drawing.height / 2 + 20, { steps: 4 })
  await page.mouse.up()
  const panned = (await input.boundingBox())!
  expect(panned.x - after.x).toBeCloseTo(30, 0)
  expect(panned.y - after.y).toBeCloseTo(20, 0)
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(2, 2)')
  await page.getByRole('button', { name: '重置视图' }).click()
  await page.screenshot({ path: join(tmpdir(), 'bo-viewer-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'S0 × S1 · 点' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ path: join(tmpdir(), 'bo-viewer-mobile.png'), fullPage: true })
  expect(errors).toEqual([])
})

for (const late of ['success', 'failure']) {
  test(`旧请求迟到 ${late} 不覆盖当前案例`, async ({ page }) => {
    // Disable cancellation only in this boundary test to exercise stale-response isolation.
    await page.addInitScript(() => {
      const original = window.fetch
      window.fetch = (input, init) => original(input, { ...init, signal: undefined })
    })
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const pending: Promise<void>[] = []
    await page.route('**/api/intersections', async route => {
      if (route.request().postDataJSON().segments.length === 2) {
        const operation = (async () => {
          await gate
          await route.fulfill({ status: late === 'success' ? 200 : 500, json: late === 'success'
            ? { intersections: [{ segments: [0, 1], geometry: { type: 'point', point: { x: { numerator: '2', denominator: '1' }, y: { numerator: '2', denominator: '1' } } } }] }
            : { error: 'delayed failure' } })
        })()
        pending.push(operation)
        await operation
      } else await route.continue()
    })
    await page.goto('/')
    await expect.poll(() => pending.length).toBeGreaterThan(0)
    await page.getByLabel('预设案例').selectOption('empty')
    await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
    release()
    await Promise.all(pending)
    await expect(page.getByText('0 个相交配对', { exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'S0 × S1 · 点' })).toHaveCount(0)
  })
}

test('服务不可用和计算错误不能显示成空结果', async ({ page }) => {
  await page.route('**/api/intersections', route => route.abort('connectionrefused'))
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('计算失败')
  await expect(page.getByText('没有相交配对', { exact: true })).toHaveCount(0)
  await page.unroute('**/api/intersections')
  await page.route('**/api/intersections', route => route.fulfill({ status: 500, json: { error: 'failed' } }))
  await page.getByLabel('预设案例').selectOption('empty')
  await expect(page.getByRole('alert')).toContainText('HTTP 500')
  await expect(page.getByText('没有相交配对', { exact: true })).toHaveCount(0)
})
