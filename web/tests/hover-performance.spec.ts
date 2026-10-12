import { expect, test } from './learning-test'

test('蜘蛛网 hover：同一对象内连续移动不重复排布标签', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 })
  await page.goto('/cases/spider-web/learn')
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const positions = await page.locator('.drawing .input line').evaluateAll(lines => [0, 2].map(index => {
    const line = lines[index] as SVGLineElement
    const x = (line.x1.baseVal.value + line.x2.baseVal.value) / 2
    const y = (line.y1.baseVal.value + line.y2.baseVal.value) / 2
    const point = new DOMPoint(x, y).matrixTransform(line.getScreenCTM()!)
    return { x: point.x, y: point.y }
  }))
  const report = await page.evaluateHandle(() => {
    const report = { transforms: 0, frames: [] as number[], running: true, measuring: false }
    const observer = new MutationObserver(records => {
      if (report.measuring) report.transforms += records.filter(record => (record.target as Element).tagName === 'text').length
    })
    observer.observe(document.querySelector('.drawing-surface > svg')!, { subtree: true, attributes: true, attributeFilter: ['transform', 'x', 'y', 'visibility'] })
    let previous: number | undefined
    const frame = (time: number) => {
      if (previous !== undefined) report.frames.push(time - previous)
      previous = time
      if (report.running) requestAnimationFrame(frame)
      else observer.disconnect()
    }
    requestAnimationFrame(frame)
    return report
  })
  for (let batch = 0; batch < 6; batch++) {
    const target = batch % 2
    await report.evaluate(report => { report.measuring = false })
    await page.mouse.move(positions[target].x, positions[target].y)
    await expect(page.getByRole('img', { name: `输入 S${target * 2}`, exact: true })).toHaveAttribute('data-highlighted', 'true')
    const label = page.locator(`.teaching-labels text[data-input="${target * 2}"]`)
    await expect(label).toBeVisible()
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await report.evaluate(report => { report.measuring = true })
    for (let move = 0; move < 4; move++) {
      await page.mouse.move(positions[target].x + move % 2, positions[target].y)
      await expect(page.getByRole('img', { name: `输入 S${target * 2}`, exact: true })).toHaveAttribute('data-highlighted', 'true')
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    }
  }
  await report.evaluate(report => { report.measuring = false })
  // A different target legitimately creates a new coordinate label.
  const label = page.locator('.teaching-labels text[data-event-point="(-24, 0)"]')
  await page.getByRole('region', { name: '待处理事件队列' }).getByRole('listitem').first().hover()
  await expect(label).toBeVisible()
  await page.getByRole('link', { name: '返回列表', exact: true }).hover()
  await expect(label).toHaveCount(0)
  const measured = await report.evaluate(report => { report.running = false; return report })
  measured.frames.sort((a, b) => a - b)
  expect(measured.transforms, 'same-target pointer movement must not repeat label placement').toBe(0)
  expect(errors).toEqual([])
})
