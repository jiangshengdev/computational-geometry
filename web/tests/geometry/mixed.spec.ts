import { expect, test } from '@playwright/test'
import { checkCase, selectPreset, type ExpectedPair } from '../support/cases'

const horizontal: ExpectedPair[] = [
  { pair: [0, 1], interval: [['0', '0'], ['4', '0']] },
  { pair: [0, 2], point: ['2', '0'] }, { pair: [1, 2], point: ['2', '0'] },
  { pair: [0, 3], point: ['2', '0'] }, { pair: [1, 3], point: ['2', '0'] }, { pair: [2, 3], point: ['2', '0'] },
  { pair: [0, 4], point: ['0', '0'] }, { pair: [1, 4], point: ['0', '0'] },
  { pair: [0, 5], point: ['2', '0'] }, { pair: [1, 5], point: ['2', '0'] }, { pair: [2, 5], point: ['2', '0'] }, { pair: [3, 5], point: ['2', '0'] },
  { pair: [0, 6], point: ['2', '0'] }, { pair: [1, 6], point: ['2', '0'] }, { pair: [2, 6], point: ['2', '0'] }, { pair: [3, 6], point: ['2', '0'] }, { pair: [5, 6], point: ['2', '0'] },
]
const vertical: ExpectedPair[] = [
  { pair: [0, 1], interval: [['1/2', '0'], ['1/2', '4']] },
  ...[[0, 2], [1, 2], [0, 3], [1, 3], [2, 3], [0, 6], [1, 6], [2, 6], [3, 6]].map(pair => ({ pair: pair as [number, number], point: ['1/2', '2'] as [string, string] })),
  { pair: [0, 4], point: ['1/2', '0'] }, { pair: [1, 4], point: ['1/2', '0'] },
  { pair: [0, 5], point: ['1/2', '4'] }, { pair: [1, 5], point: ['1/2', '4'] },
]

for (const [id, expected] of [['mixed-horizontal', horizontal], ['mixed-vertical', vertical]] as const) {
  test(`混合案例 ${id} 全部精确几何与配对`, async ({ page }) => {
    await checkCase(page, id, expected)
  })
}

test('混合场景缩放平移切换，完整区间与点配对保持一致', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 })
  await checkCase(page, 'mixed-horizontal', horizontal)
  await page.getByRole('radio', { name: 'S0 × S1 · 重叠区间', exact: true }).click()
  const intersection = page.getByRole('img', { name: '交集 S0 × S1，已选中', exact: true })
  const input = page.getByRole('img', { name: '输入 S0，已选中', exact: true })
  const intervalWidth = await intersection.locator('line').evaluate(el => (el as SVGGraphicsElement).getBBox().width)
  const inputWidth = await input.locator('line').evaluate(el => (el as SVGGraphicsElement).getBBox().width)
  expect(intervalWidth).toBeCloseTo(inputWidth, 3)
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await page.getByRole('radio', { name: 'S2 × S3 · 点', exact: true }).click()
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(2, 0)')
  await expect(page.getByRole('img', { name: '输入 S0，已选中', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '重置视图' }).click()
  await selectPreset(page, 'mixed-vertical')
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
  await page.getByRole('radio', { name: 'S0 × S1 · 重叠区间', exact: true }).click()
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(1/2, 4)')
  await selectPreset(page, 'empty')
  await expect(page.getByText('没有相交配对', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /^交集 / })).toHaveCount(0)
})

test('End 定位末个配对并选择精确详情', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 })
  await page.goto('/bo/cases/crossing')
  await selectPreset(page, 'mixed-horizontal')
  await expect(page.getByRole('status')).toHaveText('17 个相交配对')
  const pairs = page.getByRole('radio')
  await pairs.first().click()
  await page.keyboard.press('End')
  await expect(pairs.last()).toBeFocused()
  await page.keyboard.press('Space')
  await expect(pairs.last()).toBeChecked()
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1)
  const details = page.getByRole('region', { name: '精确详情' })
  await expect(details).toContainText('(2, 0)')
  await details.scrollIntoViewIfNeeded()
  await expect(details).toBeInViewport()
  await expect(page.getByRole('region', { name: '原始输入' }).getByRole('listitem')).toHaveCount(7)
})
