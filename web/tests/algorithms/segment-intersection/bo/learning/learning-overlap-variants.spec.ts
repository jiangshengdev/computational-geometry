import { expect, test } from '../support/learning-test'
import { readTrace, seekStep, waitForTraceCompletion } from '../support/trace-navigation'

for (const [id, count, intervals] of [
  ['duplicate-overlap', 3, ['(0, 0) → (4, 0)']],
  ['overlap-group', 3, ['(0, 0) → (6, 0)', '(2, 0) → (3, 0)']],
] as const) test(`通用重叠教学：${id}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/bo/cases/${id}`)
  await expect(page.getByRole('link', { name: '开始逐步学习' })).toBeVisible()
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await page.getByRole('button', { name: '重叠说明', exact: true }).click()
  const help = page.getByRole('region', { name: '重叠处理规则' })
  await expect(help).toBeVisible()
  await expect(help).toContainText('较晚起点')
  await expect(help).toContainText('不是扫描线已经走过整段')
  await expect(help).not.toContainText('本案例的 S0')
  await page.getByRole('button', { name: '关闭帮助' }).click()
  const trace = await readTrace(page, id)
  await waitForTraceCompletion(page)
  const explanation = page.getByRole('region', { name: '操作解释' })
  let records = 0, ends = 0
  for (const [index, step] of trace.steps.entries()) {
    if (step.action !== 'record' && step.action !== 'remove') continue
    await seekStep(page, index, 'jump')
    const text = await explanation.innerText()
    if (text.includes('记录重叠区间')) {
      records++
      await expect(explanation).toContainText('根据已知端点')
      await expect(explanation).not.toContainText('下一步加入开始者')
    }
    if (text.includes('此处是重叠止界')) {
      ends++
      await expect(explanation).not.toContainText('另一条线段继续')
      if (id === 'duplicate-overlap') {
        await expect(explanation).toContainText('这些配对的成员均在此结束')
        await expect(page.getByTestId('active-order')).toHaveText('空')
      }
      if (id === 'overlap-group' && text.includes('退出 S2')) {
        await expect(explanation).toContainText('S0、S1 继续')
        const interval = page.getByRole('img', { name: '交集 S0 × S1', exact: true })
        await expect(interval).toBeVisible()
        const input = page.getByRole('img', { name: '输入 S0', exact: true }).locator('line')
        for (const attribute of ['x1', 'x2']) await expect(interval.locator('line')).toHaveAttribute(attribute, (await input.getAttribute(attribute))!)
      }
    }
  }
  expect(records).toBe(count)
  expect(ends).toBeGreaterThan(0)
  await seekStep(page, trace.steps.length - 1, 'jump')
  const result = page.getByRole('region', { name: '学习结果' })
  await expect(result).toContainText(`重叠区间：${count}；相交线段对：${count}`)
  for (const interval of intervals) await expect(result).toContainText(interval)
  await expect(result).toContainText('独立数学核对：')
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(count)
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(page.getByRole('img', { name: /^交集 S/ })).toHaveCount(0)
})
