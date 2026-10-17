import { expect, test } from '@playwright/test'
import { selectPreset } from '../support/cases'

test('普通交叉通过真实服务计算，并联动配对与精确详情', async ({ page }) => {
  await page.goto('/bo/cases/crossing')
  await expect(page.getByRole('heading', { name: '普通交叉', exact: true })).toBeVisible()
  await selectPreset(page, 'crossing')
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'S0 × S1 · 点' }).click()
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(2, 2)')
  await expect(page.getByRole('img', { name: '输入 S0，已选中' })).toBeVisible()
  await expect(page.getByRole('img', { name: '输入 S1，已选中' })).toBeVisible()
  await expect(page.getByRole('img', { name: '交集 S0 × S1，已选中' })).toBeVisible()
})

test('基础空结果及切换清空旧选择', async ({ page }) => {
  await page.goto('/bo/cases/crossing')
  await page.getByRole('radio', { name: 'S0 × S1 · 点' }).click()
  for (const id of ['disjoint', 'empty', 'single']) {
    await selectPreset(page, id)
    await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: '精确详情' })).toContainText('选择一个配对')
    await expect(page.getByRole('alert')).toHaveCount(0)
    if (id === 'empty') await expect(page.getByRole('region', { name: '原始输入' })).toContainText('输入集合为空')
  }
})

test('加载状态与空结果区分，完成后展示真实结果', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/bo/intersections', async route => {
    await gate
    await route.continue()
  })
  await page.goto('/bo/cases/crossing')
  await expect(page.getByRole('status')).toHaveText('正在计算…')
  await expect(page.getByText('没有相交配对', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('选择一个配对')
  release()
  await expect(page.getByRole('status')).toHaveText('1 个相交配对')
  await expect(page.getByText('正在计算…', { exact: true })).toHaveCount(0)
})

test('缩放平移保持等比例几何及选中精确详情', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()) })
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.goto('/bo/cases/crossing')
  await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  await page.getByRole('radio', { name: 'S0 × S1 · 点' }).click()
  const input = page.getByRole('img', { name: '输入 S0，已选中' })
  const geometry = page.locator('g[data-layer="geometry"]')
  const initialTransform = (await geometry.getAttribute('transform'))!
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
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 120)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBefore)
  expect((await input.boundingBox())!.width).toBeCloseTo(panned.width, 3)
  await page.getByRole('button', { name: '缩小', exact: true }).click()
  expect((await input.boundingBox())!.width).toBeCloseTo(before.width, 3)
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(2, 2)')
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await expect(geometry).not.toHaveAttribute('transform', initialTransform)
  await page.getByRole('button', { name: '重置视图' }).click()
  await expect(geometry).toHaveAttribute('transform', initialTransform)
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
    await page.route('**/api/bo/intersections', async route => {
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
    await page.goto('/bo/cases/crossing')
    await expect.poll(() => pending.length).toBeGreaterThan(0)
    await selectPreset(page, 'empty')
    await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
    release()
    await Promise.all(pending)
    await expect(page.getByText('0 个相交配对', { exact: true })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'S0 × S1 · 点' })).toHaveCount(0)
  })
}

test('服务不可用和计算错误不能显示成空结果', async ({ page }) => {
  await page.route('**/api/bo/intersections', route => route.abort('connectionrefused'))
  await page.goto('/bo/cases/crossing')
  await expect(page.getByRole('alert')).toContainText('计算失败')
  await expect(page.getByText('没有相交配对', { exact: true })).toHaveCount(0)
  await page.unroute('**/api/bo/intersections')
  await page.route('**/api/bo/intersections', route => route.fulfill({ status: 500, json: { error: 'failed' } }))
  await selectPreset(page, 'empty')
  await expect(page.getByRole('alert')).toContainText('HTTP 500')
  await expect(page.getByText('没有相交配对', { exact: true })).toHaveCount(0)
})
