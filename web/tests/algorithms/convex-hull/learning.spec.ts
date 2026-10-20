import { expect, test } from '@playwright/test'
import { formatPoint, samePoint } from '../../../src/geometry/geometry'
import type { HullStep } from '../../../src/algorithms/convex-hull/trace'

test.use({ locale: 'en-US' })

test('learning is on demand and preprocessing can be reversed', async ({ page }) => {
  const traces: string[] = []
  page.on('request', request => { if (request.url().endsWith('/api/convex-hull/trace')) traces.push(request.url()) })
  await page.goto('/convex-hull/cases/duplicate-coordinates')
  await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByRole('listitem')).toHaveCount(4)
  expect(traces).toHaveLength(0)
  await page.getByRole('link', { name: 'Learn step by step', exact: true }).click()
  const sequence = page.getByRole('region', { name: 'Ordered points', exact: true })
  await expect(sequence.getByRole('button')).toHaveText(['P0 (0, 0)', 'P1 (4, 0)', 'P2 (4, 4)', 'P3 (0, 4)', 'P4 (0, 0)', 'P5 (2, 2)'])
  await page.getByRole('button', { name: 'Next step', exact: true }).click()
  await expect(sequence.getByRole('button')).toHaveText(['P0 (0, 0)', 'P4 (0, 0)', 'P3 (0, 4)', 'P5 (2, 2)', 'P1 (4, 0)', 'P2 (4, 4)'])
  await page.getByRole('button', { name: 'Next step', exact: true }).click()
  await expect(sequence.getByRole('button')).toHaveCount(5)
  await page.getByRole('button', { name: 'Previous step', exact: true }).click()
  await expect(sequence.getByRole('button')).toHaveCount(6)
  expect(traces.length).toBeGreaterThan(0)
})

