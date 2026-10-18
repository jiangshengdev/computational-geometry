import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US', viewport: { width: 1360, height: 900 } })

test('coincident positions link both inputs and result, with hover, keyboard toggling and clearing', async ({ page }) => {
  await page.goto('/convex-polygon-intersection/cases/coincident')
  const lists = ['Polygon A vertices', 'Polygon B vertices', 'Intersection coordinates'].map(name => page.getByRole('region', { name, exact: true }))
  const origin = page.getByRole('button', { name: 'Point (0, 0)', exact: true })
  await expect(lists[2].getByRole('listitem')).toHaveCount(4)
  await lists[0].getByRole('button').first().hover()
  await expect(origin).toHaveAttribute('data-highlighted', 'true')
  await lists[0].getByRole('button').first().focus()
  await page.keyboard.press('Enter')
  for (const list of lists) await expect(list.getByRole('listitem').first()).toHaveAttribute('data-selected', 'true')
  await expect(origin).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Point (4, 4)', exact: true }).hover()
  for (const list of lists) {
    await expect(list.getByRole('listitem').nth(2)).toHaveAttribute('data-highlighted', 'true')
    await expect(list.getByRole('listitem').first()).toHaveAttribute('data-selected', 'true')
  }
  await origin.focus()
  await page.keyboard.press('Space')
  await expect(origin).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('Enter')
  await expect(origin).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  for (const list of lists) await expect(list.getByRole('listitem').first()).toHaveAttribute('data-selected', 'false')
  await origin.click()
  await expect(origin).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
  await page.getByRole('article', { name: 'Overlapping polygons', exact: true }).getByRole('button').click()
  await expect(page.getByRole('button', { name: 'Point (0, 0)', exact: true })).toHaveAttribute('aria-pressed', 'false')
})

for (const [id, point, row] of [['exact-fractions', '(3/2, 3/2)', 1], ['point-contact', '(4, 4)', 0], ['shared-edge', '(4, 3)', 1]] as const) {
  test(`result coordinates link in both directions: ${id}`, async ({ page }) => {
    await page.goto(`/convex-polygon-intersection/cases/${id}`)
    const item = page.getByRole('region', { name: 'Intersection coordinates', exact: true }).getByRole('listitem').nth(row)
    const marker = page.getByRole('button', { name: `Point ${point}`, exact: true })
    await item.getByRole('button').click()
    await expect(marker).toHaveAttribute('aria-pressed', 'true')
    await marker.click()
    await expect(item).toHaveAttribute('data-selected', 'false')
    await marker.hover()
    await expect(item).toHaveAttribute('data-highlighted', 'true')
    await marker.focus()
    await page.keyboard.press('Enter')
    await expect(item).toHaveAttribute('data-selected', 'true')
  })
}

for (const id of ['exact-fractions', 'disjoint']) {
  test(`viewport operations preserve exact coordinates and interaction: ${id}`, async ({ page }) => {
    await page.goto(`/convex-polygon-intersection/cases/${id}`)
    await expect(page.getByRole('status')).not.toContainText('Computing')
    const plot = page.getByRole('group', { name: 'Convex polygon intersection plot', exact: true })
    const layer = plot.locator('[data-layer="geometry"]')
    const coordinates = await page.getByRole('listitem').allTextContents()
    const origin = plot.getByRole('button', { name: 'Point (0, 0)', exact: true })
    await origin.click()
    const initial = (await layer.getAttribute('transform'))!
    const shape = plot.locator('[data-input="first"]')
    const before = (await shape.boundingBox())!
    await page.getByRole('button', { name: 'Zoom in', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(layer).not.toHaveAttribute('transform', initial)
    const zoomed = (await layer.getAttribute('transform'))!
    const after = (await shape.boundingBox())!
    expect(after.width).toBeGreaterThan(before.width)
    expect(after.width / before.width).toBeCloseTo(after.height / before.height, 5)
    const box = (await plot.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 5 })
    await page.mouse.up()
    await expect(layer).not.toHaveAttribute('transform', zoomed)
    await expect(origin).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
    expect((await shape.boundingBox())!.width).toBeCloseTo(before.width, 5)
    await page.getByRole('button', { name: 'Reset view', exact: true }).click()
    await expect(layer).toHaveAttribute('transform', initial)
    await origin.click()
    await expect(origin).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('listitem')).toHaveText(coordinates)
    if (id === 'disjoint') {
      await expect(page.getByRole('status')).toHaveText('Empty intersection')
      const result = page.getByRole('region', { name: 'Intersection coordinates', exact: true })
      await expect(result).toBeVisible()
      await expect(result.getByLabel('Point count')).toHaveText('0')
      await expect(result.getByRole('button')).toHaveCount(0)
    }
  })
}

test('canvas reaches long real input and result lists using equivalent rational coordinates', async ({ page }) => {
  await page.goto('/convex-polygon-intersection/cases/many-vertices')
  const inputs = page.getByRole('region', { name: 'Polygon A vertices', exact: true }).getByRole('listitem')
  const results = page.getByRole('region', { name: 'Intersection coordinates', exact: true }).getByRole('listitem')
  await expect(results).toHaveCount(41)
  await expect(inputs.last()).not.toBeInViewport()
  await expect(results.last()).not.toBeInViewport()
  const before = await page.evaluate(() => window.scrollY)
  const last = page.getByRole('button', { name: 'Point (20/5, 400/100)', exact: true })
  await last.hover()
  for (const items of [inputs, results]) {
    await expect(items.last()).toHaveAttribute('data-highlighted', 'true')
    await expect(items.last()).toBeInViewport()
  }
  await last.click()
  await expect(results.last()).toHaveText('R40 (4, 4)')
  await expect(results.last()).toHaveAttribute('data-selected', 'true')
  expect(await page.evaluate(() => window.scrollY)).toBe(before)
})
