import { expect, test } from '@playwright/test'
import { formatPoint, type Point } from '../../../src/geometry/geometry'

test.use({ locale: 'en-US', viewport: { width: 1360, height: 900 } })

for (const [id, name] of [['triangle', 'Equilateral triangle'], ['convex', 'Regular hexagon'], ['concave', 'Concave polygon'], ['multiple-notches', 'Multiple notches'], ['collinear', 'Collinear boundary vertices'], ['exact-fractions', 'Exact fractional vertices'], ['spiral', 'Spiral'], ['concave-star', 'Multi-arm concave star'], ['winding-channel', 'Winding channel'], ['irregular-outline', 'Irregular outline']]) {
  test(`real triangulation: ${id}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    const requests: string[] = []
    page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()) })
    await page.goto('/')
    await page.getByRole('article', { name: 'Triangulation', exact: true }).getByRole('link').click()
    const card = page.getByRole('article', { name, exact: true })
    await expect(card.getByRole('img')).toBeVisible()
    expect(requests).toEqual([])
    const pending = page.waitForResponse(response => response.url().endsWith('/api/triangulation') && response.ok())
    await card.getByRole('link').click()
    const response = await pending
    const { vertices } = response.request().postDataJSON() as { vertices: Point[] }
    const { triangles } = await response.json() as { triangles: number[][] }
    expect(triangles).toHaveLength(vertices.length - 2)
    for (const triangle of triangles) {
      expect(new Set(triangle).size).toBe(3)
      for (const index of triangle) { expect(index).toBeGreaterThanOrEqual(0); expect(index).toBeLessThan(vertices.length) }
    }
    const inputs = page.getByRole('region', { name: 'Input vertices', exact: true })
    const results = page.getByRole('region', { name: 'Triangles', exact: true })
    await expect(inputs.getByRole('listitem')).toHaveText(vertices.map((point, index) => `P${index} ${formatPoint(point)}`))
    await expect(results.getByRole('listitem')).toHaveText(triangles.map((triangle, index) => `T${index} ${triangle.map(vertex => `P${vertex}`).join(', ')}`))
    await expect(page.locator('[data-triangle]')).toHaveCount(triangles.length)
    if (id === 'exact-fractions') await expect(inputs).toContainText('(1/3, 1/7)')
    await expect(page).toHaveTitle(`${name} · Triangulation · Computational Geometry`)
    await page.reload()
    await expect(results.getByRole('listitem')).toHaveCount(vertices.length - 2)
    await page.getByRole('button', { name: 'About this case', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText(name)
    await page.keyboard.press('Escape')
    await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
    await expect(page).toHaveURL('/triangulation')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('loading, failure and leaving a pending case do not show a successful result', async ({ page }) => {
  let release = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/triangulation', async route => {
    if (route.request().postDataJSON().vertices.length !== 3) return route.continue()
    await gate
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"failed"}' })
  })
  await page.goto('/triangulation/cases/triangle')
  await expect(page.getByRole('status')).toContainText('Computing')
  await expect(page.locator('[data-triangle]')).toHaveCount(0)
  release()
  await expect(page.getByRole('alert')).toContainText('Computation failed')
  await expect(page.getByRole('region', { name: 'Triangles', exact: true }).getByRole('listitem')).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
  await page.getByRole('article', { name: 'Regular hexagon', exact: true }).getByRole('button').click()
  await expect(page.locator('[data-triangle]')).toHaveCount(4)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('point linking and viewport preserve the exact input', async ({ page }) => {
  await page.goto('/triangulation/cases/exact-fractions')
  await expect(page.locator('[data-triangle]')).toHaveCount(3)
  const row = page.getByRole('region', { name: 'Input vertices', exact: true }).getByRole('listitem').first()
  const marker = page.getByRole('button', { name: 'Point (1/3, 1/7)', exact: true })
  await row.getByRole('button').hover()
  await expect(marker).toHaveAttribute('data-highlighted', 'true')
  await row.getByRole('button').focus()
  await page.keyboard.press('Enter')
  await expect(marker).toHaveAttribute('aria-pressed', 'true')
  await marker.focus()
  await page.keyboard.press('Space')
  await expect(row).toHaveAttribute('data-selected', 'false')
  await marker.hover()
  await expect(row).toHaveAttribute('data-highlighted', 'true')
  const layer = page.locator('[data-layer="geometry"]')
  const initial = (await layer.getAttribute('transform'))!
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(layer).not.toHaveAttribute('transform', initial)
  await page.getByRole('button', { name: 'Reset view', exact: true }).click()
  await expect(layer).toHaveAttribute('transform', initial)
  await expect(row).toHaveText('P0 (1/3, 1/7)')
})

for (const [path, message] of [['/triangulation/cases/missing', 'Unknown case.'], ['/triangulation/cases/triangle/learn', 'Unknown page path.']]) {
  test(`invalid link: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('alert')).toContainText(message)
  })
}
