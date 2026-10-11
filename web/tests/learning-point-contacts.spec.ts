import { expect, test } from './learning-test'

// Independent counts from line equations and junction degrees, not API output.
for (const [id, pairs, positions] of [
  ['interior', 1, 1], ['multiway', 3, 1], ['fraction-contact', 3, 1], ['collinear-contact', 1, 1],
  ['crossing', 1, 1], ['neighbor-removal', 1, 1], ['neighbor-crossing', 2, 2],
  ['endpoint', 1, 1], ['start-interior', 1, 1], ['end-interior', 1, 1],
  ['multiway-interior', 3, 1], ['multiway-endpoints', 6, 1], ['vertical', 3, 3], ['same-x', 2, 2],
  ['spider-web', 100, 17], ['hexagonal-snowflake', 87, 13],
] as const) test(`点接触教学完整链：${id}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/cases/${id}`)
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toBeVisible()
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await page.getByRole('button', { name: '说明与帮助', exact: true }).click()
  await page.getByRole('tab', { name: '案例介绍与目标' }).click()
  await expect(page.getByRole('region', { name: '案例介绍与目标' })).toContainText('学习目标：')
  await page.getByRole('button', { name: '关闭帮助' }).click()
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  await slider.press('End')
  const result = page.getByRole('region', { name: '学习结果' })
  await expect(result).toContainText(`独立交点位置：${positions}；相交线段对：${pairs}`)
  await expect(result).toContainText('独立数学核对：')
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(pairs)
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
  await slider.press('Home')
  await expect(result).toHaveCount(0)
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(0)
})

for (const [id, point, starts, passes, pairs] of [
  ['interior', '(2, 0)', 'S1', 'S0', 1],
  ['multiway', '(0, 0)', '无', 'S0、S1、S2', 3],
  ['fraction-contact', '(1/2, 1/2)', 'S2', 'S0、S1', 3],
  ['collinear-contact', '(2, 2)', 'S1', '无', 1],
] as const) test(`新增接触的真实同点事件：${id}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/cases/${id}/learn`)
  const next = page.getByRole('button', { name: '下一步', exact: true })
  await expect(next).toBeVisible()
  let records = 0
  while (await next.isEnabled()) {
    await next.click()
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
