import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US' })

test('fixed case navigation computes exact ordered vertices and refreshes', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/convex-hull')
  const result = page.waitForResponse(response => response.url().endsWith('/api/convex-hull') && response.ok())
  await page.getByRole('article', { name: 'Triangle and interior point', exact: true }).getByRole('button', { name: 'View details', exact: true }).click()
  const response = await result
  expect(response.request().postDataJSON().points).toHaveLength(4)
  await expect(page).toHaveURL('/convex-hull/cases/triangle-interior')
  await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByRole('listitem')).toHaveText(['V0 (0, 0)', 'V1 (6, 0)', 'V2 (3, 6)'])
  await expect(page.getByRole('region', { name: 'Input points', exact: true }).getByRole('listitem')).toHaveCount(4)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByRole('listitem')).toHaveCount(3)
  await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
  await expect(page).toHaveURL('/convex-hull')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const preset of [
  { id: 'duplicate-coordinates', count: 6, vertices: ['V0 (0, 0)', 'V1 (4, 0)', 'V2 (4, 4)', 'V3 (0, 4)'] },
  { id: 'exact-fractions', count: 4, vertices: ['V0 (0, 0)', 'V1 (3/2, 0)', 'V2 (0, 5/3)'] },
]) {
  test(`direct access preserves exact inputs and output: ${preset.id}`, async ({ page }) => {
    await page.goto(`/convex-hull/cases/${preset.id}`)
    await expect(page.getByRole('status')).toHaveText(`Input points: ${preset.count}; hull vertices: ${preset.vertices.length}`)
    const inputs = page.getByRole('region', { name: 'Input points', exact: true })
    await expect(inputs.getByRole('listitem')).toHaveCount(preset.count)
    await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByRole('listitem')).toHaveText(preset.vertices)
    if (preset.id === 'duplicate-coordinates') {
      await expect(inputs.getByRole('listitem').nth(0)).toHaveText('P0 (0, 0)')
      await expect(inputs.getByRole('listitem').nth(4)).toHaveText('P4 (0, 0)')
    } else await expect(inputs).toContainText('(1/3, 1/3)')
    await expect(page.getByRole('img', { name: 'Convex hull plot', exact: true }).locator('polygon')).toHaveCount(1)
  })
}

test('loading and failure do not masquerade as an empty hull', async ({ page }) => {
  let release: () => void = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/convex-hull', async route => {
    await pending
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"failed"}' })
  })
  await page.goto('/convex-hull/cases/triangle-interior')
  await expect(page.getByRole('status')).toContainText('Computing')
  await expect(page.getByRole('region', { name: 'Hull vertices', exact: true })).toHaveCount(0)
  release()
  await expect(page.getByRole('alert')).toContainText('Computation failed')
  await expect(page.getByRole('region', { name: 'Hull vertices', exact: true })).toHaveCount(0)
})
