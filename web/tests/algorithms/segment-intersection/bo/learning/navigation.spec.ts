import { expect, test } from '../support/learning-test'
import { selectPreset } from '../../support/cases'
import { captureIntersections, readTrace, seekStep, stepIndex, waitForTraceCompletion } from '../support/trace-navigation'

for (const preset of ['crossing', 'disjoint']) {
  test(`教学快捷键：${preset} 单步、长按、首尾边界和重启`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('/bo/cases/crossing')
    await expect(page).toHaveURL('/bo/cases/crossing')
    await expect(page).toHaveTitle('普通交叉 · 计算结果 · BO 结果查看器')
    await selectPreset(page, preset)
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const restart = page.getByRole('button', { name: '重新开始', exact: true })
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

    await waitForTraceCompletion(page)
    const last = Number(await slider.getAttribute('max'))
    await seekStep(page, last, 'jump')
    await previous.focus()
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
  })
}

test('教学快捷键：大步、步过和步出与按钮等效，长按与禁用边界保持一致', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const capture = await captureIntersections(page)
  await page.goto('/bo/cases/crossing/learn')
  const { trace } = await capture.result
  await waitForTraceCompletion(page)
  const start = stepIndex(trace, step => step.execution.context.function === 'append' && !step.execution.returning)
  const slider = page.getByRole('slider', { name: '教学步骤' })
  const restart = page.getByRole('button', { name: '重新开始', exact: true })
  for (const action of [
    { name: '步过', key: 'n', group: '函数级操作' },
    { name: '步出', key: 'u', group: '函数级操作' },
    { name: '上一个大步', key: 'Shift+ArrowLeft', group: '大步' },
    { name: '下一个大步', key: 'Shift+ArrowRight', group: '大步' },
  ]) {
    const button = page.getByRole('group', { name: action.group, exact: true }).getByRole('button', { name: action.name, exact: true })
    await expect(button).toHaveAttribute('aria-keyshortcuts', action.key)
    await seekStep(page, start, 'jump')
    await button.click()
    const destination = await slider.inputValue()
    expect(destination).not.toBe(String(start))
    await seekStep(page, start, 'jump')
    await restart.focus()
    if (action.key.startsWith('Shift+')) await page.keyboard.down('Shift')
    const key = action.key.replace('Shift+', '')
    await page.keyboard.down(key)
    await expect(slider).toHaveValue(destination)
    await page.keyboard.down(key)
    await expect(slider).toHaveValue(destination)
    await page.keyboard.up(key)
    if (action.key.startsWith('Shift+')) await page.keyboard.up('Shift')
  }
  await restart.click()
  for (const key of ['u', 'Shift+ArrowLeft']) {
    await page.keyboard.press(key)
    await expect(slider).toHaveValue('0')
  }
  const last = trace.steps.length - 1
  await seekStep(page, last, 'jump')
  await restart.focus()
  for (const key of ['n', 'u', 'Shift+ArrowRight']) {
    await page.keyboard.press(key)
    await expect(slider).toHaveValue(String(last))
  }
  await expect(page).toHaveTitle('普通交叉 · 逐步学习 · BO 结果查看器')
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('教学快捷键：控件优先、组合键和模式隔离', async ({ page }) => {
  await page.goto('/bo/cases/crossing')
  await selectPreset(page, 'crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  for (const key of ['r', 'n', 'u']) {
    await page.keyboard.press(key)
    await expect(slider).toHaveValue('1')
  }
  await page.keyboard.press('End')
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
  await page.keyboard.press('Home')
  await expect(slider).toHaveValue('0')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  for (const modifier of ['Control', 'Meta', 'Alt']) {
    for (const key of ['ArrowRight', 'Shift+ArrowRight', 'n', 'u']) {
      await page.keyboard.press(`${modifier}+${key}`)
      await expect(slider).toHaveValue('1')
    }
  }
  for (const key of ['n', 'u', 'r']) {
    await page.keyboard.press(`Shift+${key}`)
    await expect(slider).toHaveValue('1')
  }
  const destination = page.getByRole('spinbutton', { name: '跳转步骤' })
  await destination.focus()
  for (const key of ['n', 'u', 'Shift+ArrowLeft', 'Shift+ArrowRight']) {
    await page.keyboard.press(key)
    await expect(slider).toHaveValue('1')
  }
  await page.getByRole('button', { name: '说明与帮助', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  for (const key of ['n', 'u', 'Shift+ArrowLeft', 'Shift+ArrowRight']) {
    await page.keyboard.press(key)
    await expect(slider).toHaveValue('1')
  }
  await page.getByRole('button', { name: '关闭帮助', exact: true }).click()
  await slider.focus()
  await page.keyboard.press('r')
  await expect(slider).toHaveValue('1')
  await page.getByRole('link', { name: '返回结果查看器' }).click()
  await expect(page.getByRole('region', { name: '原始输入' })).toBeVisible()
  for (const key of ['ArrowLeft', 'r', 'n', 'u']) {
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
  const trace = await readTrace(page, 'crossing')
  const firstInsert = stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(0))
  const secondInsert = stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(1) && step.current?.x.numerator === '0' && step.current.y.numerator === '4')
  const check = stepIndex(trace, (step, index) => index > secondInsert && step.action === 'check' && step.subjects.includes(0) && step.subjects.includes(1) && step.current?.x.numerator === '0' && step.current.y.numerator === '4')
  const discover = stepIndex(trace, (step, index) => index > check && step.action === 'discover' && step.subjects.includes(0) && step.subjects.includes(1) && step.current?.x.numerator === '0' && step.current.y.numerator === '4')
  await page.goto('/bo/cases/crossing')
  await page.getByRole('link', { name: '开始逐步学习' }).click()
  const previous = page.getByRole('button', { name: '上一步', exact: true })
  const explanation = page.getByRole('region', { name: '操作解释' })
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  await expect(previous).toBeDisabled()
  await seekStep(page, firstInsert, 'jump')
  await expect(explanation).toContainText('重插包含 S0')
  await expect(page.getByTestId('active-order')).toHaveText('S0')
  await seekStep(page, secondInsert, 'jump')
  await expect(explanation).toContainText('重插包含 S1')
  await expect(queue).not.toContainText('I0')
  await seekStep(page, check, 'jump')
  await expect(explanation).toContainText('检查相邻线段 S0 × S1')
  await expect(queue).not.toContainText('I0')
  await seekStep(page, discover, 'jump')
  await expect(explanation).toContainText('发现未来交点 I0 (2, 2)')
  await expect(queue).toContainText('I0 (2, 2)')
  await expect(page.getByRole('img', { name: '已发现 I0 (2, 2)' })).toBeVisible()
  await seekStep(page, check, 'jump')
  await expect(explanation).toContainText('检查相邻线段 S0 × S1')
  await expect(queue).not.toContainText('I0')
  await expect(page.getByRole('img', { name: '已发现 I0 (2, 2)' })).toHaveCount(0)
})

for (const preset of ['crossing', 'disjoint']) {
  test(`步骤滑动条：${preset} 自由跳转、拖动实时同步`, async ({ page }) => {
    const trace = await readTrace(page, preset)
    const inserted = stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(1))
    await page.goto('/bo/cases/crossing')
    await selectPreset(page, preset)
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    await expect(slider).toHaveAttribute('max', String(trace.steps.length - 1))
    await expect(page.getByRole('region', { name: '回放控制' })).toContainText(`0 / ${trace.steps.length - 1}`)
    await expect(slider).toHaveValue('0')
    await slider.focus()
    await slider.press('End') // The entire range is available before visiting it.
    await expect(next).toBeDisabled()
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText(preset === 'crossing' ? 'I0 (2, 2)：S0 × S1' : '结果为空')
    const finalIndex = Number(await slider.inputValue())
    expect(finalIndex).toBe(trace.steps.length - 1)
    await previous.click()
    await expect(slider).toHaveValue(String(finalIndex - 1))
    await next.click()
    await expect(slider).toHaveValue(String(finalIndex))
    await slider.press('Home')
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
    await page.mouse.move(x + track.width * inserted / finalIndex, y)
    await expect(slider).toHaveValue(String(inserted))
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('重插包含 S1')
    await expect(page.getByTestId('active-order').getByRole('listitem')).toHaveText(['S0', 'S1'])
    await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('I0')
    await expect(page.getByRole('img', { name: '输入 S1', exact: true })).toHaveAttribute('data-active', 'true')
    await page.mouse.up()
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(slider).toHaveValue('0')
    await slider.press('End')
    await selectPreset(page, preset === 'crossing' ? 'disjoint' : 'crossing')
    await page.getByRole('link', { name: '开始逐步学习' }).click()
    await expect(slider).toHaveValue('0')
    await expect(previous).toBeDisabled()
    expect(Number(await slider.getAttribute('max'))).not.toBe(finalIndex)
    await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
  })
}
