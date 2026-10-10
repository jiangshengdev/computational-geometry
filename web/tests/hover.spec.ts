import { expect, test, type Page } from '@playwright/test'
import { selectPreset } from './cases'

async function highlighted(page: Page, inputs: number[], pairs: string[]) {
  await expect.poll(() => page.locator('.drawing .input[data-highlighted="true"] text').allTextContents())
    .toEqual(inputs.map(i => `S${i}`))
  await expect.poll(() => page.locator('.input-item[data-highlighted="true"] strong').allTextContents())
    .toEqual(inputs.map(i => `S${i}`).sort())
  await expect.poll(async () => (await page.locator('.pair-item[data-highlighted="true"]').allTextContents())
    .map(text => text.trim().split(' · ')[0]).sort()).toEqual([...pairs].sort())
  await expect(page.locator('.drawing .intersection[data-highlighted="true"]')).toHaveCount(pairs.length)
}

async function pointCenter(page: Page, pair: string) {
  const box = (await page.getByRole('img', { name: new RegExp(`^交集 ${pair}`) }).locator('circle').first().boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
}

test('hover 三处双向联动，重合位置整体命中而标签精确命中', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/cases/crossing')
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await page.getByRole('button', { name: '图例与操作说明' }).hover()
  await expect(page.getByRole('tooltip')).toContainText('菱形：零长度输入')
  await expect(page.getByRole('tooltip')).toContainText('蓝色：输入')
  await expect(page.getByRole('tooltip')).toContainText('橙色：交集')
  await expect(page.getByRole('tooltip')).not.toContainText('活动线段')
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await selectPreset(page, 'point-inputs')
  await expect(page.getByText('4 个相交配对', { exact: true })).toBeVisible()
  const details = page.getByRole('region', { name: '精确详情' })
  await page.locator('.input-item').filter({ hasText: /^S1\b/ }).hover()
  await highlighted(page, [1], ['S0 × S1', 'S1 × S4'])
  await expect(details).toContainText('选择一个配对')
  await page.locator('.drawing text[data-input="3"]').hover()
  await highlighted(page, [3], [])
  await page.locator('.drawing text[data-input="1"]').hover()
  await highlighted(page, [1], ['S0 × S1', 'S1 × S4'])
  await pointCenter(page, 'S0 × S1')
  await highlighted(page, [0, 1, 4], ['S0 × S1', 'S0 × S4', 'S1 × S4'])
  await page.getByRole('radio', { name: 'S0 × S2 · 点', exact: true }).click()
  await expect(details).toContainText('S0 × S2')
  const saved = await details.innerText()
  await page.getByRole('radio', { name: 'S0 × S1 · 点', exact: true }).hover()
  await expect(page.locator('.drawing .input[data-highlighted="true"]')).toHaveCount(2)
  await expect(page.locator('.input-item[data-highlighted="true"] strong')).toHaveText(['S0', 'S1'])
  await expect(details).toHaveText(saved, { useInnerText: true })
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(page.locator('.input-item[data-highlighted="true"] strong')).toHaveText(['S0', 'S2'])
  await expect(page.getByRole('radio', { name: 'S0 × S2 · 点', exact: true })).toBeChecked()
  await selectPreset(page, 'pure-points')
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await expect(page.locator('.drawing [data-highlighted="true"]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('hover 重复区间在缩放、平移与窄屏下整体命中', async ({ page }) => {
  await page.goto('/cases/crossing')
  await selectPreset(page, 'duplicate-overlap')
  await expect(page.getByText('3 个相交配对', { exact: true })).toBeVisible()
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.getByRole('button', { name: '重置视图' }).click()
    await page.getByRole('button', { name: '放大', exact: true }).click()
    const chart = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
    await chart.scrollIntoViewIfNeeded()
    const chartBox = (await chart.boundingBox())!
    await page.mouse.move(chartBox.x + chartBox.width / 2, chartBox.y + 100)
    await page.mouse.down()
    await page.mouse.move(chartBox.x + chartBox.width / 2 + 15, chartBox.y + 115)
    await page.mouse.up()
    const line = (await page.locator('.drawing .intersection line').first().boundingBox())!
    await page.mouse.move(line.x + line.width / 2, line.y + line.height / 2)
    await highlighted(page, [0, 1, 2], ['S0 × S1', 'S0 × S2', 'S1 × S2'])
  }
})