test('each action restores the same stack and canvas when moving backwards', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const response = page.waitForResponse(r => r.url().endsWith('/api/convex-hull/trace'))
  await page.goto('/convex-hull/cases/triangle-interior/learn')
  const frames = (await (await response).text()).trim().split('\n').map(line => JSON.parse(line))
  const steps: HullStep[] = frames.filter(frame => frame.type === 'step').map(frame => frame.step)
  const lower = page.getByRole('region', { name: 'Lower hull stack', exact: true })
  const upper = page.getByRole('region', { name: 'Upper hull stack', exact: true })
  const action = page.getByRole('region', { name: 'Current action', exact: true })
  const plot = page.getByRole('group', { name: 'Convex hull plot', exact: true })
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index]
    await expect(action).toHaveAttribute('data-action', step.action)
    expect(await lower.locator('li').evaluateAll(items => items.map(item => Number(item.getAttribute('data-point-id'))))).toEqual(step.lower)
    expect(await upper.locator('li').evaluateAll(items => items.map(item => Number(item.getAttribute('data-point-id'))))).toEqual(step.upper)
    await expect(plot.locator('[data-current="true"]')).toHaveCount(step.current === null ? 0 : 1)
    await expect(plot.locator('[data-removed="true"]')).toHaveCount(step.removed === null ? 0 : 1)
    if (step.action === 'turn') await expect(plot.locator('[data-subject="true"]')).toHaveCount(3)
    if (step.action === 'pop') {
      await expect(action).toContainText('this chain only')
      await page.getByRole('button', { name: 'Previous step', exact: true }).click()
      await expect(action).toHaveAttribute('data-action', 'turn')
      await expect(lower.getByRole('listitem')).toHaveCount(steps[index - 1].lower.length)
      await page.getByRole('button', { name: 'Next step', exact: true }).click()
    }
    if (index < steps.length - 1) await page.getByRole('button', { name: 'Next step', exact: true }).click()
  }
  await expect(page.getByText('Learning complete', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await expect(action).toHaveAttribute('data-action', 'input')
  await expect(plot.locator('[data-hull]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Upper hull', exact: true }).click()
  await expect(action).toHaveAttribute('data-phase', 'upper')
  await expect(lower).toContainText('Chain complete')
  await page.getByRole('button', { name: 'Join result', exact: true }).click()
  await expect(action).toHaveAttribute('data-action', 'trim_lower')
  await expect(action).toContainText('endpoint remains')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const id of ['triangle-interior', 'duplicate-coordinates', 'exact-fractions', 'spider-web', 'bridge-truss', 'hexagonal-snowflake', 'all-collinear', 'empty', 'single', 'two-points']) {
  test(`complete playback and exact terminal result: ${id}`, async ({ page, request }) => {
    const response = page.waitForResponse(r => r.url().endsWith('/api/convex-hull/trace'))
    await page.goto(`/convex-hull/cases/${id}/learn`)
    const input = (await response).request().postDataJSON()
    const normal = await request.post('/api/convex-hull', { data: input })
    const { vertices } = await normal.json()
    await expect(page.getByText('Trace generated', { exact: false })).toBeVisible()
    const slider = page.getByRole('slider', { name: 'Teaching step' })
    await slider.focus()
    await slider.press('End')
    await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByRole('button')).toHaveText(vertices.map((point: Parameters<typeof formatPoint>[0]) => {
      const id = input.points.findIndex((p: Parameters<typeof formatPoint>[0]) => samePoint(p, point))
      return `P${id} ${formatPoint(point)}`
    }))
    if (input.points.length <= 1) {
      await expect(page.getByRole('button', { name: 'Lower hull', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Join result', exact: true })).toHaveCount(0)
    }
    const url = page.url()
    await page.reload()
    await expect(page.getByRole('region', { name: 'Current action' })).toHaveAttribute('data-action', 'complete')
    await expect(page).toHaveURL(url)
    await page.getByRole('link', { name: 'Back to result', exact: true }).click()
    await expect(page).toHaveURL(`/convex-hull/cases/${id}`)
  })
}

test('duplicate identities link independently and selection clears on replay', async ({ page }) => {
  await page.goto('/convex-hull/cases/duplicate-coordinates/learn')
  const ordered = page.getByRole('region', { name: 'Ordered points', exact: true })
  const plot = page.getByRole('group', { name: 'Convex hull plot', exact: true })
  await ordered.getByRole('button', { name: 'P0 (0, 0)', exact: true }).hover()
  await expect(plot.locator('[data-point-id="0"]')).toHaveAttribute('data-highlighted', 'true')
  await expect(plot.locator('[data-point-id="4"]')).toHaveAttribute('data-highlighted', 'false')
  await plot.getByRole('button', { name: 'P4 (0, 0)', exact: true }).focus()
  await expect(ordered.locator('[data-point-id="4"]')).toHaveAttribute('data-highlighted', 'true')
  await plot.getByRole('button', { name: 'P4 (0, 0)', exact: true }).press('Enter')
  await expect(ordered.getByRole('button', { name: 'P4 (0, 0)', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await expect(plot.locator('[aria-pressed="true"]')).toHaveCount(0)
})

test('loading can be cancelled and failure never reports completion', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/convex-hull/trace', async route => {
    await pending
    await route.fulfill({ status: 500, body: 'failed' }).catch(() => {})
  })
  await page.goto('/convex-hull/cases/single/learn?step=999')
  await expect(page.getByText('Waiting for the requested step', { exact: true })).toBeVisible()
  await expect(page.getByText('Generating trace · total unknown', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel loading', exact: true }).click()
  await expect(page.getByText('Loading cancelled', { exact: false })).toBeVisible()
  release()
  await expect(page.getByText('Learning complete', { exact: false })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to result', exact: true }).click()
  await page.getByRole('link', { name: 'Learn step by step', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Trace failed')
  await expect(page.getByText('Learning complete', { exact: false })).toHaveCount(0)
})

test('real streaming cancellation preserves history and navigation isolates the next case', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/convex-hull/cases/hexagonal-snowflake')
  await expect(page.getByRole('region', { name: 'Hull vertices', exact: true }).getByRole('listitem')).toHaveCount(6)
  const network = await page.context().newCDPSession(page)
  await network.send('Network.enable')
  await network.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 4096, uploadThroughput: -1 })
  await page.getByRole('link', { name: 'Learn step by step', exact: true }).click()
  const slider = page.getByRole('slider', { name: 'Teaching step' })
  await expect(slider).toBeEnabled()
  const cancelled = page.waitForEvent('requestfailed', request => request.url().endsWith('/api/convex-hull/trace'))
  await page.getByRole('button', { name: 'Cancel loading', exact: true }).click()
  await cancelled
  await expect(page.getByText('Loading cancelled', { exact: false })).toBeVisible()
  await slider.focus()
  await slider.press('End')
  await expect(page.getByRole('button', { name: 'Previous step', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Previous step', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Current action' })).toBeVisible()
  await page.getByRole('button', { name: 'Replay', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Current action' })).toHaveAttribute('data-action', 'input')
  await page.getByRole('link', { name: 'Back to result', exact: true }).click()
  await page.getByRole('link', { name: 'Learn step by step', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Current action' })).toBeVisible()
  const leaving = page.waitForEvent('requestfailed', request => request.url().endsWith('/api/convex-hull/trace'))
  await page.getByRole('link', { name: 'Back to cases', exact: true }).click()
  await leaving
  await network.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await page.getByRole('article', { name: 'Single point', exact: true }).getByRole('button', { name: 'View details', exact: true }).click()
  await page.getByRole('link', { name: 'Learn step by step', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Ordered points', exact: true }).getByRole('button')).toHaveText(['P0 (2, 3)'])
  await expect(page.getByRole('region', { name: 'Lower hull stack', exact: true }).getByRole('listitem')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Convex hull plot', exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0)
  await expect(page.getByText('Trace generated', { exact: false })).toBeVisible()
  await network.detach()
})
