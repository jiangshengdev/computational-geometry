import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

for (const width of [1360, 390]) test(`教学帮助：动态内容默认展示与阅读状态保持 ${width}px`, async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.setViewportSize({ width, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/cases/crossing/learn?step=3')
  await expect(page).toHaveTitle('BO 结果查看器')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('3')
  for (const name of ['几何视图', '当前事件', '待处理事件队列', '活动线段顺序', '同点参与线段', '操作解释']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible()
  }
  for (const name of ['同点与并列规则', '为什么不会漏掉交点', '学习参考']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeHidden()
  }
  await page.getByRole('button', { name: '放大', exact: true }).click()
  const drawing = page.getByRole('region', { name: '几何视图' })
  const svg = drawing.locator('svg')
  const box = (await svg.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 15, { steps: 5 })
  await page.mouse.up()
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0)))
  const geometry = svg.locator(':scope > g')
  const transform = await geometry.getAttribute('transform')
  expect(transform).toContain('scale(1.4)')
  const current = await page.getByRole('region', { name: '当前事件' }).innerText()
  const explanation = await page.getByRole('region', { name: '操作解释' }).innerText()
  await page.getByRole('heading', { name: '待处理事件队列', exact: true }).hover()
  await expect(svg).toHaveAttribute('data-numbering', 'pending')
  await page.getByRole('button', { name: '队列说明', exact: true }).hover()
  await expect(svg).not.toHaveAttribute('data-numbering', 'pending')
  for (const [button, topic] of [['队列说明', '事件队列'], ['顺序说明', '活动线段顺序'], ['同点说明', '同点与并列规则'], ['相邻性说明', '相邻性论证']]) {
    const trigger = page.getByRole('button', { name: button, exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: '说明与帮助', exact: true })
    await expect(dialog.getByRole('radio', { name: topic, exact: true })).toBeChecked()
    // Real keyboard input stays in the modal and must not mutate the route step.
    for (const key of ['ArrowRight', 'ArrowLeft', 'r']) await page.keyboard.press(key)
    await expect(page).toHaveURL(/step=3$/)
    await dialog.getByRole('button', { name: '关闭帮助', exact: true }).click()
    await expect(trigger).toBeFocused()
  }
  await expect(geometry).toHaveAttribute('transform', transform!)
  await expect(page.getByRole('region', { name: '当前事件' })).toHaveText(current, { useInnerText: true })
  await expect(page.getByRole('region', { name: '操作解释' })).toHaveText(explanation, { useInnerText: true })
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('4')
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('3')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: join(tmpdir(), `bo-help-learning-${width}.png`), fullPage: true })
  await page.getByRole('button', { name: '说明与帮助', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radiogroup', { name: '帮助主题' }).getByText('参考资料', { exact: true }).click()
  await dialog.getByRole('link', { name: /2D Intersection of Curves/ }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('link', { name: /2D Intersection of Curves/ })).toBeInViewport()
  await page.screenshot({ path: join(tmpdir(), `bo-help-modal-${width}.png`) })
  await dialog.getByRole('button', { name: '关闭帮助', exact: true }).click()
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
