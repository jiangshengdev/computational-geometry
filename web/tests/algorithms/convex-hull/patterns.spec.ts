import { expect, test } from '@playwright/test'
import { formatPoint, type Point } from '../../../src/geometry/geometry'

test.use({ locale: 'en-US' })

// Independent geometric expectations: outer octagon, rectangle corners, six
// snowflake tips (the forks lie on or inside their hexagon), and extreme endpoints.
const cases = [
  { id: 'spider-web', name: 'Spider web', count: 17, shape: 'polygon',
    vertices: ['(-24, 0)', '(-16, -16)', '(0, -24)', '(16, -16)', '(24, 0)', '(16, 16)', '(0, 24)', '(-16, 16)'],
    explanation: 'The outer ring determines the hull; the inner ring and center lie inside.' },
  { id: 'bridge-truss', name: 'Bridge truss', count: 10, shape: 'polygon',
    vertices: ['(0, 0)', '(16, 0)', '(16, 4)', '(0, 4)'],
    explanation: 'The four corners form the hull, excluding collinear joints along its edges.' },
  { id: 'hexagonal-snowflake', name: 'Hexagonal snowflake', count: 43, shape: 'polygon',
    vertices: ['(-8, 0)', '(-4, -866/125)', '(4, -866/125)', '(8, 0)', '(4, 866/125)', '(-4, 866/125)'],
    explanation: 'The shape uses the fixed rational approximation √3/2 ≈ 433/500; hull computation is exact for the submitted coordinates.' },
  { id: 'all-collinear', name: 'All collinear', count: 5, shape: 'segment',
    vertices: ['(-2, -2)', '(4, 4)'], explanation: 'Only the two extreme endpoints remain' },
  { id: 'empty', name: 'Empty set', count: 0, shape: null,
    vertices: [], explanation: 'the computation succeeds with an empty hull' },
  { id: 'single', name: 'Single point', count: 1, shape: 'point',
    vertices: ['(2, 3)'], explanation: 'displayed as a point' },
  { id: 'two-points', name: 'Two points', count: 2, shape: 'segment',
    vertices: ['(-2, 1)', '(4, 3)'], explanation: 'Two distinct points form a segment' },
]

for (const preset of cases) {
  test(`pattern navigation and exact result: ${preset.id}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/convex-hull')
    await expect(page.getByRole('article')).toHaveCount(10)
    const card = page.getByRole('article', { name: preset.name, exact: true })
    await expect(card).toContainText(preset.explanation)
    const preview = card.getByRole('img', { name: 'Input point preview' })
    await expect(preview.locator('circle')).toHaveCount(preset.count)
    await expect(preview.locator('line, polyline, polygon')).toHaveCount(0)
    const pending = page.waitForResponse(response => response.url().endsWith('/api/convex-hull') && response.ok())
    await card.getByRole('button', { name: 'View details', exact: true }).click()
    const response = await pending
    const input = response.request().postDataJSON().points as Point[]
    expect(input).toHaveLength(preset.count)
    expect((await response.json()).vertices.map(formatPoint)).toEqual(preset.vertices)
    await expect(page).toHaveURL(`/convex-hull/cases/${preset.id}`)
    await expect(page.getByRole('region', { name: 'Input points', exact: true }).getByLabel('Point count')).toHaveText(String(preset.count))
    await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByLabel('Point count')).toHaveText(String(preset.vertices.length))
    const inputRows = page.getByRole('region', { name: 'Input points', exact: true }).getByRole('listitem')
    await expect(inputRows).toHaveText(input.map((p, index) => `P${index} ${formatPoint(p)}`))
    const hullRows = page.getByRole('region', { name: 'Hull vertices', exact: true }).getByRole('listitem')
    await expect(hullRows).toHaveText(preset.vertices.map((p, index) => `V${index} ${p}`))
    const plot = page.getByRole('group', { name: 'Convex hull plot', exact: true })
    await expect(plot.getByRole('button')).toHaveCount(preset.count)
    await expect(plot.locator('[data-hull]')).toHaveCount(preset.shape ? 1 : 0)
    if (preset.shape) await expect(plot.locator(`[data-hull="${preset.shape}"]`)).toHaveCount(1)
    await expect(plot.locator('line')).toHaveCount(0)
    if (preset.id === 'bridge-truss') expect(input.every(p => ['0', '4'].includes(p.y.numerator))).toBe(true)
    await page.reload()
    await expect(hullRows).toHaveText(preset.vertices.map((p, index) => `V${index} ${p}`))
    await expect(page.getByRole('region', { name: 'Input points', exact: true }).getByLabel('Point count')).toHaveText(String(preset.count))
    await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByLabel('Point count')).toHaveText(String(preset.vertices.length))
    await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
    await expect(page).toHaveURL('/convex-hull')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
