import { expect, test } from './learning-test'
import { formatPoint, samePoint, type Segment } from '../src/geometry'
import { captureDemo, checkPairSelection, checkViewportControls, checkLearningCompletion } from './demo-interactions'
import { captureIntersections } from './trace-navigation'

const demos = [
  ['bridge-truss', '桥梁桁架'], ['meander-window', '回纹窗棂'], ['diagonal-weave', '斜向编织'],
  ['parabolic-strings', '抛物线弦画'], ['star-polygon', '星形多边形'],
  ['graphene', '石墨烯'], ['diamond-lattice', '金刚石晶格'], ['fullerene', '富勒烯 C₆₀'],
  ['carbon-nanotube', '碳纳米管'], ['penrose', '彭罗斯拼贴'],
]

// Worked intersections from the documented line equations, independent of the API.
const workedPoints: Record<string, { pair: number[]; point: string }[]> = {
  'bridge-truss': [{ pair: [2, 3], point: '(2, 2)' }, { pair: [0, 4], point: '(4, 0)' }],
  'meander-window': [{ pair: [5, 6], point: '(0, 8)' }, { pair: [4, 5], point: '(0, 0)' }],
  'diagonal-weave': [{ pair: [2, 7], point: '(6, 6)' }, { pair: [1, 7], point: '(8, 4)' }],
  'parabolic-strings': [{ pair: [5, 7], point: '(0, -1)' }, { pair: [6, 7], point: '(3, 0)' }],
  'star-polygon': [{ pair: [0, 1], point: '(70/17, 0)' }, { pair: [0, 3], point: '(7, -7)' }],
}

for (const [id, name] of demos) for (const width of [1360, 390]) {
  test(`${name}：真实结果、配对交互与教学完成 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.goto('/')
    const card = page.getByRole('article', { name, exact: true })
    await card.scrollIntoViewIfNeeded()
    await expect(card.getByRole('link', { name: '开始学习', exact: true })).toHaveAttribute('href', `/cases/${id}/learn`)
    await captureDemo(page, card, id, width, 'card')
    const capture = await captureIntersections(page)
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.request().method() === 'POST')
    await card.getByRole('link', { name: '查看详情', exact: true }).click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    const input = response.request().postDataJSON() as { segments: Segment[]; trace: boolean }
    const { intersections, trace } = await capture.result
    expect(input.trace).toBe(true)
    expect(input.segments.every(edge => !samePoint(edge.start, edge.end))).toBe(true)
    expect(new Set(input.segments.map(edge => [formatPoint(edge.start), formatPoint(edge.end)].sort().join('|'))).size).toBe(input.segments.length)
    expect(intersections.length).toBeGreaterThan(0)
    expect(intersections.every(result => result.geometry.type === 'point')).toBe(true)
    for (const expected of workedPoints[id] ?? []) {
      const actual = intersections.find(item => item.segments.join(',') === expected.pair.join(','))
      expect(actual?.geometry.type).toBe('point')
      if (actual?.geometry.type === 'point') expect(formatPoint(actual.geometry.point)).toBe(expected.point)
    }
    await expect(page).toHaveTitle(`${name} · 计算结果 · BO 结果查看器`)
    await expect(page.getByText(`${intersections.length} 个相交配对`, { exact: true })).toBeVisible()
    const drawing = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
    await captureDemo(page, drawing, id, width, 'drawing')
    for (const sample of [intersections[0], intersections.at(-1)!]) {
      await checkPairSelection(page, sample)
    }
    await checkViewportControls(page)
    const positions = new Set(intersections.map(item => item.geometry.type === 'point' && formatPoint(item.geometry.point))).size
    await checkLearningCompletion(page, intersections, trace, positions)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
