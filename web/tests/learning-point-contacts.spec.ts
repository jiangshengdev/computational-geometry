import { expect, test } from './learning-test'
import { readTrace, seekStep, waitForTraceCompletion } from './trace-navigation'

for (const [id, point, starts, passes, pairs] of [
  ['interior', '(2, 0)', 'S1', 'S0', 1],
  ['multiway', '(0, 0)', '无', 'S0、S1、S2', 3],
  ['fraction-contact', '(1/2, 1/2)', 'S2', 'S0、S1', 3],
  ['collinear-contact', '(2, 2)', 'S1', '无', 1],
] as const) test(`新增接触的真实同点事件：${id}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/cases/${id}/learn`)
  const trace = await readTrace(page, id)
  await waitForTraceCompletion(page)
  let records = 0
  for (const [index, step] of trace.steps.entries()) {
    if (step.action !== 'record') continue
    await seekStep(page, index, 'jump')
    const explanation = page.getByRole('region', { name: '操作解释' })
    if (!/记录 .*：参与线段/.test(await explanation.innerText())) continue
    records++
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText(point)
    const group = page.getByRole('region', { name: '同点参与线段' })
    await expect(group).toContainText(`开始：${starts}`)
    const passing = group.locator('p').filter({ hasText: /^穿过：/ })
    expect((await passing.innerText()).replace('穿过：', '').split('、').sort()).toEqual(passes.split('、').sort())
    if (pairs > 1) await expect(explanation).toContainText('同一个几何点的相交配对')
  }
  expect(records).toBe(pairs)
})
