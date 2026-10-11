import { expect, test } from '@playwright/test'
import { selectPreset } from './cases'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

for (const preset of ['crossing', 'disjoint']) {
  test(`教学快捷键：${preset} 单步、长按、首尾边界和重启`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/cases/crossing')
    await expect(page).toHaveURL('/cases/crossing')
    await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
    await selectPreset(page, preset)
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const restart = page.getByRole('button', { name: '重新开始', exact: true })
    await expect(previous.getByText('←', { exact: true })).toBeVisible()
    await expect(next.getByText('→', { exact: true })).toBeVisible()
    await expect(restart.getByText('R', { exact: true })).toBeVisible()
    await expect(previous).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft')
    await expect(next).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
    await expect(restart).toHaveAttribute('aria-keyshortcuts', 'r')
    await page.keyboard.press('ArrowLeft')
    await expect(slider).toHaveValue('0')
    await page.keyboard.down('ArrowRight')
    await page.keyboard.down('ArrowRight')
    await expect(slider).toHaveValue('1')
    await page.keyboard.up('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveValue('2')
    await page.keyboard.down('ArrowLeft')
    await page.keyboard.down('ArrowLeft')
    await expect(slider).toHaveValue('1')
    await page.keyboard.up('ArrowLeft')
    await page.keyboard.press('r')
    await expect(slider).toHaveValue('0')

    const last = Number(await slider.getAttribute('max'))
    for (let i = 0; i < last; i++) await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveValue(String(last))
    await expect(next).toBeDisabled()
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText(preset === 'crossing' ? 'I0 (2, 2)' : '结果为空')
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveValue(String(last))
    await page.keyboard.press('ArrowLeft')
    await expect(slider).toHaveValue(String(last - 1))
    await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)

    const input = page.getByRole('img', { name: '输入 S0', exact: true })
    // Stroke width reflects the current participants; measure zoom independently.
    const scale = () => input.evaluate(element => (element as SVGGElement).getScreenCTM()!.a)
    const initialScale = await scale()
    await page.getByRole('button', { name: '放大', exact: true }).click()
    await expect.poll(scale).toBeGreaterThan(initialScale)
    await page.keyboard.down('r')
    await expect(slider).toHaveValue('0')
    await expect.poll(scale).toBeCloseTo(initialScale)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.down('r')
    await expect(slider).toHaveValue('1')
    await page.keyboard.up('r')
    await page.keyboard.press('r')
    await expect(slider).toHaveValue('0')
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
    if (preset === 'crossing') {
      for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport)
        await expect(restart.getByText('R', { exact: true })).toBeVisible()
        await page.screenshot({ path: join(tmpdir(), `bo-keyboard-${viewport.width}.png`) })
      }
    }
  })
}

test('教学快捷键：控件优先、组合键和模式隔离', async ({ page }) => {
  await page.goto('/cases/crossing')
  await selectPreset(page, 'crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  await page.keyboard.press('r')
  await expect(slider).toHaveValue('1')
  await page.keyboard.press('End')
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
  await page.keyboard.press('Home')
  await expect(slider).toHaveValue('0')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  for (const modifier of ['Control', 'Meta', 'Alt', 'Shift']) {
    await page.keyboard.press(`${modifier}+ArrowRight`)
    await expect(slider).toHaveValue('1')
  }
  await slider.focus()
  await page.keyboard.press('r')
  await expect(slider).toHaveValue('1')
  await page.getByRole('link', { name: '返回结果查看器' }).click()
  await expect(page.getByRole('region', { name: '原始输入' })).toBeVisible()
  for (const key of ['ArrowLeft', 'r']) {
    const consumed = await page.evaluate(key => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      document.body.dispatchEvent(event)
      return event.defaultPrevented
    }, key)
    expect(consumed).toBe(false)
  }
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await expect(slider).toHaveValue('0')
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  await selectPreset(page, 'disjoint')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  await expect(slider).toHaveValue('0')
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
})

