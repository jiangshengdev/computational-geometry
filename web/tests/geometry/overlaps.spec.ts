import { expect, test } from '@playwright/test'
import { checkCase, selectPreset, type ExpectedPair } from '../support/cases'

const cases: { id: string; expected: ExpectedPair[] }[] = [
  { id: 'partial-overlap', expected: [{ pair: [0, 1], interval: [['2', '0'], ['4', '0']] }] },
  { id: 'contained-overlap', expected: [{ pair: [0, 1], interval: [['1', '1'], ['3', '3']] }] },
  { id: 'duplicate-overlap', expected: [[0, 1], [0, 2], [1, 2]].map(pair => ({ pair: pair as [number, number], interval: [['0', '0'], ['4', '0']] })) },
  { id: 'vertical-overlap', expected: [{ pair: [0, 1], interval: [['1/2', '1/3'], ['1/2', '5/3']] }] },
  { id: 'collinear-contact', expected: [{ pair: [0, 1], point: ['2', '2'] }] },
  { id: 'collinear-disjoint', expected: [] },
  { id: 'overlap-group', expected: [{ pair: [0, 1], interval: [['0', '0'], ['6', '0']] }, { pair: [0, 2], interval: [['2', '0'], ['3', '0']] }, { pair: [1, 2], interval: [['2', '0'], ['3', '0']] }] },
]

for (const { id, expected } of cases) test(`重叠案例 ${id} 精确完整区间与逐项选择`, async ({ page }) => {
  await checkCase(page, id, expected)
})

test('较短第三成员不缩短完整重叠的绘制范围', async ({ page }) => {
  await checkCase(page, 'overlap-group', cases.find(c => c.id === 'overlap-group')!.expected)
  await page.getByRole('radio', { name: 'S0 × S1 · 重叠区间', exact: true }).click()
  const interval = page.getByRole('img', { name: '交集 S0 × S1，已选中', exact: true })
  // SVG getBBox measures the geometric centerline, unlike Playwright's
  // painted bounding box, which includes the different selection strokes.
  const long = await interval.locator('line').evaluate(el => (el as SVGGraphicsElement).getBBox().width)
  const short = await page.getByRole('img', { name: '交集 S0 × S2', exact: true }).locator('line').evaluate(el => (el as SVGGraphicsElement).getBBox().width)
  expect(long / short).toBeCloseTo(6, 3)
  const endpoints = await interval.locator('circle').all()
  expect(endpoints).toHaveLength(2)
  const a = await endpoints[0].evaluate(el => (el as SVGCircleElement).cx.baseVal.value)
  const b = await endpoints[1].evaluate(el => (el as SVGCircleElement).cx.baseVal.value)
  expect(Math.abs(a - b)).toBeCloseTo(long, 3)
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(6, 0)')
  await selectPreset(page, 'crossing')
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
})
