import { expect, test } from '../support/learning-test'
import { readTrace, seekStep, waitForTraceCompletion } from '../support/trace-navigation'
import { formatPoint } from '../../src/geometry/geometry'

for (const [id, pairs, positions, pointIds, exactPoint] of [
  ['point-inputs', 4, 2, [1, 2, 3, 4], '(2, 0)'],
  ['pure-points', 1, 1, [0, 1, 2], '(1/3, 2/3)'],
  ['point-multiway', 6, 1, [3], '(0, 0)'],
] as const) test(`零长度教学：${id}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/bo/cases/${id}`)
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toBeVisible()
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const trace = await readTrace(page, id)
  await waitForTraceCompletion(page)
  const active = page.getByTestId('active-order')
  const group = page.getByRole('region', { name: '同点参与线段' })
  const explanation = page.getByRole('region', { name: '操作解释' })
  let pointEvents = 0, reorders = 0
  for (const [index, step] of trace.steps.entries()) {
    if (!index || ['micro', 'take-entry', 'take-pop', 'take-empty'].includes(step.action)) continue
    await seekStep(page, index, 'jump')
    for (const id of pointIds) await expect(active.locator(`[data-input-id="${id}"]`)).toHaveCount(0)
    if (id === 'pure-points') await expect(active).toHaveText('空')
    if (id === 'point-multiway' && step.action === 'reorder') {
      reorders++
      await expect(explanation).not.toContainText('换序已随加入一起展示')
      await expect(active).toHaveText('S0S2S1')
    }
    if (step.action === 'take' && step.current && formatPoint(step.current) === exactPoint) {
      pointEvents++
      await expect(page.getByRole('region', { name: '当前事件' }).locator('[data-event-id]:not([aria-hidden="true"])')).toHaveAttribute('data-event-id', exactPoint)
      await expect(explanation).toContainText('零长度')
      await expect(explanation).toContainText('不进入持续活动顺序')
      const zero = pointIds[0]
      await expect(group.locator('p').filter({ hasText: /^开始：/ })).toContainText(`S${zero}`)
      await expect(group.locator('p').filter({ hasText: /^结束：/ })).toContainText(`S${zero}`)
      await group.locator(`[data-input-id="${zero}"]`).first().hover()
      await expect(page.getByRole('img', { name: `输入 S${zero}`, exact: true })).toHaveAttribute('data-highlighted', 'true')
      await page.mouse.move(0, 0)
    }
  }
  expect(pointEvents).toBe(1)
  if (id === 'point-multiway') expect(reorders).toBe(1)
  await seekStep(page, trace.steps.length - 1, 'jump')
  const result = page.getByRole('region', { name: '学习结果' })
  await expect(result).toContainText(`独立交点位置：${positions}；相交线段对：${pairs}`)
  await expect(result).toContainText(exactPoint)
  await expect(result).not.toContainText('所有线段已退出')
  await expect(result).toContainText('独立数学核对：')
  await page.reload()
  await expect(result).toContainText(`相交线段对：${pairs}`)
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(0)
  await expect(result).toHaveCount(0)
})
