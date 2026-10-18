import { expect, test } from '@playwright/test'
import { checkCase, type ExpectedPair } from '../../support/cases'

const cases: { id: string; expected: ExpectedPair[] }[] = [
  { id: 'endpoint', expected: [{ pair: [0, 1], point: ['2', '0'] }] },
  { id: 'interior', expected: [{ pair: [0, 1], point: ['2', '0'] }] },
  { id: 'multiway', expected: [[0, 1], [0, 2], [1, 2]].map(pair => ({ pair: pair as [number, number], point: ['0', '0'] })) },
  { id: 'vertical', expected: [{ pair: [0, 1], point: ['0', '-1'] }, { pair: [0, 2], point: ['0', '1'] }, { pair: [0, 3], point: ['0', '3'] }] },
  { id: 'same-x', expected: [{ pair: [0, 1], point: ['0', '-1'] }, { pair: [2, 3], point: ['0', '3'] }] },
  { id: 'fraction-contact', expected: [[0, 1], [0, 2], [1, 2]].map(pair => ({ pair: pair as [number, number], point: ['1/2', '1/2'] })) },
  { id: 'point-inputs', expected: [{ pair: [0, 1], point: ['2', '0'] }, { pair: [0, 2], point: ['0', '0'] }, { pair: [0, 4], point: ['2', '0'] }, { pair: [1, 4], point: ['2', '0'] }] },
  { id: 'pure-points', expected: [{ pair: [0, 1], point: ['1/3', '2/3'] }] },
  { id: 'point-multiway', expected: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]].map(pair => ({ pair: pair as [number, number], point: ['0', '0'] })) },
]

for (const { id, expected } of cases) test(`接触案例 ${id} 完整精确配对与逐项选择`, async ({ page }) => {
  await checkCase(page, id, expected)
})

test('选中重合点坐标一致，缩放保持精确详情', async ({ page }) => {
  await checkCase(page, 'pure-points', [{ pair: [0, 1], point: ['1/3', '2/3'] }])
  const input = page.getByRole('img', { name: '输入 S0，已选中', exact: true }).locator('path')
  const result = page.getByRole('img', { name: '交集 S0 × S1，已选中', exact: true }).locator('circle')
  const inputBox = (await input.boundingBox())!, resultBox = (await result.boundingBox())!
  expect(inputBox.x + inputBox.width / 2).toBeCloseTo(resultBox.x + resultBox.width / 2, 3)
  expect(inputBox.y + inputBox.height / 2).toBeCloseTo(resultBox.y + resultBox.height / 2, 3)
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(1/3, 2/3)')
})
