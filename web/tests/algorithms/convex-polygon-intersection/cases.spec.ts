import { expect, test } from '@playwright/test'
import { formatPoint, type Point } from '../../../src/geometry/geometry'

test.use({ locale: 'en-US' })

const cases = [
  { id: 'overlap', name: 'Overlapping polygons', kind: 'polygon', coordinates: ['(2, 1)', '(4, 1)', '(4, 3)', '(2, 3)'] },
  { id: 'disjoint', name: 'Disjoint polygons', kind: 'empty', coordinates: [] },
  { id: 'contained', name: 'Contained polygon', kind: 'polygon', coordinates: ['(1, 1)', '(3, 1)', '(2, 3)'] },
  { id: 'coincident', name: 'Coincident polygons', kind: 'polygon', coordinates: ['(0, 0)', '(4, 0)', '(4, 4)', '(0, 4)'] },
  { id: 'point-contact', name: 'Point contact', kind: 'point', coordinates: ['(4, 4)'] },
  { id: 'shared-edge', name: 'Shared edge', kind: 'segment', coordinates: ['(4, 1)', '(4, 3)'] },
  { id: 'exact-fractions', name: 'Fractional intersection', kind: 'polygon', coordinates: ['(0, 1)', '(3/2, 3/2)', '(1, 2)', '(0, 2)'] },
]

for (const preset of cases) {
  test(`real service and exact dimension: ${preset.id}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/convex-polygon-intersection')
    const card = page.getByRole('article', { name: preset.name, exact: true })
    await expect(card.getByRole('img')).toBeVisible()
    const pending = page.waitForResponse(response => response.url().endsWith('/api/convex-polygon-intersection') && response.ok())
    if (preset.kind === 'polygon') await card.getByRole('link').click()
    else await card.getByRole('button', { name: 'View details' }).click()
    const response = await pending
    expect((await response.json()).kind).toBe(preset.kind)
    const request = response.request().postDataJSON() as { first: Point[]; second: Point[] }
    for (const [name, prefix, points] of [['Polygon A vertices', 'A', request.first], ['Polygon B vertices', 'B', request.second]] as const) {
      await expect(page.getByRole('region', { name, exact: true }).getByRole('listitem')).toHaveText(points.map((p, index) => `${prefix}${index} ${formatPoint(p)}`))
    }
    await expect(page).toHaveURL(`/convex-polygon-intersection/cases/${preset.id}`)
    await expect(page).toHaveTitle(`${preset.name} · Convex polygon intersection · Computational Geometry`)
    const result = page.getByRole('region', { name: 'Intersection coordinates', exact: true })
    if (preset.kind === 'empty') {
      await expect(page.getByRole('status')).toHaveText('Empty intersection')
      await expect(result).toHaveCount(0)
      await expect(page.locator('[data-result]')).toHaveCount(0)
    } else {
      await expect(result.getByRole('listitem')).toHaveText(preset.coordinates.map((p, index) => `R${index} ${p}`))
      await expect(page.locator(`[data-result="${preset.kind}"]`)).toHaveCount(1)
    }
    await page.reload()
    await expect(page.getByRole('status')).not.toContainText('Computing')
    await expect(result.getByRole('listitem')).toHaveCount(preset.coordinates.length)
    await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
    await expect(page).toHaveURL('/convex-polygon-intersection')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('loading and failure remain distinct from an empty result', async ({ page }) => {
  let release: () => void = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/convex-polygon-intersection', async route => {
    if (route.request().postDataJSON().second[0].x.numerator !== '2') return route.continue()
    await pending
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"failed"}' })
  })
  await page.goto('/convex-polygon-intersection/cases/overlap')
  await expect(page.getByRole('status')).toContainText('Computing')
  await expect(page.getByRole('region', { name: 'Intersection coordinates', exact: true })).toHaveCount(0)
  release()
  await expect(page.getByRole('alert')).toContainText('Computation failed')
  await expect(page.getByText('Empty intersection', { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
  await page.getByRole('article', { name: 'Disjoint polygons', exact: true }).getByRole('button').click()
  await expect(page.getByRole('status')).toHaveText('Empty intersection')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('leaving a pending request keeps the next case result', async ({ page }) => {
  let release: () => void = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/convex-polygon-intersection', async route => {
    if (route.request().postDataJSON().second[0].x.numerator !== '2') return route.continue()
    await pending
    await route.fulfill({ status: 500, body: 'late failure' })
  })
  await page.goto('/convex-polygon-intersection/cases/overlap')
  await expect(page.getByRole('status')).toContainText('Computing')
  await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
  await page.getByRole('article', { name: 'Point contact', exact: true }).getByRole('button').click()
  await expect(page.getByRole('status')).toHaveText('Point intersection')
  release()
  await expect(page.getByRole('region', { name: 'Intersection coordinates', exact: true })).toContainText('(4, 4)')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

for (const [path, message] of [['/convex-polygon-intersection/cases/missing', 'Unknown case.'], ['/convex-polygon-intersection/cases/overlap/learn', 'Unknown page path.']]) {
  test(`invalid link: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('alert')).toContainText(message)
    await page.reload()
    await expect(page.getByRole('alert')).toContainText(message)
    await page.getByRole('link', { name: 'Computational Geometry', exact: true }).click()
    await expect(page).toHaveURL('/')
  })
}