test('教学动作：加入、检查、发现分别展示并可回退', async ({ page }) => {
  await page.goto('/cases/crossing')
  await selectPreset(page, 'crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const previous = page.getByRole('button', { name: '上一步', exact: true })
  const next = page.getByRole('button', { name: '下一步', exact: true })
  const explanation = page.getByRole('region', { name: '操作解释' })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  await expect(previous).toBeDisabled()
  await next.click() // Enter the first take module.
  await next.click() // Pop before binding the current event.
  await next.click() // Take the first endpoint.
  await next.click() // Insert S0.
  await expect(explanation).toContainText('加入 S0')
  await expect(page.getByTestId('active-order')).toHaveText('S0')
  await next.click() // Complete the event.
  await next.click() // Enter the second take module.
  await next.click() // Pop before binding the current event.
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
    await page.goto('/cases/crossing')
    await selectPreset(page, preset)
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const learning = page.getByRole('region', { name: '逐步学习' })
    const states = [await learning.innerText()]
    while (await next.isEnabled()) {
      await next.click()
      // Capture the settled state, not rows temporarily retained for exit animation.
      await expect(learning.locator('[data-event-id][aria-hidden="true"], [data-input-id][aria-hidden="true"]')).toHaveCount(0)
      if (await page.getByRole('region', { name: '取事件教学代码', exact: true }).count()) {
        await expect(page.locator('.execution-code .code-line')).toHaveCount(2)
      }
      states.push(await learning.innerText())
    }
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText(preset === 'crossing' ? 'I0 (2, 2)：S0 × S1' : '结果为空')
    for (const state of states.slice(0, -1).reverse()) {
      await previous.click()
      await expect.poll(() => learning.innerText()).toBe(state)
      await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
      await expect(next).toBeEnabled()
    }
    await expect(previous).toBeDisabled()
    await expect(page.getByTestId('active-order')).toHaveText('空')
    await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('I0')
    for (const state of states.slice(1)) {
      await next.click()
      await expect.poll(() => learning.innerText()).toBe(state)
    }
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    expect(await learning.innerText()).toBe(states[0])
    await next.click()
    await selectPreset(page, preset === 'crossing' ? 'disjoint' : 'crossing')
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    await expect(previous).toBeDisabled()
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
    await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  })
}

for (const preset of ['crossing', 'disjoint']) {
  test(`步骤滑动条：${preset} 自由跳转、拖动实时同步`, async ({ page }) => {
    await page.goto('/cases/crossing')
    await selectPreset(page, preset)
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    const learning = page.getByRole('region', { name: '逐步学习' })
    const initial = await learning.innerText()
    await expect(slider).toHaveValue('0')
    await slider.focus()
    await slider.press('End') // The entire range is available before visiting it.
    await expect(next).toBeDisabled()
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText(preset === 'crossing' ? 'I0 (2, 2)：S0 × S1' : '结果为空')
    const finalIndex = Number(await slider.inputValue())
    await previous.click()
    await expect(slider).toHaveValue(String(finalIndex - 1))
    await next.click()
    await expect(slider).toHaveValue(String(finalIndex))
    await slider.press('Home')
    expect(await learning.innerText()).toBe(initial)
    const sliderGroup = page.getByRole('group', { name: '教学步骤', exact: true })
    const thumb = page.getByTestId('teaching-step-thumb')
    const start = await thumb.boundingBox()
    await slider.press('End')
    const end = await thumb.boundingBox()
    const track = await sliderGroup.boundingBox()
    await slider.press('Home')
    if (!start || !end || !track) throw new Error('Slider thumb and track must be visible')
    const x = start.x + start.width / 2
    const y = start.y + start.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    // Keep the pointer held while checking state, rather than testing release.
    await page.mouse.move(x + track.width * 9 / finalIndex, y)
    await expect(slider).toHaveValue('9')
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('加入 S1')
    await expect(page.getByTestId('active-order').getByRole('listitem')).toHaveText(['S0', 'S1'])
    await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('I0')
    await expect(page.getByRole('img', { name: '输入 S1', exact: true })).toHaveAttribute('data-active', 'true')
    const dragged = await learning.innerText()
    await page.mouse.up()
    await slider.press('Home')
    for (let i = 0; i < 9; i++) await next.click()
    await expect.poll(() => learning.innerText()).toBe(dragged)
    await next.click()
    await previous.click()
    await expect.poll(() => learning.innerText()).toBe(dragged)
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(slider).toHaveValue('0')
    expect(await learning.innerText()).toBe(initial)
    await slider.press('End')
    await selectPreset(page, preset === 'crossing' ? 'disjoint' : 'crossing')
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    await expect(slider).toHaveValue('0')
    await expect(previous).toBeDisabled()
    expect(Number(await slider.getAttribute('max'))).not.toBe(finalIndex)
    await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  })
}
