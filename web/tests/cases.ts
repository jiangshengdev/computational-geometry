import { expect, type Page } from '@playwright/test'

export interface ExpectedPair { pair: [number, number]; point?: [string, string]; interval?: [[string, string], [string, string]] }
const coordinate = (value: string) => {
  const [numerator, denominator = '1'] = value.split('/')
  return { numerator, denominator }
}
const point = ([x, y]: [string, string]) => ({ x: coordinate(x), y: coordinate(y) })
const display = ([x, y]: [string, string]) => `(${x}, ${y})`

/** Expected values are worked examples in each spec, not runtime answers. */
export async function checkCase(page: Page, id: string, expected: ExpectedPair[]) {
  await page.goto('/')
  const response = page.waitForResponse(r => r.url().endsWith('/api/intersections') && r.request().method() === 'POST')
  await page.getByLabel('预设案例').selectOption(id)
  // If initial crossing response raced with selection, wait for this case's rendered state too.
  await response
  await expect(page.getByText(`${expected.length} 个相交配对`, { exact: true })).toBeVisible()
  const buttons = page.getByRole('list').filter({ has: page.getByRole('button', { name: /S\d+ × S\d+/ }) }).getByRole('button')
  await expect(buttons).toHaveCount(expected.length)
  for (const item of expected) {
    const name = `S${item.pair[0]} × S${item.pair[1]}`
    await page.getByRole('button', { name: `${name} · ${item.point ? '点' : '重叠区间'}`, exact: true }).click()
    const details = page.getByRole('region', { name: '精确详情' })
    if (item.point) await expect(details).toContainText(display(item.point))
    else for (const endpoint of item.interval!) await expect(details).toContainText(display(endpoint))
    for (const i of item.pair) await expect(page.getByRole('img', { name: `输入 S${i}，已选中`, exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /^输入 S\d+，已选中$/ })).toHaveCount(2)
    await expect(page.getByRole('img', { name: `交集 ${name}，已选中`, exact: true })).toBeVisible()
  }
}

export async function checkResponse(page: Page, id: string, expected: ExpectedPair[]) {
  await page.goto('/')
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/intersections'))
  await page.getByLabel('预设案例').selectOption(id)
  const response = await responsePromise
  expect(response.status()).toBe(200)
  const { intersections } = await response.json()
  expect(intersections).toHaveLength(expected.length)
  for (const item of expected) {
    const actual = intersections.find((r: { segments: number[] }) => r.segments.join(',') === item.pair.join(','))
    expect(actual).toBeDefined()
    if (item.point) expect(actual.geometry).toEqual({ type: 'point', point: point(item.point) })
    else {
      expect(actual.geometry.type).toBe('overlap')
      expect([actual.geometry.start, actual.geometry.end]).toEqual(expect.arrayContaining(item.interval!.map(point)))
    }
  }
}
