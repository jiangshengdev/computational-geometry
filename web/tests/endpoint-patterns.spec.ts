import { expect, test } from './learning-test'
import { formatPoint, samePoint, type Segment } from '../src/geometry'
import { checkPairSelection, checkLearningCompletion } from './demo-interactions'
import { captureIntersections, captureResult } from './trace-navigation'

const patterns = [
  { id: 'spider-web', name: '蜘蛛网', edges: 32, positions: 17, pairs: 100, junctions: [
    { point: '(0, 0)', degree: 8 }, { point: '(12, 0)', degree: 4 }, { point: '(24, 0)', degree: 3 },
  ] },
  { id: 'hexagonal-snowflake', name: '六角雪花', edges: 42, positions: 13, pairs: 87, junctions: [
    { point: '(0, 0)', degree: 6 }, { point: '(3, 0)', degree: 4 }, { point: '(6, 0)', degree: 4 },
  ] },
]

for (const pattern of patterns) {
  test(`${pattern.name}：真实求交、端点结构与教学完成`, async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
    await page.goto('/')
    const card = page.getByRole('article', { name: pattern.name, exact: true })
    await card.scrollIntoViewIfNeeded()
    await expect(card.getByRole('link', { name: '开始学习', exact: true })).toHaveAttribute('href', `/cases/${pattern.id}/learn`)
    const capture = await captureResult(page)
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.request().method() === 'POST')
    await card.getByRole('link', { name: '查看详情', exact: true }).click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    const input = response.request().postDataJSON() as { segments: Segment[]; trace: boolean }
    const { intersections } = await capture.result
    expect(input.trace).toBe(false)
    expect(input.segments).toHaveLength(pattern.edges)
    expect(input.segments.every(edge => !samePoint(edge.start, edge.end))).toBe(true)
    expect(new Set(input.segments.map(edge => [formatPoint(edge.start), formatPoint(edge.end)].sort().join('|'))).size).toBe(pattern.edges)
    expect(intersections).toHaveLength(pattern.pairs)
    expect(new Set(intersections.map(result => result.geometry.type === 'point' && formatPoint(result.geometry.point))).size).toBe(pattern.positions)
    // These patterns meet only at endpoints. Reject interior crossings and overlaps.
    for (const result of intersections) {
      expect(result.geometry.type).toBe('point')
      if (result.geometry.type !== 'point') throw new Error('端点图案不应含重叠区间')
      const contact = result.geometry.point
      for (const id of result.segments) expect([input.segments[id].start, input.segments[id].end].some(p => samePoint(p, contact))).toBe(true)
    }
    // Independent graph expectations: a degree-d junction has d(d-1)/2 pairs.
    for (const junction of pattern.junctions) {
      const incident = input.segments.flatMap((edge, id) => [edge.start, edge.end].some(p => formatPoint(p) === junction.point) ? [id] : [])
      expect(incident).toHaveLength(junction.degree)
      const expectedPairs = incident.flatMap((a, index) => incident.slice(index + 1).map(b => `${a},${b}`)).sort()
      const actual = intersections.filter(result => result.geometry.type === 'point' && formatPoint(result.geometry.point) === junction.point)
      expect(actual.map(result => result.segments.join(',')).sort()).toEqual(expectedPairs)
      const sample = actual[0]
      await checkPairSelection(page, sample)
    }
    await expect(page.getByText(`${pattern.pairs} 个相交配对`, { exact: true })).toBeVisible()
    const lastPair = page.getByRole('radio').last()
    await lastPair.scrollIntoViewIfNeeded()
    await expect(lastPair).toBeInViewport()
    await lastPair.click()
    await expect(page.getByRole('region', { name: '精确详情' })).not.toContainText('选择一个配对')
    await checkLearningCompletion(page, intersections, pattern.positions)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

for (const pattern of patterns) {
  test(`${pattern.name}：从列表进入学习，连接点逐对记录`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const capture = await captureIntersections(page)
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.request().method() === 'POST')
    await page.getByRole('article', { name: pattern.name, exact: true }).getByRole('link', { name: '开始学习', exact: true }).click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    expect(response.request().postDataJSON().trace).toBe(true)
    const { trace } = await capture.result
    const junction = pattern.junctions[1]
    const index = trace.steps.findIndex(step => step.action === 'record' && step.current && formatPoint(step.current) === junction.point)
    expect(index).toBeGreaterThan(0)
    const stepResponse = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.request().method() === 'POST')
    await page.goto(`/cases/${pattern.id}/learn?step=${index}`)
    expect(await (await stepResponse).finished()).toBeNull()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    await expect(slider).toHaveValue(String(index))
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText(junction.point)
    await expect(page.getByRole('region', { name: '同点参与线段' })).toContainText('穿过：无')
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('在这里接触')
    expect(trace.steps[index].starts.length + trace.steps[index].ends.length).toBe(junction.degree)
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(slider).toHaveValue(String(index + 1))
  })
}
