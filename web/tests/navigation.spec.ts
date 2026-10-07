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

for (const preset of ['crossing', 'disjoint']) {
  test(`步骤滑动条：${preset} 自由跳转、拖动实时同步`, async ({ page }) => {
    await page.goto('/')
    await selectPreset(page, preset)
    await page.getByRole('button', { name: '开始逐步学习' }).click()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    const learning = page.getByRole('region', { name: '逐步学习' })
    const initial = await learning.innerText()
    await expect(slider).toHaveAttribute('aria-valuenow', '0')
    await slider.focus()
    await slider.press('End') // The entire range is available before visiting it.
    await expect(next).toBeDisabled()
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText(preset === 'crossing' ? 'I0 (2, 2)：S0 × S1' : '结果为空')
    const finalIndex = Number(await slider.getAttribute('aria-valuenow'))
    await previous.click()
    await expect(slider).toHaveAttribute('aria-valuenow', String(finalIndex - 1))
    await next.click()
    await expect(slider).toHaveAttribute('aria-valuenow', String(finalIndex))
    await slider.press('Home')
    expect(await learning.innerText()).toBe(initial)
    const start = await slider.boundingBox()
    await slider.press('End')
    const end = await slider.boundingBox()
    await slider.press('Home')
    if (!start || !end) throw new Error('Slider thumb must be visible')
    const x = start.x + start.width / 2
    const y = start.y + start.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    // Keep the pointer held while checking state, rather than testing release.
    await page.mouse.move(x + (end.x - start.x) * 5 / finalIndex, y)
    await expect(slider).toHaveAttribute('aria-valuenow', '5')
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('加入 S1')
    await expect(page.getByTestId('active-order')).toHaveText('S0 → S1')
    await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('I0')
    await expect(page.getByRole('img', { name: '输入 S1', exact: true })).toHaveAttribute('data-active', 'true')
    const dragged = await learning.innerText()
    await page.mouse.up()
    await slider.press('Home')
    for (let i = 0; i < 5; i++) await next.click()
    expect(await learning.innerText()).toBe(dragged)
    await next.click()
    await previous.click()
    expect(await learning.innerText()).toBe(dragged)
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(slider).toHaveAttribute('aria-valuenow', '0')
    expect(await learning.innerText()).toBe(initial)
    await slider.press('End')
    await selectPreset(page, preset === 'crossing' ? 'disjoint' : 'crossing')
    await page.getByRole('button', { name: '开始逐步学习' }).click()
    await expect(slider).toHaveAttribute('aria-valuenow', '0')
    await expect(previous).toBeDisabled()
    expect(Number(await slider.getAttribute('aria-valuemax'))).not.toBe(finalIndex)
    await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  })
}
