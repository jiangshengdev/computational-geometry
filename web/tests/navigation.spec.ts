import { expect, test } from '@playwright/test'
import { selectPreset } from './cases'

test('教学动作：加入、检查、发现分别展示并可回退', async ({ page }) => {
  await page.goto('/')
  await selectPreset(page, 'crossing')
  await page.getByRole('button', { name: '开始逐步学习' }).click()
  const previous = page.getByRole('button', { name: '上一步', exact: true })
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const explanation = page.getByRole('region', { name: '操作解释' })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  await expect(previous).toBeDisabled()
  await next.click() // Take the first endpoint.
  await next.click() // Insert S0.
  await expect(explanation).toContainText('加入 S0')
  await expect(page.getByTestId('active-order')).toHaveText('S0')
  await next.click() // Complete the event.
  await next.click() // Take the second endpoint.
  await next.click() // Insert S1, before checking its neighbor.
  await expect(explanation).toContainText('加入 S1')
  await expect(queue).not.toContainText('I0')
  await next.click()
  await expect(explanation).toContainText('检查相邻线段 S0 × S1')
  await expect(queue).not.toContainText('I0')
  await next.click()
  await expect(explanation).toContainText('发现未来交点 I0 (2, 2)')
  await expect(queue).toContainText('I0 (2, 2)')
  await expect(page.getByRole('img', { name: '已发现 I0 (2, 2)' })).toBeVisible()
  await previous.click()
  await expect(explanation).toContainText('检查相邻线段 S0 × S1')
  await expect(queue).not.toContainText('I0')
  await expect(page.getByRole('img', { name: '已发现 I0 (2, 2)' })).toHaveCount(0)
})

for (const preset of ['crossing', 'disjoint']) {
  test(`教学动作：${preset} 完整回退与边界隔离`, async ({ page }) => {
    await page.goto('/')
    await selectPreset(page, preset)
    await page.getByRole('button', { name: '开始逐步学习' }).click()
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const learning = page.getByRole('region', { name: '逐步学习' })
    const states = [await learning.innerText()]
    while (await next.isEnabled()) {
      await next.click()
      states.push(await learning.innerText())
    }
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText(preset === 'crossing' ? 'I0 (2, 2)：S0 × S1' : '结果为空')
    for (const state of states.slice(0, -1).reverse()) {
      await previous.click()
      expect(await learning.innerText()).toBe(state)
      await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
      await expect(next).toBeEnabled()
    }
    await expect(previous).toBeDisabled()
    await expect(page.getByTestId('active-order')).toHaveText('空')
    await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('I0')
    for (const state of states.slice(1)) {
      await next.click()
      expect(await learning.innerText()).toBe(state)
    }
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    expect(await learning.innerText()).toBe(states[0])
    await next.click()
    await selectPreset(page, preset === 'crossing' ? 'disjoint' : 'crossing')
    await page.getByRole('button', { name: '开始逐步学习' }).click()
    await expect(previous).toBeDisabled()
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
    await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  })
}
